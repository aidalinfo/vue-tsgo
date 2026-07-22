/* placeholder */
import { exactType } from '../shared';

let Foo: new () => { $props: { foo: (_: string) => void; }; };
let Bar: new () => { $props: { bar: (_: number) => void; }; };
debugger/* PartiallyEnd: #3632/scriptSetup.vue */
// @ts-ignore
declare const { defineProps, defineSlots, defineEmits, defineExpose, defineModel, defineOptions, withDefaults, }: typeof import('vue');
type __VLS_PublicProps = {};
const __VLS_ctx = {} as InstanceType<__VLS_PickNotAny<typeof __VLS_self, new () => {}>>;
type __VLS_LocalComponents = & typeof __VLS_ctx;
let __VLS_components!: __VLS_LocalComponents & __VLS_GlobalComponents;
type __VLS_LocalDirectives = & typeof __VLS_ctx;
let __VLS_directives!: __VLS_LocalDirectives & __VLS_GlobalDirectives;
const __VLS_0 = ((__VLS_ctx.Foo));
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
foo: (e => __VLS_ctx.exactType(e, {} as string)),
}));
const __VLS_2 = __VLS_1({
foo: (e => __VLS_ctx.exactType(e, {} as string)),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const __VLS_4 = ((Math.random() > 0.5 ? __VLS_ctx.Foo : __VLS_ctx.Bar));
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
foo: (e => __VLS_ctx.exactType(e, {} as string)),
}));
const __VLS_6 = __VLS_5({
foo: (e => __VLS_ctx.exactType(e, {} as string)),
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
const __VLS_8 = ((Math.random() > 0.5 ? __VLS_ctx.Foo : __VLS_ctx.Bar));
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
bar: (e => __VLS_ctx.exactType(e, {} as number)),
}));
const __VLS_10 = __VLS_9({
bar: (e => __VLS_ctx.exactType(e, {} as number)),
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
type __VLS_Slots = {};
type __VLS_InheritedAttrs = {};
type __VLS_TemplateRefs = {
};
type __VLS_RootEl = any;
var __VLS_dollars!: {
$slots: __VLS_Slots;
$attrs: import('vue').ComponentPublicInstance['$attrs'] & Partial<__VLS_InheritedAttrs>;
$refs: __VLS_TemplateRefs;
$el: __VLS_RootEl;
} & { [K in keyof import('vue').ComponentPublicInstance]: unknown };
const __VLS_self = (await import('vue')).defineComponent({
setup() {
return {
exactType: exactType as typeof exactType,
Foo: Foo as typeof Foo,
Bar: Bar as typeof Bar,
};
},
});
export default (await import('vue')).defineComponent({
setup() {
return {
};
},
});
;/* PartiallyEnd: #4569/main.vue */

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
