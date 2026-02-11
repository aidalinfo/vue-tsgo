/// <reference types="template-helpers.d.ts" />
/// <reference types="props-fallback.d.ts" />

import { ref } from "vue";

const props = defineProps({
	count: {
		type: Number,
		required: true
	}
});

const { count } = toRefs(props);
const localCount = ref(0);

const doubled = computed(() => count.value * 2);

watch(localCount, (newVal) => {
	console.log(newVal);
});

function increment() {
	localCount.value++;
}
// @ts-ignore
declare const { defineProps, defineSlots, defineEmits, defineExpose, defineModel, defineOptions, withDefaults, }: typeof import('vue');
type __VLS_SetupExposed = import('vue').ShallowUnwrapRef<{
doubled: typeof doubled;
increment: typeof increment;
count: typeof count;
localCount: typeof localCount;
}>;
const __VLS_ctx = {
...{} as import('vue').ComponentPublicInstance,
...{} as { $props: typeof props },
...{} as typeof props,
...{} as __VLS_SetupExposed,
};
type __VLS_LocalComponents = __VLS_SetupExposed;
type __VLS_GlobalComponents = import('vue').GlobalComponents;
let __VLS_components!: __VLS_LocalComponents & __VLS_GlobalComponents;
let __VLS_intrinsics!: import('vue/jsx-runtime').JSX.IntrinsicElements;
type __VLS_LocalDirectives = __VLS_SetupExposed;
let __VLS_directives!: __VLS_LocalDirectives & import('vue').GlobalDirectives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
...{ class: "counter" },
});
/** @type {__VLS_StyleScopedClasses['counter']} */;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
});
( __VLS_ctx.doubled );
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
...{ onClick: (__VLS_ctx.increment)},
});
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
count: (__VLS_ctx.count),
overlay: true,
}));
const __VLS_8 = __VLS_7({
count: (__VLS_ctx.count),
overlay: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_7));
const { default: __VLS_11 } = __VLS_9.slots!;
let __VLS_12!: __VLS_WithComponent<'FText', __VLS_LocalComponents, __VLS_GlobalComponents, void, 'FText'>['FText'];
/** @ts-ignore @type {typeof __VLS_components.FText | typeof __VLS_components.FText} */
FText;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent1(__VLS_12, new __VLS_12({
size: "medium",
}));
const __VLS_14 = __VLS_13({
size: "medium",
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
const { default: __VLS_17 } = __VLS_15.slots!;
( __VLS_ctx.localCount );
// @ts-ignore
[doubled,increment,count,localCount,];
var __VLS_15!: __VLS_FunctionalComponentCtx<typeof __VLS_12, typeof __VLS_14>;
// @ts-ignore
[];
var __VLS_9!: __VLS_FunctionalComponentCtx<typeof __VLS_6, typeof __VLS_8>;
// @ts-ignore
[];
var __VLS_3!: __VLS_FunctionalComponentCtx<typeof __VLS_0, typeof __VLS_2>;
type __VLS_RootEl = 
| __VLS_Elements['div'];
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
props: {
	count: {
		type: Number,
		required: true
	}
},
});
export default {} as typeof __VLS_export;

