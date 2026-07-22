/* placeholder */
import { ref, computed, watch, onMounted } from 'vue'
import type { Ref } from 'vue'

interface BreadcrumbItem {
  label: string
  path: string
}

type __VLS_Props = {
  readonly title: string
  readonly itemId: string
  readonly variant?: 'block' | 'curved' | 'round'
};
const props = defineProps<__VLS_Props>()

type __VLS_Emit = {
  delete: [id: string]
  rename: [id: string, newName: string]
};
const emit = defineEmits<__VLS_Emit>()

const showMenu = ref(false)
const showDeleteConfirm = ref(false)
const deleteError = ref<string | null>(null)
const deleteChildrenCount = ref(0)
const searchQuery = ref('')
const breadcrumbContainer = ref<HTMLDivElement | null>(null)

const breadcrumbs = computed<BreadcrumbItem[]>(() => {
  if (!props.title) {
    return []
  }
  return props.title.split('/').map(part => ({
    label: part.trim(),
    path: `/${part.trim().toLowerCase()}`
  }))
})

const filteredBreadcrumbs = computed(() => {
  if (!searchQuery.value) {
    return breadcrumbs.value
  }
  return breadcrumbs.value.filter(b =>
    b.label.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const isGlobal = computed(() => {
  return props.title === 'Global'
})

const dynamicWidth = computed(() => {
  const count = filteredBreadcrumbs.value.length
  return Math.max(50, 300 / Math.max(count, 1))
})

watch(
  () => props.itemId,
  async (newId) => {
    if (newId) {
      showMenu.value = false
      showDeleteConfirm.value = false
    }
  },
  { immediate: true }
)

onMounted(() => {
  console.log('Component mounted:', props.title)
})

function handleDelete() {
  deleteError.value = null
  emit('delete', props.itemId)
  showDeleteConfirm.value = false
  showMenu.value = false
  deleteChildrenCount.value = 0
}

function handleRenameFromMenu() {
  showMenu.value = false
  emit('rename', props.itemId, props.title)
}
debugger/* PartiallyEnd: #3632/scriptSetup.vue */
// @ts-ignore
declare const { defineProps, defineSlots, defineEmits, defineExpose, defineModel, defineOptions, withDefaults, }: typeof import('vue');
type __VLS_PublicProps = __VLS_Props;
const __VLS_ctx = {} as InstanceType<__VLS_PickNotAny<typeof __VLS_self, new () => {}>>;
type __VLS_LocalComponents = & typeof __VLS_ctx;
let __VLS_components!: __VLS_LocalComponents & __VLS_GlobalComponents;
type __VLS_LocalDirectives = & typeof __VLS_ctx;
let __VLS_directives!: __VLS_LocalDirectives & __VLS_GlobalDirectives;
type __VLS_StyleScopedClasses = {}
 & { 'item-header': boolean };
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
...{ class: "item-header" },
'data-id': (__VLS_ctx.itemId),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
...{ class: "breadcrumbs" },
ref: "breadcrumbContainer",
});
/** @type {typeof __VLS_ctx.breadcrumbContainer} */;
for (const [crumb, idx] of __VLS_getVForSourceType((__VLS_ctx.filteredBreadcrumbs)!)) {
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
key: (idx),
title: (crumb.label),
...{ class: "breadcrumb-item" },
...{ style: ({ maxWidth: `${__VLS_ctx.dynamicWidth}px` }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
});
( crumb.label );
if (idx < __VLS_ctx.filteredBreadcrumbs.length - 1) {
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
...{ class: "separator" },
});
}
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
...{ class: "item-title" },
});
( __VLS_ctx.title );
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
...{ class: "actions" },
});
if (__VLS_ctx.isGlobal) {
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
...{ class: "global-badge" },
});
}
else {
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
...{ onClick: (...[$event]) => {
if (!!(__VLS_ctx.isGlobal)) return;
__VLS_ctx.showMenu = !__VLS_ctx.showMenu;
}},
...{ class: "menu-btn" },
});
}
var __VLS_0 = {
};
if (__VLS_ctx.showMenu && !__VLS_ctx.isGlobal) {
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
...{ onClick: () => {}},
...{ class: "menu-popover" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
...{ onClick: (__VLS_ctx.handleRenameFromMenu)},
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
...{ onClick: (...[$event]) => {
if (!(__VLS_ctx.showMenu && !__VLS_ctx.isGlobal)) return;

          __VLS_ctx.deleteChildrenCount = 0;
          __VLS_ctx.showDeleteConfirm = true;
        ;
}},
});
}
if (__VLS_ctx.showDeleteConfirm) {
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
...{ class: "delete-dialog" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
});
( __VLS_ctx.title );
if (__VLS_ctx.deleteChildrenCount > 0) {
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
});
( __VLS_ctx.deleteChildrenCount );
}
if (__VLS_ctx.deleteError) {
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
...{ class: "error" },
});
( __VLS_ctx.deleteError );
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
...{ onClick: (__VLS_ctx.handleDelete)},
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
...{ onClick: (...[$event]) => {
if (!(__VLS_ctx.showDeleteConfirm)) return;

          __VLS_ctx.showDeleteConfirm = false;
          __VLS_ctx.showMenu = false;
          __VLS_ctx.deleteChildrenCount = 0;
        ;
}},
});
}
/** @type {__VLS_StyleScopedClasses['item-header']} */;
/** @type {__VLS_StyleScopedClasses['breadcrumbs']} */;
/** @type {__VLS_StyleScopedClasses['breadcrumb-item']} */;
/** @type {__VLS_StyleScopedClasses['separator']} */;
/** @type {__VLS_StyleScopedClasses['item-title']} */;
/** @type {__VLS_StyleScopedClasses['actions']} */;
/** @type {__VLS_StyleScopedClasses['global-badge']} */;
/** @type {__VLS_StyleScopedClasses['menu-btn']} */;
/** @type {__VLS_StyleScopedClasses['menu-popover']} */;
/** @type {__VLS_StyleScopedClasses['delete-dialog']} */;
/** @type {__VLS_StyleScopedClasses['error']} */;
// @ts-ignore
var __VLS_1 = __VLS_0, ;
type __VLS_Slots = {}
& { 'extra-actions'?: (props: typeof __VLS_1) => any };
type __VLS_InheritedAttrs = {};
type __VLS_TemplateRefs = {
breadcrumbContainer: __VLS_NativeElements['div'],
};
type __VLS_RootEl = 
| __VLS_NativeElements['div'];
var __VLS_dollars!: {
$slots: __VLS_Slots;
$attrs: import('vue').ComponentPublicInstance['$attrs'] & Partial<__VLS_InheritedAttrs>;
$refs: __VLS_TemplateRefs;
$el: __VLS_RootEl;
} & { [K in keyof import('vue').ComponentPublicInstance]: unknown };
const __VLS_self = (await import('vue')).defineComponent({
setup() {
return {
showMenu: showMenu as typeof showMenu,
showDeleteConfirm: showDeleteConfirm as typeof showDeleteConfirm,
deleteError: deleteError as typeof deleteError,
deleteChildrenCount: deleteChildrenCount as typeof deleteChildrenCount,
breadcrumbContainer: breadcrumbContainer as typeof breadcrumbContainer,
filteredBreadcrumbs: filteredBreadcrumbs as typeof filteredBreadcrumbs,
isGlobal: isGlobal as typeof isGlobal,
dynamicWidth: dynamicWidth as typeof dynamicWidth,
handleDelete: handleDelete as typeof handleDelete,
handleRenameFromMenu: handleRenameFromMenu as typeof handleRenameFromMenu,
};
},
__typeEmits: {} as __VLS_Emit,
__typeProps: {} as __VLS_PublicProps,
});
const __VLS_component = (await import('vue')).defineComponent({
setup() {
return {
};
},
__typeEmits: {} as __VLS_Emit,
__typeProps: {} as __VLS_PublicProps,
});
export default {} as __VLS_WithSlots<typeof __VLS_component, __VLS_Slots>;
;/* PartiallyEnd: #4569/main.vue */
type __VLS_NonUndefinedable<T> = T extends undefined ? never : T;
type __VLS_TypePropsToOption<T> = {
	[K in keyof T]-?: {} extends Pick<T, K>
		? { type: import('vue').PropType<__VLS_NonUndefinedable<T[K]>> }
		: { type: import('vue').PropType<T[K]>, required: true }
};
type __VLS_WithSlots<T, S> = T & {
	new(): {
		$slots: S;
		
	}
};

; declare global {
	const __VLS_intrinsicElements: __VLS_IntrinsicElements;
	const __VLS_directiveBindingRestFields: { instance: null, oldValue: null, modifiers: any, dir: any };
	const __VLS_unref: typeof import('vue').unref;
	const __VLS_placeholder: any;

	type __VLS_NativeElements = __VLS_SpreadMerge<SVGElementTagNameMap, HTMLElementTagNameMap>;
	type __VLS_IntrinsicElements = import('vue/jsx-runtime').JSX.IntrinsicElements;
	type __VLS_Element = import('vue/jsx-runtime').JSX.Element;
	type __VLS_GlobalComponents = import('vue').GlobalComponents;
	type __VLS_GlobalDirectives = import('vue').GlobalDirectives;
	type __VLS_IsAny<T> = 0 extends 1 & T ? true : false;
	type __VLS_PickNotAny<A, B> = __VLS_IsAny<A> extends true ? B : A;
	type __VLS_SpreadMerge<A, B> = Omit<A, keyof B> & B;
	type __VLS_WithComponent<N0 extends string, LocalComponents, Self, N1 extends string, N2 extends string, N3 extends string> =
		N1 extends keyof LocalComponents ? N1 extends N0 ? Pick<LocalComponents, N0 extends keyof LocalComponents ? N0 : never> : { [K in N0]: LocalComponents[N1] } :
		N2 extends keyof LocalComponents ? N2 extends N0 ? Pick<LocalComponents, N0 extends keyof LocalComponents ? N0 : never> : { [K in N0]: LocalComponents[N2] } :
		N3 extends keyof LocalComponents ? N3 extends N0 ? Pick<LocalComponents, N0 extends keyof LocalComponents ? N0 : never> : { [K in N0]: LocalComponents[N3] } :
		Self extends object ? { [K in N0]: Self } :
		N1 extends keyof __VLS_GlobalComponents ? N1 extends N0 ? Pick<__VLS_GlobalComponents, N0 extends keyof __VLS_GlobalComponents ? N0 : never> : { [K in N0]: __VLS_GlobalComponents[N1] } :
		N2 extends keyof __VLS_GlobalComponents ? N2 extends N0 ? Pick<__VLS_GlobalComponents, N0 extends keyof __VLS_GlobalComponents ? N0 : never> : { [K in N0]: __VLS_GlobalComponents[N2] } :
		N3 extends keyof __VLS_GlobalComponents ? N3 extends N0 ? Pick<__VLS_GlobalComponents, N0 extends keyof __VLS_GlobalComponents ? N0 : never> : { [K in N0]: __VLS_GlobalComponents[N3] } :
		{ [K in N0]: unknown };
	type __VLS_FunctionalComponentProps<T, K> =
		'__ctx' extends keyof __VLS_PickNotAny<K, {}> ? K extends { __ctx?: { props?: infer P } } ? NonNullable<P> : never
		: T extends (props: infer P, ...args: any) => any ? P :
		{};
	type __VLS_IsFunction<T, K> = K extends keyof T
		? __VLS_IsAny<T[K]> extends false
		? unknown extends T[K]
		? false
		: true
		: false
		: false;
	type __VLS_NormalizeComponentEvent<Props, Events, onEvent extends keyof Props, Event extends keyof Events, CamelizedEvent extends keyof Events> = (
		__VLS_IsFunction<Props, onEvent> extends true
			? Props
			: __VLS_IsFunction<Events, Event> extends true
				? { [K in onEvent]?: Events[Event] }
				: __VLS_IsFunction<Events, CamelizedEvent> extends true
					? { [K in onEvent]?: Events[CamelizedEvent] }
					: Props
	) & Record<string, unknown>;
	// fix https://github.com/vuejs/language-tools/issues/926
	type __VLS_UnionToIntersection<U> = (U extends unknown ? (arg: U) => unknown : never) extends ((arg: infer P) => unknown) ? P : never;
	type __VLS_OverloadUnionInner<T, U = unknown> = U & T extends (...args: infer A) => infer R
		? U extends T
		? never
		: __VLS_OverloadUnionInner<T, Pick<T, keyof T> & U & ((...args: A) => R)> | ((...args: A) => R)
		: never;
	type __VLS_OverloadUnion<T> = Exclude<
		__VLS_OverloadUnionInner<(() => never) & T>,
		T extends () => never ? never : () => never
	>;
	type __VLS_ConstructorOverloads<T> = __VLS_OverloadUnion<T> extends infer F
		? F extends (event: infer E, ...args: infer A) => any
		? { [K in E & string]: (...args: A) => void; }
		: never
		: never;
	type __VLS_NormalizeEmits<T> = __VLS_PrettifyGlobal<
		__VLS_UnionToIntersection<
			__VLS_ConstructorOverloads<T> & {
				[K in keyof T]: T[K] extends any[] ? { (...args: T[K]): void } : never
			}
		>
	>;
	type __VLS_PrettifyGlobal<T> = { [K in keyof T]: T[K]; } & {};
	type __VLS_PickFunctionalComponentCtx<T, K> = NonNullable<__VLS_PickNotAny<
		'__ctx' extends keyof __VLS_PickNotAny<K, {}> ? K extends { __ctx?: infer Ctx } ? Ctx : never : any
		, T extends (props: any, ctx: infer Ctx) => any ? Ctx : any
	>>;
	type __VLS_UseTemplateRef<T> = Readonly<import('vue').ShallowRef<T | null>>;

	function __VLS_getVForSourceType<T extends number | string | any[] | Iterable<any>>(source: T): [
		item: T extends number ? number
			: T extends string ? string
			: T extends any[] ? T[number]
			: T extends Iterable<infer T1> ? T1
			: any,
		index: number,
	][];
	function __VLS_getVForSourceType<T>(source: T): [
		item: T[keyof T],
		key: keyof T,
		index: number,
	][];
	// @ts-ignore
	function __VLS_getSlotParams<T>(slot: T): Parameters<__VLS_PickNotAny<NonNullable<T>, (...args: any[]) => any>>;
	// @ts-ignore
	function __VLS_getSlotParam<T>(slot: T): Parameters<__VLS_PickNotAny<NonNullable<T>, (...args: any[]) => any>>[0];
	function __VLS_asFunctionalDirective<T>(dir: T): T extends import('vue').ObjectDirective
		? NonNullable<T['created' | 'beforeMount' | 'mounted' | 'beforeUpdate' | 'updated' | 'beforeUnmount' | 'unmounted']>
		: T extends (...args: any) => any
			? T
			: (arg1: unknown, arg2: unknown, arg3: unknown, arg4: unknown) => void;
	function __VLS_makeOptional<T>(t: T): { [K in keyof T]?: T[K] };
	function __VLS_asFunctionalComponent<T, K = T extends new (...args: any) => any ? InstanceType<T> : unknown>(t: T, instance?: K):
		T extends new (...args: any) => any
		? (props: (K extends { $props: infer Props } ? Props : any) & Record<string, unknown>, ctx?: any) => __VLS_Element & {
			__ctx?: {
				attrs?: any;
				slots?: K extends { $slots: infer Slots } ? Slots : any;
				emit?: K extends { $emit: infer Emit } ? Emit : any;
				expose?(exposed: K): void;
				props?: (K extends { $props: infer Props } ? Props : any) & Record<string, unknown>;
			}
		}
		: T extends () => any ? (props: {}, ctx?: any) => ReturnType<T>
		: T extends (...args: any) => any ? T
		: (_: {} & Record<string, unknown>, ctx?: any) => { __ctx?: { attrs?: any, expose?: any, slots?: any, emit?: any, props?: {} & Record<string, unknown> } };
	function __VLS_functionalComponentArgsRest<T extends (...args: any) => any>(t: T): 2 extends Parameters<T>['length'] ? [any] : [];
	function __VLS_asFunctionalElement<T>(tag: T, endTag?: T): (attrs: T & Record<string, unknown>) => void;
	function __VLS_asFunctionalSlot<S>(slot: S): S extends () => infer R ? (props: {}) => R : NonNullable<S>;
	function __VLS_tryAsConstant<const T>(t: T): T;
}
