// Copied from vuejs/language-tools packages/language-core/types/template-helpers.d.ts
// Source: https://github.com/vuejs/language-tools
// License: MIT
//
// These types are used by the generated TypeScript code to provide type checking
// for Vue templates. They must match Volar's definitions exactly for compatibility.

/// <reference lib="es2015" />

declare global {
	const __VLS_directiveBindingRestFields: { instance: null; oldValue: null; modifiers: any; dir: any };

	type __VLS_Elements = __VLS_SpreadMerge<SVGElementTagNameMap, HTMLElementTagNameMap>;
	// Volar 2.2.x names (superset). __VLS_NativeElements replaces __VLS_Elements at
	// consumer sites; __VLS_intrinsicElements is a const value (not a `let` local).
	type __VLS_NativeElements = __VLS_SpreadMerge<SVGElementTagNameMap, HTMLElementTagNameMap>;
	type __VLS_IntrinsicElements = import('vue/jsx-runtime').JSX.IntrinsicElements;
	type __VLS_Element = import('vue/jsx-runtime').JSX.Element;
	type __VLS_GlobalComponents = import('vue').GlobalComponents;
	type __VLS_GlobalDirectives = import('vue').GlobalDirectives;
	const __VLS_intrinsicElements: __VLS_IntrinsicElements;
	type __VLS_IsAny<T> = 0 extends 1 & T ? true : false;
	type __VLS_PickNotAny<A, B> = __VLS_IsAny<A> extends true ? B : A;
	type __VLS_SpreadMerge<A, B> = Omit<A, keyof B> & B;
	// Volar 2.2.x __VLS_WithComponent (6 params, no GlobalComponents param — it
	// references the embedded-scope __VLS_GlobalComponents internally). The
	// `N1 extends N0 ? Pick<…> : {…}` refinement breaks the generic-component
	// inference circularity (the `row` TS7022 false positive).
	type __VLS_WithComponent<
		N0 extends string,
		LocalComponents,
		Self,
		N1 extends string,
		N2 extends string,
		N3 extends string,
	> = N1 extends keyof LocalComponents ? N1 extends N0 ? Pick<LocalComponents, N0 extends keyof LocalComponents ? N0 : never> : { [K in N0]: LocalComponents[N1] }
		: N2 extends keyof LocalComponents ? N2 extends N0 ? Pick<LocalComponents, N0 extends keyof LocalComponents ? N0 : never> : { [K in N0]: LocalComponents[N2] }
		: N3 extends keyof LocalComponents ? N3 extends N0 ? Pick<LocalComponents, N0 extends keyof LocalComponents ? N0 : never> : { [K in N0]: LocalComponents[N3] }
		: Self extends object ? { [K in N0]: Self }
		: N1 extends keyof __VLS_GlobalComponents ? N1 extends N0 ? Pick<__VLS_GlobalComponents, N0 extends keyof __VLS_GlobalComponents ? N0 : never> : { [K in N0]: __VLS_GlobalComponents[N1] }
		: N2 extends keyof __VLS_GlobalComponents ? N2 extends N0 ? Pick<__VLS_GlobalComponents, N0 extends keyof __VLS_GlobalComponents ? N0 : never> : { [K in N0]: __VLS_GlobalComponents[N2] }
		: N3 extends keyof __VLS_GlobalComponents ? N3 extends N0 ? Pick<__VLS_GlobalComponents, N0 extends keyof __VLS_GlobalComponents ? N0 : never> : { [K in N0]: __VLS_GlobalComponents[N3] }
		: { [K in N0]: unknown };
	type __VLS_PickFunctionalComponentCtx<T, K> = NonNullable<__VLS_PickNotAny<
		'__ctx' extends keyof __VLS_PickNotAny<K, {}> ? K extends { __ctx?: infer Ctx } ? Ctx : never : any,
		T extends (props: any, ctx: infer Ctx) => any ? Ctx : any
	>>;
	type __VLS_FunctionalComponentCtx<T, K> = __VLS_PickNotAny<
		'__ctx' extends keyof __VLS_PickNotAny<K, {}> ? K extends { __ctx?: infer Ctx } ? NonNullable<Ctx> : never : any,
		T extends (props: any, ctx: infer Ctx) => any ? Ctx : any
	>;
	type __VLS_FunctionalComponentProps<T, K> = '__ctx' extends keyof __VLS_PickNotAny<K, {}>
		? K extends { __ctx?: { props?: infer P } } ? NonNullable<P> : never
		: T extends (props: infer P, ...args: any) => any ? P
		: {};
	type __VLS_FunctionalComponent0<T> = (props: T extends { $props: infer Props } ? Props : {}, ctx?: any) => {
		__ctx?: {
			attrs?: any;
			slots?: T extends { $slots: infer Slots } ? Slots : Record<string, any>;
			emit?: T extends { $emit: infer Emit } ? Emit : {};
			props?: typeof props;
			expose?: (exposed: T) => void;
		};
	};
	type __VLS_FunctionalComponent1<T> = (
		props: (T extends { $props: infer Props } ? Props : {}) & Record<string, unknown>,
		ctx?: any,
	) => {
		__ctx?: {
			attrs?: any;
			slots?: T extends { $slots: infer Slots } ? Slots : Record<string, any>;
			emit?: T extends { $emit: infer Emit } ? Emit : {};
			props?: typeof props;
			expose?: (exposed: T) => void;
		};
	};
	type __VLS_IsFunction<T, K> = K extends keyof T ? __VLS_IsAny<T[K]> extends false ? unknown extends T[K] ? false
			: true
		: false
		: false;
	type __VLS_NormalizeComponentEvent<
		Props,
		Emits,
		onEvent extends keyof Props,
		Event extends keyof Emits,
		CamelizedEvent extends keyof Emits,
	> = (
		__VLS_IsFunction<Props, onEvent> extends true ? Props
		: __VLS_IsFunction<Emits, Event> extends true ? { [K in onEvent]?: Emits[Event] }
		: __VLS_IsFunction<Emits, CamelizedEvent> extends true ? { [K in onEvent]?: Emits[CamelizedEvent] }
		: Props
	) & Record<string, unknown>;
	// fix https://github.com/vuejs/language-tools/issues/926
	type __VLS_UnionToIntersection<U> = (U extends unknown ? (arg: U) => unknown : never) extends
		((arg: infer P) => unknown) ? P : never;
	type __VLS_OverloadUnionInner<T, U = unknown> = U & T extends (...args: infer A) => infer R ? U extends T ? never
		: __VLS_OverloadUnionInner<T, Pick<T, keyof T> & U & ((...args: A) => R)> | ((...args: A) => R)
		: never;
	type __VLS_OverloadUnion<T> = Exclude<
		__VLS_OverloadUnionInner<(() => never) & T>,
		T extends () => never ? never : () => never
	>;
	type __VLS_ConstructorOverloads<T> = __VLS_OverloadUnion<T> extends infer F
		? F extends (event: infer E, ...args: infer A) => any ? { [K in E & string]: (...args: A) => void }
		: never
		: never;
	type __VLS_NormalizeEmits<T> = __VLS_PrettifyGlobal<
		__VLS_UnionToIntersection<
			& __VLS_ConstructorOverloads<T>
			& {
				[K in keyof T]: T[K] extends any[] ? { (...args: T[K]): void } : never;
			}
		>
	>;
	type __VLS_EmitsToProps<T> = __VLS_PrettifyGlobal<
		{
			[K in string & keyof T as `on${Capitalize<K>}`]?: (
				...args: T[K] extends (...args: infer P) => any ? P : T[K] extends null ? any[] : never
			) => any;
		}
	>;
	type __VLS_ShortEmitsToObject<E> = E extends Record<string, any[]> ? { [K in keyof E]: (...args: E[K]) => any }
		: E;
	type __VLS_ResolveEmits<
		Comp,
		Emits,
		TypeEmits = Comp extends { __typeEmits?: infer T } ? unknown extends T ? {} : __VLS_ShortEmitsToObject<T> : {},
		NormalizedEmits = __VLS_NormalizeEmits<Emits> extends infer E ? string extends keyof E ? {} : E : never,
	> = __VLS_SpreadMerge<NormalizedEmits, TypeEmits>;
	type __VLS_ResolveDirectives<T> = {
		[K in keyof T & string as `v${Capitalize<K>}`]: T[K];
	};
	type __VLS_PrettifyGlobal<T> = { [K in keyof T]: T[K]; } & {};
	type __VLS_UseTemplateRef<T> = Readonly<import('vue').ShallowRef<T | null>>;
	const __VLS_placeholder: any;
	const __VLS_unref: typeof import('vue').unref;
	function __VLS_makeOptional<T>(t: T): { [K in keyof T]?: T[K] };

	function __VLS_vFor<T>(source: T): T extends number ? [number, number][]
		: T extends string ? [string, number][]
		: T extends (infer U)[] ? [U, number][]
		: T extends Iterable<infer V> ? [V, number][]
		: [T[keyof T], `${keyof T & (string | number)}`, number][];
	// @ts-ignore
	function __VLS_vSlot<S, D = void>(slot: S, decl?: D): D extends (...args: infer P) => any ? P : Parameters<__VLS_PickNotAny<NonNullable<S>, (...args: any[]) => any>>;
	// Volar 2.2.x v-for source resolver (two overloads) — replaces __VLS_vFor.
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
	// Volar 2.2.x functional component factory (ctor branch returns the __ctx shape
	// inline; fallback slots?: any). Replaces __VLS_asFunctionalComponent1.
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
	function __VLS_asFunctionalElement<T>(tag: T, endTag?: T): (attrs: T & Record<string, unknown>) => void;
	function __VLS_asFunctionalDirective<T, ObjectDirective>(
		dir: T,
		od: ObjectDirective,
	): T extends ObjectDirective ? NonNullable<
			T[keyof T & ('created' | 'beforeMount' | 'mounted' | 'beforeUpdate' | 'updated' | 'beforeUnmount' | 'unmounted')]
		>
		: T extends (...args: any) => any ? T
		: (arg1: unknown, arg2: unknown, arg3: unknown, arg4: unknown) => void;
	function __VLS_asFunctionalComponent0<T, K = T extends new(...args: any) => any ? InstanceType<T> : unknown>(
		t: T,
		instance?: K,
	): T extends new(...args: any) => any ? __VLS_FunctionalComponent0<K>
		: T extends () => any ? (props: {}, ctx?: any) => ReturnType<T>
		: T extends (...args: any) => any ? T
		: __VLS_FunctionalComponent0<{}>;
	function __VLS_asFunctionalComponent1<T, K = T extends new(...args: any) => any ? InstanceType<T> : unknown>(
		t: T,
		instance?: K,
	): T extends new(...args: any) => any ? __VLS_FunctionalComponent1<K>
		: T extends () => any ? (props: {}, ctx?: any) => ReturnType<T>
		: T extends (...args: any) => any ? T
		: __VLS_FunctionalComponent1<{}>;
	function __VLS_functionalComponentArgsRest<T extends (...args: any) => any>(
		t: T,
	): 2 extends Parameters<T>['length'] ? [any] : [];
	function __VLS_asFunctionalElement0<T>(tag: T, endTag?: T): (attrs: T) => void;
	function __VLS_asFunctionalElement1<T>(tag: T, endTag?: T): (attrs: T & Record<string, unknown>) => void;
	function __VLS_asFunctionalSlot<S>(slot: S): S extends () => infer R ? (props: {}) => R : NonNullable<S>;
	function __VLS_tryAsConstant<const T>(t: T): T;
}

export {};