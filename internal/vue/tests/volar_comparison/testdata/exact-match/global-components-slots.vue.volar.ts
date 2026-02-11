/// <reference types="template-helpers.d.ts" />
/// <reference types="props-fallback.d.ts" />

const isOpen = ref(false)
const target = ref<HTMLDivElement>()
const items = ref(['a', 'b', 'c'])

function close() {
  isOpen.value = false
}
// @ts-ignore
declare const { defineProps, defineSlots, defineEmits, defineExpose, defineModel, defineOptions, withDefaults, }: typeof import('vue');
type __VLS_SetupExposed = import('vue').ShallowUnwrapRef<{
isOpen: typeof isOpen;
target: typeof target;
close: typeof close;
items: typeof items;
}>;
const __VLS_ctx = {
...{} as import('vue').ComponentPublicInstance,
...{} as __VLS_SetupExposed,
};
type __VLS_LocalComponents = __VLS_SetupExposed;
type __VLS_GlobalComponents = import('vue').GlobalComponents;
let __VLS_components!: __VLS_LocalComponents & __VLS_GlobalComponents;
let __VLS_intrinsics!: import('vue/jsx-runtime').JSX.IntrinsicElements;
type __VLS_LocalDirectives = __VLS_SetupExposed;
let __VLS_directives!: __VLS_LocalDirectives & import('vue').GlobalDirectives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
...{ onClick: (...[$event]) => {
__VLS_ctx.isOpen = true;
// @ts-ignore
[isOpen,];
}},
ref: "target",
...{ class: "wrapper" },
});
/** @type {__VLS_StyleScopedClasses['wrapper']} */;
let __VLS_0!: __VLS_WithComponent<'Teleport', __VLS_LocalComponents, __VLS_GlobalComponents, void, 'Teleport'>['Teleport'];
/** @ts-ignore @type {typeof __VLS_components.Teleport | typeof __VLS_components.Teleport} */
Teleport;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
to: "body",
}));
const __VLS_2 = __VLS_1({
to: "body",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const { default: __VLS_5 } = __VLS_3.slots!;
let __VLS_6!: __VLS_WithComponent<'FDialog', __VLS_LocalComponents, __VLS_GlobalComponents, void, 'FDialog'>['FDialog'];
/** @ts-ignore @type {typeof __VLS_components.FDialog | typeof __VLS_components.FDialog} */
FDialog;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
isOpen: (__VLS_ctx.isOpen),
target: (__VLS_ctx.target),
overlay: true,
}));
const __VLS_8 = __VLS_7({
isOpen: (__VLS_ctx.isOpen),
target: (__VLS_ctx.target),
overlay: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_7));
const { default: __VLS_11 } = __VLS_9.slots!;
let __VLS_12!: __VLS_WithComponent<'FDiv', __VLS_LocalComponents, __VLS_GlobalComponents, void, 'FDiv'>['FDiv'];
/** @ts-ignore @type {typeof __VLS_components.FDiv | typeof __VLS_components.FDiv} */
FDiv;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent1(__VLS_12, new __VLS_12({
direction: "column",
gap: "small",
}));
const __VLS_14 = __VLS_13({
direction: "column",
gap: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
const { default: __VLS_17 } = __VLS_15.slots!;
let __VLS_18!: __VLS_WithComponent<'FDialogHeader', __VLS_LocalComponents, __VLS_GlobalComponents, void, 'FDialogHeader'>['FDialogHeader'];
/** @ts-ignore @type {typeof __VLS_components.FDialogHeader | typeof __VLS_components.FDialogHeader} */
FDialogHeader;
// @ts-ignore
const __VLS_19 = __VLS_asFunctionalComponent1(__VLS_18, new __VLS_18({
...{ 'onCloseDialog': {} as any },
}));
const __VLS_20 = __VLS_19({
...{ 'onCloseDialog': {} as any },
}, ...__VLS_functionalComponentArgsRest(__VLS_19));
let __VLS_23!: __VLS_ResolveEmits<typeof __VLS_18, typeof __VLS_21.emit>;
const __VLS_24: __VLS_NormalizeComponentEvent<typeof __VLS_22, typeof __VLS_23, 'onCloseDialog', 'close-dialog', 'closeDialog'> = (
{ closeDialog: {} as any } as typeof __VLS_23,
{ onCloseDialog: (__VLS_ctx.close)});
const { default: __VLS_25 } = __VLS_21.slots!;
let __VLS_26!: __VLS_WithComponent<'FIcon', __VLS_LocalComponents, __VLS_GlobalComponents, void, 'FIcon'>['FIcon'];
/** @ts-ignore @type {typeof __VLS_components.FIcon} */
FIcon;
// @ts-ignore
const __VLS_27 = __VLS_asFunctionalComponent1(__VLS_26, new __VLS_26({
source: "i-close",
size: "small",
}));
const __VLS_28 = __VLS_27({
source: "i-close",
size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_27));
let __VLS_31!: __VLS_WithComponent<'FDialogTitle', __VLS_LocalComponents, __VLS_GlobalComponents, void, 'FDialogTitle'>['FDialogTitle'];
/** @ts-ignore @type {typeof __VLS_components.FDialogTitle | typeof __VLS_components.FDialogTitle} */
FDialogTitle;
// @ts-ignore
const __VLS_32 = __VLS_asFunctionalComponent1(__VLS_31, new __VLS_31({
}));
const __VLS_33 = __VLS_32({
}, ...__VLS_functionalComponentArgsRest(__VLS_32));
const { default: __VLS_36 } = __VLS_34.slots!;
// @ts-ignore
[isOpen,target,close,];
var __VLS_34!: __VLS_FunctionalComponentCtx<typeof __VLS_31, typeof __VLS_33>;
// @ts-ignore
[];
var __VLS_21!: __VLS_FunctionalComponentCtx<typeof __VLS_18, typeof __VLS_20>;
var __VLS_22!: __VLS_FunctionalComponentProps<typeof __VLS_18, typeof __VLS_20>;
for (const [item] of __VLS_vFor((__VLS_ctx.items)!)) {
let __VLS_37!: __VLS_WithComponent<'FDiv', __VLS_LocalComponents, __VLS_GlobalComponents, void, 'FDiv'>['FDiv'];
/** @ts-ignore @type {typeof __VLS_components.FDiv | typeof __VLS_components.FDiv} */
FDiv;
// @ts-ignore
const __VLS_38 = __VLS_asFunctionalComponent1(__VLS_37, new __VLS_37({
key: (item),
direction: "row",
}));
const __VLS_39 = __VLS_38({
key: (item),
direction: "row",
}, ...__VLS_functionalComponentArgsRest(__VLS_38));
const { default: __VLS_42 } = __VLS_40.slots!;
let __VLS_43!: __VLS_WithComponent<'FText', __VLS_LocalComponents, __VLS_GlobalComponents, void, 'FText'>['FText'];
/** @ts-ignore @type {typeof __VLS_components.FText | typeof __VLS_components.FText} */
FText;
// @ts-ignore
const __VLS_44 = __VLS_asFunctionalComponent1(__VLS_43, new __VLS_43({
variant: "para",
size: "medium",
}));
const __VLS_45 = __VLS_44({
variant: "para",
size: "medium",
}, ...__VLS_functionalComponentArgsRest(__VLS_44));
const { default: __VLS_48 } = __VLS_46.slots!;
( item );
// @ts-ignore
[items,];
var __VLS_46!: __VLS_FunctionalComponentCtx<typeof __VLS_43, typeof __VLS_45>;
// @ts-ignore
[];
var __VLS_40!: __VLS_FunctionalComponentCtx<typeof __VLS_37, typeof __VLS_39>;
// @ts-ignore
[];
}
let __VLS_49!: __VLS_WithComponent<'FDialogFooter', __VLS_LocalComponents, __VLS_GlobalComponents, void, 'FDialogFooter'>['FDialogFooter'];
/** @ts-ignore @type {typeof __VLS_components.FDialogFooter | typeof __VLS_components.FDialogFooter} */
FDialogFooter;
// @ts-ignore
const __VLS_50 = __VLS_asFunctionalComponent1(__VLS_49, new __VLS_49({
}));
const __VLS_51 = __VLS_50({
}, ...__VLS_functionalComponentArgsRest(__VLS_50));
const { default: __VLS_54 } = __VLS_52.slots!;
let __VLS_55!: __VLS_WithComponent<'FButton', __VLS_LocalComponents, __VLS_GlobalComponents, void, 'FButton'>['FButton'];
/** @ts-ignore @type {typeof __VLS_components.FButton} */
FButton;
// @ts-ignore
const __VLS_56 = __VLS_asFunctionalComponent1(__VLS_55, new __VLS_55({
...{ 'onClick': {} as any },
label: "Close",
}));
const __VLS_57 = __VLS_56({
...{ 'onClick': {} as any },
label: "Close",
}, ...__VLS_functionalComponentArgsRest(__VLS_56));
let __VLS_60!: __VLS_ResolveEmits<typeof __VLS_55, typeof __VLS_58.emit>;
const __VLS_61: __VLS_NormalizeComponentEvent<typeof __VLS_59, typeof __VLS_60, 'onClick', 'click', 'click'> = (
{ click: {} as any } as typeof __VLS_60,
{ onClick: (__VLS_ctx.close)});
var __VLS_58!: __VLS_FunctionalComponentCtx<typeof __VLS_55, typeof __VLS_57>;
var __VLS_59!: __VLS_FunctionalComponentProps<typeof __VLS_55, typeof __VLS_57>;
// @ts-ignore
[close,];
var __VLS_52!: __VLS_FunctionalComponentCtx<typeof __VLS_49, typeof __VLS_51>;
// @ts-ignore
[];
var __VLS_15!: __VLS_FunctionalComponentCtx<typeof __VLS_12, typeof __VLS_14>;
// @ts-ignore
[];
var __VLS_9!: __VLS_FunctionalComponentCtx<typeof __VLS_6, typeof __VLS_8>;
// @ts-ignore
[];
var __VLS_3!: __VLS_FunctionalComponentCtx<typeof __VLS_0, typeof __VLS_2>;
type __VLS_TemplateRefs = {}
& { target: __VLS_Elements['div'] };
type __VLS_RootEl = 
| __VLS_Elements['div'];
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
});
export default {} as typeof __VLS_export;

