package vue_codegen

import (
	"github.com/NikhilVerma/vue-tsgo/internal/collections"
	"github.com/NikhilVerma/vue-tsgo/internal/utils"
	"github.com/NikhilVerma/vue-tsgo/internal/vue/ast"
	"github.com/NikhilVerma/vue-tsgo/internal/vue/diagnostics"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/core"
)

// TODO: <script src="">

// defineModelInfo holds parsed metadata for a single defineModel() call.
type defineModelInfo struct {
	camelizedName         string // "modelValue" for default, or camelized from explicit name
	camelizedModifierName string // "model" for default, or same as camelizedName
	typeText              string // source text of the type argument, e.g. "number", or "" for any
	modifierTypeText      string // source text of the 2nd type argument, e.g. "'trim' | 'lazy'", or ""
	required              bool   // options.required === true
	hasDefault            bool   // options.default present
}

type scriptCodegenCtx struct {
	*codegenCtx
	scriptSetupEl *vue_ast.ElementNode
	scriptEl      *vue_ast.ElementNode
	lastMappedPos int

	bindingNames []string

	seenDefineModels collections.Set[string]
	defineModels     []defineModelInfo
}

func generateScript(base *codegenCtx, scriptSetupEl *vue_ast.ElementNode, scriptEl *vue_ast.ElementNode, templateEl *vue_ast.ElementNode) {
	c := scriptCodegenCtx{
		codegenCtx:    base,
		scriptSetupEl: scriptSetupEl,
		scriptEl:      scriptEl,
	}

	// TODO: without "ts" lang
	// TODO: tsx

	var selfType string
	if c.scriptEl != nil && len(c.scriptEl.Children) == 1 {
		innerStart := c.scriptEl.InnerLoc.Pos()
		text := c.scriptEl.Children[0].AsText()

		c.lastMappedPos = text.Loc.Pos()

		for _, statement := range c.scriptEl.Ast.Statements.Nodes {
			if c.scriptSetupEl != nil {
				c.collectBindingRanges(innerStart, statement)
			}
			if !ast.IsExportAssignment(statement) {
				continue
			}
			// TODO: report export equals? (export = ...)

			export := statement.AsExportAssignment()
			if c.scriptSetupEl == nil {
				c.mapText(c.lastMappedPos, innerStart+export.Expression.Pos())
				c.serviceText.WriteString(" {} as unknown as typeof __VLS_Self\n")
				c.serviceText.WriteString("const __VLS_Self = ")
				selfType = "__VLS_Self"
				expr := export.Expression
				for ast.IsParenthesizedExpression(expr) || ast.KindAsExpression == expr.Kind {
					expr = expr.Expression()
				}
				if ast.IsObjectLiteralExpression(expr) {
					exportLoc := utils.TrimNodeTextRange(c.scriptEl.Ast, export.AsNode())
					c.mapRange(innerStart+exportLoc.Pos(), innerStart+export.Expression.Pos(), c.serviceText.Len(), c.serviceText.Len()+len("(await import('vue')).defineComponent"))
					c.serviceText.WriteString("(await import('vue')).defineComponent(")
				}
				c.mapText(innerStart+export.Expression.Pos(), innerStart+export.Expression.End())
				c.lastMappedPos = innerStart + export.Expression.End()
				if ast.IsObjectLiteralExpression(expr) {
					c.serviceText.WriteString(")")
				}
			} else {
				c.mapText(c.lastMappedPos, innerStart+export.Pos())
				c.serviceText.WriteString(";(")
				c.mapText(innerStart+export.Expression.Pos(), innerStart+export.Expression.End())
				c.serviceText.WriteString(")\n")
				c.lastMappedPos = innerStart + export.Expression.End()
			}

			break
		}

		c.mapText(c.lastMappedPos, text.Loc.End())
		c.serviceText.WriteString("\n\n")

		// TODO: options wrapper - wrap export default |defineComponent(|{}|)|
	}

	if c.scriptSetupEl != nil {
		hasGeneric := false
		var genericText string
		for _, prop := range c.scriptSetupEl.Props {
			if prop.Kind != vue_ast.KindAttribute {
				continue
			}

			attr := prop.AsAttribute()
			switch attr.Name {
			case "generic":
				if attr.Value == nil {
					break
				}
				hasGeneric = true
				genericText = attr.Value.Content
			}
		}

		// Emit script setup content inline (no IIFE wrapper)
		innerStart := c.scriptSetupEl.InnerLoc.Pos()

		// Generic SFC: wrap the entire setup + template body in a generic arrow
		// function so the `generic="T extends ..."` type parameters are in scope
		// throughout (props type, ctx, template). Matches Volar's codegen; the
		// matching close + export is emitted at the "Export" section below.
		// (Import hoisting above the wrapper is a byte-match refinement handled
		// separately; imports stay inline here — a pre-existing generic-SFC
		// limitation, TS1232/TS2307 on generic wrappers.)
		if hasGeneric {
			c.serviceText.WriteString("/* placeholder */\n")
			c.serviceText.WriteString("const __VLS_export = (<")
			c.serviceText.WriteString(genericText)
			c.serviceText.WriteString(",>(\n")
			c.serviceText.WriteString("\t__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>['props'],\n")
			c.serviceText.WriteString("\t__VLS_ctx?: __VLS_PrettifyLocal<Pick<NonNullable<Awaited<typeof __VLS_setup>>, 'attrs' | 'emit' | 'slots'>>,\n")
			c.serviceText.WriteString("\t__VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>['expose'],\n")
			c.serviceText.WriteString("\t__VLS_setup = (async () => {\n")
		} else {
			// Volar emits a `/* placeholder */` marker at the very start of the
			// script setup body (before the mapped source content).
			c.serviceText.WriteString("/* placeholder */")
		}

		var hasText bool
		if len(c.scriptSetupEl.Children) == 1 {
			text := c.scriptSetupEl.Children[0].AsText()
			c.lastMappedPos = text.Loc.Pos()
			hasText = true
		}

		var (
			propsVariableName string
			emitsVariableName string
			slotsVariableName string
			hasExpose         bool
			// Track the original defineProps/defineEmits type argument names for Volar-style extraction
			propsTypeName string
			emitsTypeName string
			// Track runtime defineProps/defineEmits arguments (for props: {...} in defineComponent)
			propsRuntimeArg *ast.Node
			emitsRuntimeArg *ast.Node
			// withDefaults() second argument (the defaults object literal), if any.
			defaultsArg *ast.Node
		)

		// TODO: report nested compiler macros (vue compiler errors on them)
		// TODO: report incorrect compiler macros arguments
		// TODO: $emits, $props, emitstoprops

		importRanges := []core.TextRange{}
		var statements []*ast.Node
		if c.scriptSetupEl.Ast != nil {
			statements = c.scriptSetupEl.Ast.Statements.Nodes
		}
		for _, statement := range statements {
			c.collectBindingRanges(innerStart, statement)
			switch statement.Kind {
			case ast.KindVariableStatement:
				for _, d := range statement.AsVariableStatement().DeclarationList.AsVariableDeclarationList().Declarations.Nodes {
					decl := d.AsVariableDeclaration()
					name := decl.Name()

					nameIsIdentifier := ast.IsIdentifier(name)
					if decl.Initializer == nil || !ast.IsCallExpression(decl.Initializer) {
						break
					}

					call := decl.Initializer.AsCallExpression()
					callee := call.Expression
					if !ast.IsIdentifier(callee) {
						break
					}
					calleeName := callee.Text()
					switch calleeName {
					case "withDefaults":
						// TODO: report props destructuring?
						if !nameIsIdentifier {
							break
						}
						// TODO: align reporting with vue compiler
						if len(call.Arguments.Nodes) != 2 || !ast.IsCallExpression(call.Arguments.Nodes[0]) || !ast.IsIdentifier(call.Arguments.Nodes[0].Expression()) || call.Arguments.Nodes[0].Expression().Text() != "defineProps" {
							break
						}
						// Capture the defaults object before unwrapping to the inner defineProps call.
						defaultsArg = call.Arguments.Nodes[1]
						call = call.Arguments.Nodes[0].AsCallExpression()
						callee = call.Expression
						calleeName = callee.Text()
						fallthrough
					case "defineProps":
						// TODO: report props destructuring?
						if !nameIsIdentifier {
							break
						}
						if propsVariableName != "" {
							calleeLoc := utils.TrimNodeTextRange(c.scriptSetupEl.Ast, callee)
							c.reportDiagnostic(utils.MoveTextRange(calleeLoc, innerStart), vue_diagnostics.Duplicate_X_0_call, "defineProps")
							break
						}
						propsVariableName = name.Text()
						// Check if defineProps has a runtime argument (object literal)
						// Per Volar: runtime arg → use props: {...}, not __typeProps
						if call.Arguments != nil && len(call.Arguments.Nodes) > 0 {
							propsRuntimeArg = call.Arguments.Nodes[0]
							// Clear type-only props (Volar does: typeOptionGenerates.length = 0)
							propsTypeName = ""
						} else if call.TypeArguments != nil && len(call.TypeArguments.Nodes) == 1 {
							// Type-only defineProps — extract it Volar-style
							typeArg := call.TypeArguments.Nodes[0]
							if ast.IsTypeLiteralNode(typeArg) {
								propsTypeName = "__VLS_Props"
							} else if ast.IsTypeReferenceNode(typeArg) {
								propsTypeName = typeArg.AsTypeReferenceNode().TypeName.Text()
							}
						}
					case "defineEmits":
						// TODO: can there be destructuring
						if !nameIsIdentifier {
							break
						}
						if emitsVariableName != "" {
							calleeLoc := utils.TrimNodeTextRange(c.scriptSetupEl.Ast, callee)
							c.reportDiagnostic(utils.MoveTextRange(calleeLoc, innerStart), vue_diagnostics.Duplicate_X_0_call, "defineEmits")
							break
						}
						emitsVariableName = name.Text()
						// Check if defineEmits has a runtime argument (array/object)
						// Per Volar: runtime arg → use emits: {...}, not __typeEmits
						if call.Arguments != nil && len(call.Arguments.Nodes) > 0 {
							emitsRuntimeArg = call.Arguments.Nodes[0]
							// Clear type-only emits
							emitsTypeName = ""
						} else if call.TypeArguments != nil && len(call.TypeArguments.Nodes) == 1 {
							// Type-only defineEmits — extract it Volar-style
							typeArg := call.TypeArguments.Nodes[0]
							if ast.IsTypeLiteralNode(typeArg) {
								emitsTypeName = "__VLS_Emit"
							} else if ast.IsTypeReferenceNode(typeArg) {
								emitsTypeName = typeArg.AsTypeReferenceNode().TypeName.Text()
							}
						}
					case "defineSlots":
						// TODO: can there be destructuring
						if !nameIsIdentifier {
							break
						}
						if !c.options.Version.supportsDefineSlots() {
							break
						}
						if slotsVariableName != "" {
							calleeLoc := utils.TrimNodeTextRange(c.scriptSetupEl.Ast, callee)
							c.reportDiagnostic(utils.MoveTextRange(calleeLoc, innerStart), vue_diagnostics.Duplicate_X_0_call, "defineSlots")
							break
						}
						slotsVariableName = name.Text()
					case "defineModel":
						if !c.options.Version.supportsDefineModel() {
							break
						}
						callLoc := utils.TrimNodeTextRange(c.scriptSetupEl.Ast, call.AsNode())
						c.mapText(c.lastMappedPos, innerStart+callLoc.Pos())
						c.lastMappedPos = innerStart + callLoc.Pos()
						c.processDefineModel(innerStart, call, callLoc, name.Text())
					}
				}
			case ast.KindExpressionStatement:
				expr := statement.AsExpressionStatement().Expression
				if !ast.IsCallExpression(expr) {
					break
				}
				call := expr.AsCallExpression()
				callee := call.Expression
				if !ast.IsIdentifier(callee) {
					break
				}
				calleeName := callee.Text()
				switch calleeName {
				case "withDefaults", "defineProps":
					if propsVariableName != "" {
						calleeLoc := utils.TrimNodeTextRange(c.scriptSetupEl.Ast, callee)
						c.reportDiagnostic(utils.MoveTextRange(calleeLoc, innerStart), vue_diagnostics.Duplicate_X_0_call, "defineProps")
						break
					}
					propsVariableName = "__VLS_Props"
					// Expose the props on the ctx instance: __VLS_PublicProps = typeof
					// __VLS_Props → __typeProps wires them so `__VLS_ctx.<prop>` resolves.
					propsTypeName = "typeof __VLS_Props"
					c.mapText(c.lastMappedPos, innerStart+statement.Pos())
					c.serviceText.WriteString("\nconst __VLS_Props = ")
					c.mapText(innerStart+statement.Pos(), innerStart+statement.End())
					c.lastMappedPos = innerStart + statement.End()
				case "defineEmits":
					if emitsVariableName != "" {
						calleeLoc := utils.TrimNodeTextRange(c.scriptSetupEl.Ast, callee)
						c.reportDiagnostic(utils.MoveTextRange(calleeLoc, innerStart), vue_diagnostics.Duplicate_X_0_call, "defineEmits")
						break
					}
					emitsVariableName = "__VLS_Emits"
					c.mapText(c.lastMappedPos, innerStart+statement.Pos())
					c.serviceText.WriteString("\nconst __VLS_Emits = ")
					c.mapText(innerStart+statement.Pos(), innerStart+statement.End())
					c.lastMappedPos = innerStart + statement.End()
				case "defineSlots":
					if !c.options.Version.supportsDefineSlots() {
						break
					}
					if slotsVariableName != "" {
						calleeLoc := utils.TrimNodeTextRange(c.scriptSetupEl.Ast, callee)
						c.reportDiagnostic(utils.MoveTextRange(calleeLoc, innerStart), vue_diagnostics.Duplicate_X_0_call, "defineSlots")
						break
					}
					slotsVariableName = "__VLS_Slots"
					c.mapText(c.lastMappedPos, innerStart+statement.Pos())
					c.serviceText.WriteString("\nconst __VLS_Slots = ")
					c.mapText(innerStart+statement.Pos(), innerStart+statement.End())
					c.lastMappedPos = innerStart + statement.End()
				case "defineExpose":
					if hasExpose {
						calleeLoc := utils.TrimNodeTextRange(c.scriptSetupEl.Ast, callee)
						c.reportDiagnostic(utils.MoveTextRange(calleeLoc, innerStart), vue_diagnostics.Duplicate_X_0_call, "defineExpose")
						break
					}
					hasExpose = true
					// Volar pattern: extract argument into variable, then call defineExpose with it
					// const __VLS_exposed = <argument>;
					// defineExpose(__VLS_exposed)
					c.mapText(c.lastMappedPos, innerStart+statement.Pos())
					c.lastMappedPos = innerStart + statement.End()
					c.serviceText.WriteString("const __VLS_exposed = ")
					if len(call.Arguments.Nodes) > 0 {
						arg := call.Arguments.Nodes[0]
						argStart := innerStart + arg.Pos()
						argEnd := innerStart + arg.End()
						c.serviceText.WriteString(c.sourceText[argStart:argEnd])
					}
					c.serviceText.WriteString(";\n")
					c.serviceText.WriteString("defineExpose(__VLS_exposed)\n")
				case "defineModel":
					callLoc := utils.TrimNodeTextRange(c.scriptSetupEl.Ast, call.AsNode())
					c.mapText(c.lastMappedPos, innerStart+callLoc.Pos())
					c.lastMappedPos = innerStart + callLoc.Pos()
					c.processDefineModel(innerStart, call, callLoc, "")
				}
			case ast.KindImportDeclaration:
				importRanges = append(importRanges, utils.MoveTextRange(statement.Loc, innerStart))
			}
		}

		// For Volar-style type extraction: transform defineProps<{...}>() into type + call.
		c.emitScriptSetupContent(innerStart, hasText, importRanges, propsTypeName, emitsTypeName, false)

		// Volar closes the script setup body with a `debugger/* PartiallyEnd */` marker.
		if !hasGeneric {
			c.serviceText.WriteString("debugger/* PartiallyEnd: #3632/scriptSetup.vue */\n")
		}

		// Populate setupBindings for template codegen to distinguish imported vs global components
		for _, name := range c.bindingNames {
			c.codegenCtx.setupBindings.Add(name)
		}
		// The defineProps result var is accessed bare in the template (Volar model).
		if propsVariableName != "" {
			c.codegenCtx.noCtxPrefix.Add(propsVariableName)
		}

		// Generate template first (buffered) to collect used vars for binding filtering
		tmplOutput := generateTemplateBuffered(c.codegenCtx, templateEl)

		// Build set of ALL template-accessed vars for filtering bindings
		// (allAccessedVars includes vars from drained inner scopes too)
		_ = tmplOutput // used below for merging

		// Macros declaration — conditionally include macros based on Vue version
		c.serviceText.WriteString("// @ts-ignore\ndeclare const { defineProps, ")
		if c.options.Version.supportsDefineSlots() {
			c.serviceText.WriteString("defineSlots, ")
		}
		c.serviceText.WriteString("defineEmits, defineExpose, ")
		if c.options.Version.supportsDefineModel() {
			c.serviceText.WriteString("defineModel, ")
		}
		c.serviceText.WriteString("defineOptions, withDefaults, }: typeof import('vue');\n")

		// withDefaults(): expose the defaults object so defineComponent can wire
		// it via __defaults (matches Volar).
		if defaultsArg != nil {
			c.serviceText.WriteString("const __VLS_defaults = ")
			c.mapTextFrom(defaultsArg, c.scriptSetupEl.Ast, innerStart)
			c.serviceText.WriteString(";\n")
		}

		// Emit consolidated model types (Volar-style: __VLS_ModelProps, __VLS_ModelEmit, __VLS_modelEmit)
		c.emitModelTypes()

		// __VLS_PublicProps — Volar always emits this: the type-only props/models
		// intersection, or `{}` when there are none (runtime props go via `props:`).
		hasPublicProps := propsTypeName != "" || len(c.defineModels) > 0
		c.serviceText.WriteString("type __VLS_PublicProps = ")
		if hasPublicProps {
			parts := []string{}
			if propsTypeName != "" {
				parts = append(parts, propsTypeName)
			}
			if len(c.defineModels) > 0 {
				parts = append(parts, "__VLS_ModelProps")
			}
			for i, p := range parts {
				if i > 0 {
					c.serviceText.WriteString(" & ")
				}
				c.serviceText.WriteString(p)
			}
		} else {
			c.serviceText.WriteString("{}")
		}
		c.serviceText.WriteString(";\n")

		hasPublicEmits := emitsVariableName != "" || len(c.defineModels) > 0

		// Volar 2.2.x context model: __VLS_ctx = InstanceType of the self component
		// (defined below), whose setup() returns all script-setup bindings and whose
		// props/emits are wired via __typeProps/__typeEmits. Local components and
		// directives are derived from ctx. $slots/$attrs/$refs/$el live on the
		// separate __VLS_dollars var (emitted with the template body).
		c.serviceText.WriteString("const __VLS_ctx = {} as InstanceType<__VLS_PickNotAny<typeof __VLS_self, new () => {}>>;\n")
		c.serviceText.WriteString("type __VLS_LocalComponents = & typeof __VLS_ctx;\n")
		c.serviceText.WriteString("let __VLS_components!: __VLS_LocalComponents & __VLS_GlobalComponents;\n")
		c.serviceText.WriteString("type __VLS_LocalDirectives = & typeof __VLS_ctx;\n")
		c.serviceText.WriteString("let __VLS_directives!: __VLS_LocalDirectives & __VLS_GlobalDirectives;\n")

		// __VLS_StyleScopedClasses type (only when <style scoped> present)
		if c.hasScopedStyle && len(c.cssClasses) > 0 {
			c.serviceText.WriteString("type __VLS_StyleScopedClasses = {}\n")
			for _, cls := range c.cssClasses {
				c.serviceText.WriteString(" & { '")
				c.serviceText.WriteString(cls)
				c.serviceText.WriteString("': boolean };\n")
			}
		}

		// Merge buffered template output (element/component factories, interpolations,
		// then the __VLS_Slots/InheritedAttrs/TemplateRefs/RootEl/__VLS_dollars block).
		c.mergeTemplateOutput(tmplOutput)

		// Export — compute the setup() return bindings (shared by generic & normal).
		// Only the defineProps result var is kept out of setup()'s return (Volar wires
		// props via __typeProps and accesses `props` bare). defineEmits / defineModel
		// result vars ARE returned when the template accesses them. setup() returns
		// only bindings actually accessed in the template (via __VLS_ctx.<name>), in
		// declaration order — imports used only in script (e.g. `ref`) are excluded.
		var macroLocals collections.Set[string]
		if propsVariableName != "" {
			macroLocals.Add(propsVariableName)
		}
		var accessedSet collections.Set[string]
		for _, v := range tmplOutput.allAccessedVars {
			accessedSet.Add(v)
		}
		var setupBindings []string
		for _, b := range dedupeStrings(c.bindingNames) {
			if macroLocals.Has(b) || !accessedSet.Has(b) {
				continue
			}
			setupBindings = append(setupBindings, b)
		}
		emitOptions := func() {
			c.emitSelfComponentOptions(innerStart, hasPublicProps, hasPublicEmits, propsRuntimeArg, emitsRuntimeArg, emitsVariableName, propsTypeName, emitsTypeName, defaultsArg)
		}

		if hasGeneric {
			// __VLS_self is referenced by __VLS_ctx above; emit it, then close the
			// generic wrapper returning REAL slots (__VLS_Slots) and emit so consumers
			// of the generic component type its slots/events (kills the false positives).
			c.serviceText.WriteString("const __VLS_self = (await import('vue')).defineComponent({\n")
			c.emitSetupReturn(setupBindings)
			emitOptions()
			c.serviceText.WriteString("});\n")
			c.serviceText.WriteString("return {} as {\n")
			c.serviceText.WriteString("\tprops: import('vue').PublicProps")
			if hasPublicProps {
				c.serviceText.WriteString(" & __VLS_PrettifyLocal<__VLS_PublicProps>")
			}
			c.serviceText.WriteString(" & (typeof globalThis extends { __VLS_PROPS_FALLBACK: infer P } ? P : {});\n")
			c.serviceText.WriteString("\texpose: (exposed: {}) => void;\n")
			c.serviceText.WriteString("\tattrs: any;\n")
			c.serviceText.WriteString("\tslots: __VLS_Slots;\n")
			if hasPublicEmits {
				c.serviceText.WriteString("\temit: ")
				c.serviceText.WriteString(c.emitTypeRef(emitsVariableName))
				c.serviceText.WriteString(";\n")
			} else {
				c.serviceText.WriteString("\temit: {};\n")
			}
			c.serviceText.WriteString("};\n")
			c.serviceText.WriteString("})(),\n")
			c.serviceText.WriteString(") => ({} as import('vue').VNode & { __ctx?: Awaited<typeof __VLS_setup> }));\n")
			c.serviceText.WriteString("export default {} as typeof __VLS_export;\n")
			c.serviceText.WriteString("type __VLS_PrettifyLocal<T> = (T extends any ? { [K in keyof T]: T[K]; } : { [K in keyof T as K]: T[K]; }) & {};\n")
		} else {
			// Volar 2.2.x model: __VLS_self carries props/emits (so
			// InstanceType<__VLS_self> exposes $props/$emit) and its setup() returns
			// the accessed bindings; the default export is a bare defineComponent
			// (wrapped in __VLS_WithSlots when the component exposes slots).
			exposesSlots := slotsVariableName != "" || c.templateHasSlots

			c.serviceText.WriteString("const __VLS_self = (await import('vue')).defineComponent({\n")
			c.emitSetupReturn(setupBindings)
			emitOptions()
			c.serviceText.WriteString("});\n")

			if exposesSlots {
				c.serviceText.WriteString("const __VLS_component = (await import('vue')).defineComponent({\n")
			} else {
				c.serviceText.WriteString("export default (await import('vue')).defineComponent({\n")
			}
			c.emitSetupReturn(nil)
			emitOptions()
			c.serviceText.WriteString("});\n")

			if exposesSlots {
				c.serviceText.WriteString("export default {} as __VLS_WithSlots<typeof __VLS_component, __VLS_Slots>;\n")
			}
			c.serviceText.WriteString(";/* PartiallyEnd: #4569/main.vue */\n")
			// Trailing type-alias defs (Volar order: prop-type helpers, then WithSlots).
			if hasPublicProps {
				c.serviceText.WriteString("type __VLS_NonUndefinedable<T> = T extends undefined ? never : T;\n")
				c.serviceText.WriteString("type __VLS_TypePropsToOption<T> = {\n\t[K in keyof T]-?: {} extends Pick<T, K>\n\t\t? { type: import('vue').PropType<__VLS_NonUndefinedable<T[K]>> }\n\t\t: { type: import('vue').PropType<T[K]>, required: true }\n};\n")
			}
			if exposesSlots {
				c.serviceText.WriteString("type __VLS_WithSlots<T, S> = T & {\n\tnew(): {\n\t\t$slots: S;\n\t\t\n\t}\n};\n")
			}
		}

	} else {
		// No <script setup> — template-only or <script> without setup
		// Macros declaration
		c.serviceText.WriteString("// @ts-ignore\ndeclare const { defineProps, defineSlots, defineEmits, defineExpose, defineModel, defineOptions, withDefaults, }: typeof import('vue');\n")

		// Context — for non-script-setup, Volar uses a simple assignment instead of spread
		cssIntersection := ""
		if cssType := c.cssModulesObjectType(); cssType != "" {
			cssIntersection = " & " + cssType
		}
		if selfType != "" {
			c.serviceText.WriteString("const __VLS_ctx = {} as InstanceType<__VLS_PickNotAny<typeof ")
			c.serviceText.WriteString(selfType)
			c.serviceText.WriteString(" extends new () => {} ? typeof ")
			c.serviceText.WriteString(selfType)
			c.serviceText.WriteString(" : new () => {}, new () => {}>>")
			c.serviceText.WriteString(cssIntersection)
			c.serviceText.WriteString(";\n")
		} else {
			c.serviceText.WriteString("const __VLS_ctx = {} as import('vue').ComponentPublicInstance")
			c.serviceText.WriteString(cssIntersection)
			c.serviceText.WriteString(";\n")
		}

		// Component and directive type declarations
		c.serviceText.WriteString("type __VLS_LocalComponents = {};\n")
		c.serviceText.WriteString("type __VLS_GlobalComponents = import('vue').GlobalComponents;\n")
		c.serviceText.WriteString("let __VLS_components!: __VLS_LocalComponents & __VLS_GlobalComponents;\n")
		if c.options.Version.hasJsxRuntimeTypes() {
			c.serviceText.WriteString("let __VLS_intrinsics!: import('vue/jsx-runtime').JSX.IntrinsicElements;\n")
		} else {
			c.serviceText.WriteString("let __VLS_intrinsics!: globalThis.JSX.IntrinsicElements;\n")
		}
		c.serviceText.WriteString("type __VLS_LocalDirectives = {};\n")
		c.serviceText.WriteString("let __VLS_directives!: __VLS_LocalDirectives & import('vue').GlobalDirectives;\n")

		// Template
		tmplOutput := generateTemplateBuffered(c.codegenCtx, templateEl)
		c.mergeTemplateOutput(tmplOutput)

		// Export — template-only components need export default for import resolution
		hasSlots := c.templateHasSlots
		if hasSlots {
			c.serviceText.WriteString("const __VLS_base = (await import('vue')).defineComponent({\n});\n")
			c.serviceText.WriteString("const __VLS_export = {} as __VLS_WithSlots<typeof __VLS_base, __VLS_Slots>;\n")
			c.serviceText.WriteString("export default {} as typeof __VLS_export;\n")
			c.serviceText.WriteString("type __VLS_WithSlots<T, S> = T & {\n\tnew(): {\n\t\t$slots: S;\n\t}\n};\n\n")
		} else {
			c.serviceText.WriteString("const __VLS_export = (await import('vue')).defineComponent({\n});\nexport default {} as typeof __VLS_export;\n\n")
		}
	}
}

// emitScriptSetupContent emits the script setup content inline, handling import hoisting
// and Volar-style defineProps/defineEmits type extraction.
// dedupeStrings returns the input slice with duplicates removed, preserving first-seen order.
func dedupeStrings(in []string) []string {
	var seen collections.Set[string]
	out := make([]string, 0, len(in))
	for _, s := range in {
		if seen.Has(s) {
			continue
		}
		seen.Add(s)
		out = append(out, s)
	}
	return out
}

// emitSetupReturn emits a `setup() { return { <bindings> }; },` block for a
// defineComponent, each binding as `name: name as typeof name`.
func (c *scriptCodegenCtx) emitSetupReturn(bindings []string) {
	c.serviceText.WriteString("setup() {\n")
	c.serviceText.WriteString("return {\n")
	for _, b := range bindings {
		c.serviceText.WriteString(b)
		c.serviceText.WriteString(": ")
		c.serviceText.WriteString(b)
		c.serviceText.WriteString(" as typeof ")
		c.serviceText.WriteString(b)
		c.serviceText.WriteString(",\n")
	}
	c.serviceText.WriteString("};\n")
	c.serviceText.WriteString("},\n")
}

// emitSelfComponentOptions emits the __typeProps/__typeEmits/props/emits options for
// the __VLS_self defineComponent, following Volar's runtime-vs-type-only rules.
func (c *scriptCodegenCtx) emitSelfComponentOptions(innerStart int, hasPublicProps, hasPublicEmits bool, propsRuntimeArg, emitsRuntimeArg *ast.Node, emitsVariableName, propsTypeName, emitsTypeName string, defaultsArg *ast.Node) {
	if hasPublicEmits {
		hasRuntimeEmits := emitsRuntimeArg != nil
		hasTypeEmits := emitsTypeName != "" || len(c.defineModels) > 0

		emitType := c.emitTypeForExport(emitsVariableName, emitsTypeName)
		if c.options.Version.supportsTypeEmits() && hasTypeEmits {
			c.serviceText.WriteString("__typeEmits: {} as ")
			c.serviceText.WriteString(emitType)
			c.serviceText.WriteString(",\n")
		}
		if hasRuntimeEmits {
			c.serviceText.WriteString("emits: ")
			c.mapTextFrom(emitsRuntimeArg, c.scriptSetupEl.Ast, innerStart)
			c.serviceText.WriteString(",\n")
		} else if !c.options.Version.supportsTypeEmits() || !hasTypeEmits {
			c.serviceText.WriteString("emits: {} as unknown as __VLS_NormalizeEmits<")
			c.serviceText.WriteString(emitType)
			c.serviceText.WriteString(">,\n")
		}
	}
	if hasPublicProps || propsRuntimeArg != nil {
		hasRuntimeProps := propsRuntimeArg != nil
		hasTypeProps := propsTypeName != "" || len(c.defineModels) > 0

		if hasRuntimeProps {
			c.serviceText.WriteString("props: ")
			c.mapTextFrom(propsRuntimeArg, c.scriptSetupEl.Ast, innerStart)
			c.serviceText.WriteString(",\n")
		} else if hasTypeProps {
			if defaultsArg != nil {
				c.serviceText.WriteString("__defaults: __VLS_defaults,\n")
			}
			if c.options.Version.supportsTypeProps() {
				c.serviceText.WriteString("__typeProps: {} as __VLS_PublicProps,\n")
			} else {
				c.serviceText.WriteString("props: {} as unknown as __VLS_TypePropsToOption<__VLS_PublicProps>,\n")
			}
		}
	}
}

func (c *scriptCodegenCtx) emitScriptSetupContent(innerStart int, hasText bool, importRanges []core.TextRange, propsTypeName, emitsTypeName string, skipImports bool) {
	if !hasText {
		return
	}

	text := c.scriptSetupEl.Children[0].AsText()
	sourceContent := c.sourceText[text.Loc.Pos():text.Loc.End()]

	// For Volar-style type extraction, we need to transform:
	// const props = defineProps<{...}>() → type __VLS_Props = {...};\nconst props = defineProps<__VLS_Props>()
	// const emit = defineEmits<{...}>() → type __VLS_Emit = {...};\nconst emit = defineEmits<__VLS_Emit>()
	if propsTypeName != "" || emitsTypeName != "" {
		c.emitScriptSetupContentWithTypeExtraction(innerStart, sourceContent, text, importRanges, propsTypeName, emitsTypeName, skipImports)
	} else {
		c.emitScriptSetupContentDirect(innerStart, sourceContent, text, importRanges, skipImports)
	}
}

// emitScriptSetupContentDirect emits script setup content without type extraction transforms.
// When skipImports is set (generic SFCs), import statements are omitted here — they were
// hoisted above the generic wrapper.
func (c *scriptCodegenCtx) emitScriptSetupContentDirect(innerStart int, sourceContent string, text *vue_ast.TextNode, importRanges []core.TextRange, skipImports bool) {
	// Start from lastMappedPos to avoid re-emitting text already handled by the first pass
	// (e.g. defineProps/defineEmits/defineModel/defineExpose expression statements)
	pos := c.lastMappedPos
	for _, imp := range importRanges {
		// Skip imports that were already emitted in the first pass
		if imp.End() <= pos {
			continue
		}
		// Emit content before this import
		if pos < imp.Pos() {
			c.mapText(pos, imp.Pos())
		}
		// Emit the import inline (Volar keeps imports inline) unless hoisted (generic).
		if !skipImports {
			c.mapText(imp.Pos(), imp.End())
		}
		pos = imp.End()
	}
	// Emit remaining content
	if pos < text.Loc.End() {
		c.mapText(pos, text.Loc.End())
	}
}

// emitScriptSetupContentWithTypeExtraction handles Volar-style type extraction from defineProps/defineEmits.
func (c *scriptCodegenCtx) emitScriptSetupContentWithTypeExtraction(innerStart int, sourceContent string, text *vue_ast.TextNode, importRanges []core.TextRange, propsTypeName, emitsTypeName string, skipImports bool) {
	// Start from lastMappedPos to avoid re-emitting text already handled by the first pass
	// (e.g. defineProps/defineEmits/defineModel/defineExpose expression statements)
	pos := c.lastMappedPos

	var statements []*ast.Node
	if c.scriptSetupEl.Ast != nil {
		statements = c.scriptSetupEl.Ast.Statements.Nodes
	}

	for _, statement := range statements {
		stmtStart := innerStart + statement.Pos()
		stmtEnd := innerStart + statement.End()

		// Generic SFC: imports were hoisted above the wrapper — emit the gap before
		// the import but omit the import statement itself.
		if skipImports && statement.Kind == ast.KindImportDeclaration {
			if pos < stmtStart {
				c.mapText(pos, stmtStart)
			}
			if stmtEnd > pos {
				pos = stmtEnd
			}
			continue
		}

		// Skip statements already emitted by the first pass
		if stmtEnd <= pos {
			continue
		}

		if statement.Kind == ast.KindVariableStatement {
			for _, d := range statement.AsVariableStatement().DeclarationList.AsVariableDeclarationList().Declarations.Nodes {
				decl := d.AsVariableDeclaration()
				if decl.Initializer == nil || !ast.IsCallExpression(decl.Initializer) {
					continue
				}
				call := decl.Initializer.AsCallExpression()
				callee := call.Expression
				if !ast.IsIdentifier(callee) {
					continue
				}
				calleeName := callee.Text()

				if (calleeName == "defineProps" && propsTypeName == "__VLS_Props") ||
					(calleeName == "defineEmits" && emitsTypeName == "__VLS_Emit") {
					if call.TypeArguments != nil && len(call.TypeArguments.Nodes) == 1 {
						typeArg := call.TypeArguments.Nodes[0]
						if ast.IsTypeLiteralNode(typeArg) {
							// Emit content before this statement's leading trivia
							if pos < stmtStart {
								c.mapText(pos, stmtStart)
							}

							// Extract the type literal content
							typeStart := innerStart + typeArg.Pos()
							typeEnd := innerStart + typeArg.End()
							typeLiteralContent := c.sourceText[typeStart:typeEnd]

							var extractedTypeName string
							if calleeName == "defineProps" {
								extractedTypeName = "__VLS_Props"
							} else {
								extractedTypeName = "__VLS_Emit"
							}

							// Emit leading trivia (whitespace/newlines) before the type extraction
							// stmtStart includes leading trivia; find where actual content starts
							actualContentStart := stmtStart
							for actualContentStart < stmtEnd && (c.sourceText[actualContentStart] == '\n' || c.sourceText[actualContentStart] == '\r' || c.sourceText[actualContentStart] == ' ' || c.sourceText[actualContentStart] == '\t') {
								actualContentStart++
							}
							if actualContentStart > stmtStart {
								c.mapText(stmtStart, actualContentStart)
							}

							// Emit: type __VLS_Props = {...};
							c.serviceText.WriteString("type ")
							c.serviceText.WriteString(extractedTypeName)
							c.serviceText.WriteString(" = ")
							c.serviceText.WriteString(typeLiteralContent)
							c.serviceText.WriteString(";\n")

							// Emit the variable declaration with the extracted type reference
							// "const props = defineProps<__VLS_Props>()"
							typeArgSourceStart := innerStart + typeArg.Pos()
							typeArgSourceEnd := innerStart + typeArg.End()

							// Emit "const props = defineProps<" (from actual content start)
							c.mapText(actualContentStart, typeArgSourceStart)
							// Emit the extracted type name
							c.serviceText.WriteString(extractedTypeName)
							// Skip the original type literal, emit ">()"
							pos = typeArgSourceEnd
							c.mapText(pos, stmtEnd)
							pos = stmtEnd
							goto nextStatement
						}
					}
				}
			}
		}

		// Default: emit statement as-is, starting from max(pos, stmtStart) to avoid
		// re-emitting text already handled by the first pass (e.g. defineModel variable declarations
		// where lastMappedPos is partway through the statement after the call expression).
		if pos > stmtStart {
			// First pass already emitted part of this statement; emit only the remainder
			if pos < stmtEnd {
				c.mapText(pos, stmtEnd)
			}
		} else {
			if pos < stmtStart {
				c.mapText(pos, stmtStart)
			}
			c.mapText(stmtStart, stmtEnd)
		}
		pos = stmtEnd

	nextStatement:
	}

	// Emit remaining content after last statement
	if pos < text.Loc.End() {
		c.mapText(pos, text.Loc.End())
	}
}

// processDefineModel collects metadata from a defineModel() call for consolidated type generation.
// localName is the variable name from `const localName = defineModel(...)`, or "" for expression statements.
func (c *scriptCodegenCtx) processDefineModel(innerStart int, call *ast.CallExpression, callLoc core.TextRange, localName string) {
	// Map the defineModel call as-is (Volar emits the raw call inline)
	c.mapText(innerStart+callLoc.Pos(), innerStart+callLoc.End())
	c.lastMappedPos = innerStart + callLoc.End()

	// Parse model name from first argument
	var modelName string
	if len(call.Arguments.Nodes) >= 1 {
		if ast.IsStringLiteral(call.Arguments.Nodes[0]) {
			modelName = call.Arguments.Nodes[0].AsStringLiteral().Text
		}
	}

	camelizedName := "modelValue"
	camelizedModifierName := "model"
	if modelName != "" {
		camelizedName = camelizeStr(modelName)
		camelizedModifierName = camelizedName
	}

	// Extract type argument text
	var typeText string
	var modifierTypeText string
	if call.TypeArguments != nil && len(call.TypeArguments.Nodes) >= 1 {
		typeArg := call.TypeArguments.Nodes[0]
		typeText = c.sourceText[innerStart+typeArg.Pos() : innerStart+typeArg.End()]
		if len(call.TypeArguments.Nodes) >= 2 {
			modArg := call.TypeArguments.Nodes[1]
			modifierTypeText = c.sourceText[innerStart+modArg.Pos() : innerStart+modArg.End()]
		}
	}

	// Parse options object (second arg if first is string, first arg if it's an object)
	var required bool
	var hasDefault bool
	var hasRuntimeType bool
	var optionsArg *ast.Node
	if len(call.Arguments.Nodes) >= 2 && ast.IsObjectLiteralExpression(call.Arguments.Nodes[1]) {
		optionsArg = call.Arguments.Nodes[1]
	} else if len(call.Arguments.Nodes) >= 1 && ast.IsObjectLiteralExpression(call.Arguments.Nodes[0]) {
		optionsArg = call.Arguments.Nodes[0]
	}
	if optionsArg != nil {
		for _, prop := range optionsArg.AsObjectLiteralExpression().Properties.Nodes {
			if !ast.IsPropertyAssignment(prop) {
				continue
			}
			pa := prop.AsPropertyAssignment()
			if pa.Name() == nil {
				continue
			}
			propName := pa.Name().Text()
			switch propName {
			case "required":
				if pa.Initializer != nil && pa.Initializer.Kind == ast.KindTrueKeyword {
					required = true
				}
			case "default":
				hasDefault = true
			case "type":
				hasRuntimeType = true
			}
		}
	}

	// Determine type text: Volar's priority is:
	// 1. Explicit type arg: defineModel<T>() → "T"
	// 2. Runtime type + local name: defineModel('name', { type: X }) → "typeof localName['value']"
	// 3. Default value + prop name: defineModel({ default: v }) → "typeof __VLS_defaultModels['propName']"
	// 4. Fallback: "any"
	if typeText == "" && hasRuntimeType && localName != "" {
		typeText = "typeof " + localName + "['value']"
	}

	// Check for duplicate model names
	if c.seenDefineModels.Has(camelizedName) {
		callee := call.Expression
		calleeLoc := utils.TrimNodeTextRange(c.scriptSetupEl.Ast, callee)
		c.reportDiagnostic(utils.MoveTextRange(calleeLoc, innerStart), vue_diagnostics.Duplicate_model_name_X_0, camelizedName)
	} else {
		c.seenDefineModels.Add(camelizedName)
	}

	c.defineModels = append(c.defineModels, defineModelInfo{
		camelizedName:         camelizedName,
		camelizedModifierName: camelizedModifierName,
		typeText:              typeText,
		modifierTypeText:      modifierTypeText,
		required:              required,
		hasDefault:            hasDefault,
	})
}

// emitModelTypes generates consolidated __VLS_ModelProps and __VLS_ModelEmit types from collected defineModel info.
func (c *scriptCodegenCtx) emitModelTypes() {
	if len(c.defineModels) == 0 {
		return
	}

	// __VLS_ModelProps
	c.serviceText.WriteString("type __VLS_ModelProps = {\n")
	for _, m := range c.defineModels {
		propType := m.typeText
		if propType == "" {
			propType = "any"
		}
		if m.camelizedName == "modelValue" {
			// Default model: no quotes for modelValue
			c.serviceText.WriteString(m.camelizedName)
		} else {
			c.serviceText.WriteString("'")
			c.serviceText.WriteString(m.camelizedName)
			c.serviceText.WriteString("'")
		}
		if m.required {
			c.serviceText.WriteString(": ")
		} else {
			c.serviceText.WriteString("?: ")
		}
		c.serviceText.WriteString(propType)
		c.serviceText.WriteString(";\n")

		// Modifiers property
		if m.modifierTypeText != "" {
			c.serviceText.WriteString("'")
			c.serviceText.WriteString(m.camelizedModifierName)
			c.serviceText.WriteString("Modifiers'?: Partial<Record<")
			c.serviceText.WriteString(m.modifierTypeText)
			c.serviceText.WriteString(", true>>;\n")
		}
	}
	c.serviceText.WriteString("};\n")

	// __VLS_ModelEmit
	c.serviceText.WriteString("type __VLS_ModelEmit = {\n")
	for _, m := range c.defineModels {
		propType := m.typeText
		if propType == "" {
			propType = "any"
		}
		c.serviceText.WriteString("'update:")
		c.serviceText.WriteString(m.camelizedName)
		c.serviceText.WriteString("': [value: ")
		c.serviceText.WriteString(propType)
		if !m.required && !m.hasDefault {
			c.serviceText.WriteString(" | undefined")
		}
		c.serviceText.WriteString("];\n")
	}
	c.serviceText.WriteString("};\n")

	// __VLS_modelEmit instance
	c.serviceText.WriteString("const __VLS_modelEmit = defineEmits<__VLS_ModelEmit>();\n")
}

// emitTypeRef returns the type reference for $emit in the context.
// Volar uses "typeof emitsVar" for defineEmits, "typeof __VLS_modelEmit" for defineModel.
func (c *scriptCodegenCtx) emitTypeRef(emitsVariableName string) string {
	if emitsVariableName != "" && len(c.defineModels) > 0 {
		return "__VLS_PublicEmits"
	}
	if emitsVariableName != "" {
		return "typeof " + emitsVariableName
	}
	return "typeof __VLS_modelEmit"
}

// propsTypeRef returns the type reference for $props in the context.
func (c *scriptCodegenCtx) propsTypeRef(propsVariableName, propsTypeName string) string {
	if propsVariableName != "" && len(c.defineModels) > 0 {
		// Both defineProps and defineModel — use the combined __VLS_PublicProps
		return "__VLS_PublicProps"
	}
	if len(c.defineModels) > 0 {
		return "__VLS_ModelProps"
	}
	if propsTypeName != "" {
		return propsTypeName
	}
	if propsVariableName != "" {
		return "typeof " + propsVariableName
	}
	return "__VLS_PublicProps"
}

// emitTypeForExport returns the emit type to use in the defineComponent export.
// Volar uses literal types (e.g. __VLS_Emit, __VLS_ModelEmit) in the export.
func (c *scriptCodegenCtx) emitTypeForExport(emitsVariableName, emitsTypeName string) string {
	hasDefineEmits := emitsVariableName != ""
	hasDefineModel := len(c.defineModels) > 0

	if hasDefineEmits && hasDefineModel {
		// Both: use combined __VLS_PublicEmits
		return "__VLS_PublicEmits"
	}
	if hasDefineModel {
		// Only model: use literal type
		return "__VLS_ModelEmit"
	}
	if emitsTypeName != "" {
		// Extracted type (e.g. __VLS_Emit)
		return emitsTypeName
	}
	// defineEmits without type extraction: use typeof
	return "typeof " + emitsVariableName
}

func (c *scriptCodegenCtx) collectBindingRanges(innerStart int, node *ast.Node) {
	switch node.Kind {
	case ast.KindVariableStatement:
		for _, d := range node.AsVariableStatement().DeclarationList.AsVariableDeclarationList().Declarations.Nodes {
			decl := d.AsVariableDeclaration()
			name := decl.Name()
			var visitor ast.Visitor
			// TODO: types, etc
			// TODO: declare const?
			visitor = func(n *ast.Node) bool {
				if ast.IsIdentifier(n) {
					c.bindingNames = append(c.bindingNames, n.AsIdentifier().Text)
				} else if ast.IsBindingPattern(n) {
					for _, el := range n.AsBindingPattern().Elements.Nodes {
						if ast.IsBindingElement(el) {
							visitor(el.Name())
						}
					}
				} else {
					n.ForEachChild(visitor)
				}
				return false
			}
			visitor(name)
		}
	case ast.KindFunctionDeclaration, ast.KindClassDeclaration, ast.KindEnumDeclaration:
		if name := node.Name(); name != nil {
			c.bindingNames = append(c.bindingNames, name.AsIdentifier().Text)
		}
	case ast.KindImportDeclaration:
		importClause := node.AsImportDeclaration().ImportClause
		if importClause == nil || importClause.IsTypeOnly() {
			return
		}

		if importClause.Name() != nil {
			c.bindingNames = append(c.bindingNames, importClause.Name().AsIdentifier().Text)
		}

		namedBindings := importClause.AsImportClause().NamedBindings
		if namedBindings != nil {
			if ast.IsNamespaceImport(namedBindings) {
				c.bindingNames = append(c.bindingNames, namedBindings.Name().AsIdentifier().Text)
			} else {
				for _, element := range namedBindings.Elements() {
					if !element.IsTypeOnly() {
						c.bindingNames = append(c.bindingNames, element.Name().AsIdentifier().Text)
					}
				}
			}
		}

	}
}
