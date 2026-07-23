# Plan d'exécution — parité vue-tsgo ↔ vue-tsc (Volar 2.2.x)

> But : faire passer vue-tsgo de **199 erreurs → ~6** sur Pulse ERP (`app/pulse`,
> même tsconfig que vue-tsc). Les 199 sont des **faux positifs** (vue-tsc n'en
> voit aucun) dus à un modèle de codegen `__VLS_` plus ancien que Volar 2.2.12.
> Ce document est la checklist mécanique complète pour atteindre la parité.
> À lire avec `MIGRATION-volar-2.2.md` (deltas) dans le même dossier.

---

## 0. Métrique de succès & principe directeur

- **Succès** = `pnpm/tsgo --noEmit -p tsconfig.json` sur `app/pulse` ne produit
  plus que les erreurs que **vue-tsc** produit aussi (~6 : 3 `TS2589` sur des
  `*Select.vue`/`AppShell`, 3 `TS2322` dans `server/lib/ai/aikit/`). Zéro
  `TS7006`/`TS2448`/`TS7022`/`TS7053` résiduel.
- **Principe** : la parité = **le codegen de golar produit le MÊME code virtuel
  que Volar 2.2.12**, au caractère près, par fixture. Même code → mêmes types →
  mêmes diagnostics. On ne « corrige pas des erreurs » : on **converge le
  codegen** vers l'oracle.
- **Tout-ou-rien** : la Phase 2 (modèle ctx/self) est un bloc atomique. Prouvé
  9 fois : toute brique isolée régresse (démasquage en cascade). Ne PAS commiter
  d'état intermédiaire sur `main`/`integrate` — travailler sur branche.

---

## 1. Environnement (exact, avec pièges)

```bash
# Go 1.25+ requis (go.mod dit 1.25 ; le repo bascule via GOTOOLCHAIN auto)
export PATH=/usr/local/go/bin:$PATH; unset GOTOOLCHAIN
# /tmp est un tmpfs de 16G souvent saturé -> rediriger cache+temp du build
BD=/home/killian/.cache/tsgo-build; mkdir -p "$BD/tmp" "$BD/cache"
export TMPDIR="$BD/tmp" GOTMPDIR="$BD/tmp" GOCACHE="$BD/cache"

# Build binaire vue-tsgo (golar) :
go build -o "$BD/tsgo" ./thirdparty/typescript-go/cmd/tsgo
# Build l'outil de diff rapide (déjà dans le fork) :
go build -o "$BD/dump-golar" ./cmd/dump-golar

# Oracle Volar 2.2.12 (node, PAS bun/.reference qui clone master = mauvaise version) :
node <scratch>/gen-volar.cjs <fichier.vue>   # imprime la sortie Volar 2.2.12
```

**Pièges vérifiés :**
- `NODE_OPTIONS=--max-old-space-size=8192` obligatoire pour typechecker
  `app/pulse` (sinon OOM ~2GB).
- **Ne jamais laisser de `.golar.tsx` dans `app/pulse`** : `TSGO_DUMP_VUE_TS`
  écrit ces dumps à côté des sources ; ils sont ensuite type-checkés et
  **polluent la mesure** (+18 erreurs fantômes). `find app/pulse -name '*.golar.tsx' -delete` avant chaque mesure.
- Toolchains Go 1.25.x déjà en cache dans `~/go/pkg/mod/golang.org/toolchain@*`.

---

## 2. L'oracle (référence à atteindre)

- 10 sorties Volar 2.2.12 déjà régénérées et commitées :
  `internal/vue/tests/volar_comparison/testdata/volar-2.2.12-reference/*.volar-2.2.12.ts`.
- Régénérer/étendre avec `gen-volar.cjs` (utilise le `@vue/language-core@2.2.12`
  installé du projet — la BONNE version).
- **Comparer hors bloc global** : le bloc `declare global {…}` (helpers) est
  inliné par Volar mais **embarqué** (`//go:embed`) par golar — choix
  d'archi légitime à conserver. Ne comparer que le **corps composant**
  (tout ce qui précède `declare global`). Fonction de découpe :
  `python3 -c "import sys;t=open(sys.argv[1]).read();i=t.find('declare global');print(t[:i] if i>0 else t)"`.

---

## 3. Phase 0 — Baseline (avant de toucher au code)

```bash
find app/pulse -name '*.golar.tsx' -delete
NODE_OPTIONS=--max-old-space-size=8192 "$BD/tsgo" --noEmit -p app/pulse/tsconfig.json > "$BD/baseline.txt" 2>&1
# histogramme par code :
python3 -c "import re,collections;c=collections.Counter(re.search(r'error (TS\d+)',l).group(1) for l in open('$BD/baseline.txt') if re.search(r'error TS',l));print(sorted(c.items(),key=lambda x:-x[1]),sum(c.values()))"
```
Attendu : total **199** (TS7006=79, TS2448=39, TS7022=38, TS7053=26, TS2589=6,
TS2322=3, TS1232=3, TS2307=2, TS2769=2, TS2353=1). Garder comme référence.

---

## 4. Phase 1 — Jeu de helpers Volar 2.2.x (`types/template-helpers.d.ts`)

Remplacer les shapes golar par les shapes Volar 2.2.12 (source :
`node_modules/.pnpm/@vue+language-core@2.2.12*/lib/codegen/globalTypes.js`,
bloc `declare global`). Points **déjà validés** :
- ✅ `__VLS_vSlot` → forme `__VLS_getSlotParams` :
  `Parameters<__VLS_PickNotAny<NonNullable<S>, (...args:any[])=>any>>`
  **avec `// @ts-ignore` mono-ligne devant** (sinon TS2344 sur la déclaration).
  DÉJÀ FAIT (`4b1d1ff`).
- `__VLS_FunctionalComponentCtx` → `NonNullable<__VLS_PickNotAny<… K extends {__ctx?: infer Ctx} ? Ctx : never …>>` (= `__VLS_PickFunctionalComponentCtx`).
- `__VLS_asFunctionalComponent1` → corps Volar (branche ctor renvoie
  `(props…) => import('vue/jsx-runtime').JSX.Element & { __ctx?: {slots?: K extends {$slots: infer S}?S:any; emit?:…; …} }` ; fallback `slots?: any`).
- `__VLS_WithComponent` → ajouter le refinement `N1 extends N0 ? Pick<…, N0> : {[K in N0]: …[N1]}` (garder le param `GlobalComponents` car le d.ts embarqué n'a pas `__VLS_GlobalComponents` en scope, contrairement à Volar qui inline).
- Ajouter/renommer : `__VLS_intrinsicElements`, `__VLS_NativeElements`,
  `__VLS_asFunctionalElement` (sans le `1`), `__VLS_getSlotParams`,
  `__VLS_getVForSourceType` (2 surcharges, remplace `__VLS_vFor`).

⚠️ Ces changements de helpers **seuls** régressent (l'émission attend les
anciens noms/shapes). Ils DOIVENT être commités avec la Phase 3.

---

## 5. Phase 2 — Modèle ctx/self/export (`script.go`) — **BLOC ATOMIQUE**

Cible (voir `simple.vue` dans l'oracle) : remplacer le modèle
« spread » par le modèle « self + InstanceType ».

**Sites exacts dans `internal/vue/codegen/script.go` :**
- **Marqueurs** : ajouter `/* placeholder */` en tête du corps,
  `debugger/* PartiallyEnd: #3632/scriptSetup.vue */` après le contenu du
  script setup, `;/* PartiallyEnd: #4569/main.vue */` en fin.
- **`type __VLS_PublicProps = {};`** (Volar l'émet toujours).
- **ctx** (~L478-529, bloc `const __VLS_ctx = {\n …spreads… };`) →
  `const __VLS_ctx = {} as InstanceType<__VLS_PickNotAny<typeof __VLS_self, new () => {}>>` (+ ` & <css>` si `cssModulesObjectType() != ""`).
- **LocalComponents/Directives** (~L531-547) → `type __VLS_LocalComponents = & typeof __VLS_ctx;` (idem Directives). Supprimer `= __VLS_SetupExposed`.
- **`__VLS_SetupExposed`** (~L434-443) : supprimé — remplacé par le setup de `__VLS_self`.
- **`__VLS_dollars`** : émettre après le template
  ```
  type __VLS_Slots = {}; type __VLS_InheritedAttrs = {}; type __VLS_TemplateRefs = {};
  type __VLS_RootEl = | __VLS_NativeElements['<tag racine>'];
  var __VLS_dollars!: { $slots: __VLS_Slots; $attrs: import('vue').ComponentPublicInstance['$attrs'] & Partial<__VLS_InheritedAttrs>; $refs: __VLS_TemplateRefs; $el: __VLS_RootEl; } & { [K in keyof import('vue').ComponentPublicInstance]: unknown };
  ```
  ⚠️ **CPI→`unknown` UNIQUEMENT ici** (sur `$dollars`), **jamais** sur le ctx
  entier — c'est ce que j'avais reverté (`bc915b9`) ; Volar le confirme.
- **`__VLS_self`** (au site export, ~L573-714) :
  ```
  const __VLS_self = (await import('vue')).defineComponent({
    // + __typeProps/__typeEmits/props/emits selon defineProps/defineEmits/defineModel
    setup() { return { <chaque binding>: <binding> as typeof <binding>, }; },
  });
  export default (await import('vue')).defineComponent({ setup() { return {}; }, });
  ```
  Les bindings viennent de `c.bindingNames`. `__VLS_self` porte props/emits (via
  `__typeProps`/`__typeEmits`/`props`/`emits`) pour que `InstanceType<__VLS_self>`
  expose `$props`/`$emit`. C'est ce qui remplace les spreads `$props`/`$emit`
  actuels du ctx.
- **Chemin non-script-setup** (~L716-765) : a DÉJÀ une variante
  `__VLS_ctx = {} as InstanceType<…>` (L728) — l'aligner sur la même sortie.
- Le chemin **générique** (`hasGeneric`, ~L122-130 + L573-590) : le retour
  `__VLS_setup` doit exposer `slots: __VLS_Slots` / `emit: <réel>` (pas `{}`
  codé en dur, L584-585 actuel) — voir `MIGRATION-volar-2.2.md`.

---

## 6. Phase 3 — Factories & consommation composants (`template.go`)

**Sites exacts dans `internal/vue/codegen/template.go` :**
- **Valeur composant** (~L487-507) :
  `let __VLS_N!: __VLS_WithComponent<'tag', Local, Global, void, 'Cap'>['tag'];`
  → `const __VLS_N = ({} as __VLS_WithComponent<'tag', Local, void, 'Cap', 'Cap', 'Cap'>).tag;`
  (toujours 3 noms N1/N2/N3 ; forme `({} as T).tag`).
- **Factory composant** (~L521-533) : `__VLS_asFunctionalComponent1` →
  `__VLS_asFunctionalComponent`.
- **Ctx composant** (là où `var __VLS_N!: __VLS_FunctionalComponentCtx<…>`) →
  `__VLS_PickFunctionalComponentCtx<…>`.
- **Factory élément** : `__VLS_asFunctionalElement1(__VLS_intrinsics.X, …)` →
  `__VLS_asFunctionalElement(__VLS_intrinsicElements.X, …)`.
- **Events** (~L550-610) : le format objet est déjà proche ; s'assurer que
  l'emit se résout via `typeof ctx.emit` → `__VLS_NormalizeEmits` (modèle Volar),
  pas `__VLS_ResolveEmits`.
- **Slots** (~L640-666) : `__VLS_vSlot(slotVar!)` → `__VLS_getSlotParams(__VLS_thisSlot)`
  avec la var intermédiaire nommée `__VLS_thisSlot` (cosmétique mais requis pour
  le byte-match).
- **v-for** : `__VLS_vFor` → `__VLS_getVForSourceType`.

---

## 7. Phase 4 — Boucle de convergence (le cœur du travail)

Pour CHAQUE fixture de `testdata/volar-2.2.12-reference/` (ordre croissant de
complexité : `simple` → `v-if-else` → `props-emits` → `event-handlers` →
`component-props` → `dynamic-component` → `auto-imports-computed` →
`v-for-slots` → `global-components-slots` → `medium-complex`) :

```bash
F=internal/vue/tests/volar_comparison/testdata/exact-match/<fixture>.vue
strip(){ python3 -c "import sys;t=open(sys.argv[1]).read();i=t.find('declare global');print(t[:i] if i>0 else t)" "$1"; }
diff <(strip <("$BD/dump-golar" "$F")) <(strip <(node <scratch>/gen-golar-body.cjs "$F")) # ou la ref committée
```
- Corriger `script.go`/`template.go` jusqu'à **diff vide** (corps composant).
- Rebuild `dump-golar` après chaque correction (rapide, pas de typecheck).
- Passer à la fixture suivante seulement quand la précédente byte-matche.
- Régression tolérée sur les fixtures NON encore traitées (normal en cours de
  route) — c'est pourquoi on ne mesure la parité qu'à la fin.

Optionnel : dé-skipper `TestExactVolarMatch` (déjà présent,
`internal/vue/tests/volar_comparison/exact_match_test.go`) et l'adapter pour
comparer contre `volar-2.2.12-reference/` hors bloc global → gate automatique.

---

## 8. Phase 5 — Vérification finale sur Pulse

```bash
find app/pulse -name '*.golar.tsx' -delete
go build -o "$BD/tsgo" ./thirdparty/typescript-go/cmd/tsgo
NODE_OPTIONS=--max-old-space-size=8192 "$BD/tsgo" --noEmit -p app/pulse/tsconfig.json > "$BD/final.txt" 2>&1
# histogramme -> cible ~6, catégories = celles de vue-tsc
```
Comparer au run vue-tsc (`pnpm -C app/pulse exec vue-tsc --noEmit`). Les erreurs
restantes doivent être **exactement** celles de vue-tsc (dette réelle du projet),
zéro TS7006/TS2448/TS7022/TS7053.

Puis tests non-régression :
```bash
go test ./internal/vue/... ./thirdparty/typescript-go/internal/checker/...
# (les échecs 'node_modules: no such file' des fixtures vue-3.x sont pré-existants/env, pas la migration)
```

---

## 9. Pièges & apprentissages (9 expériences)

1. **Aucune brique isolée ne suffit** : helper seul, WithComponent seul, slots
   seul → tous régressent (199→207/215/218) par démasquage en cascade. Phase 2+3
   = **un seul commit**.
2. **`getSlotParams`/`vSlot` a besoin de `// @ts-ignore` mono-ligne** devant la
   déclaration (le `Parameters<union>` viole la contrainte → TS2344 sinon).
   Multi-ligne ne marche pas (l'`@ts-ignore` ne couvre que la ligne suivante).
3. **CPI→`unknown` seulement sur `$dollars`**, jamais sur le ctx (sinon 137
   faux `TS18046` — reverté `bc915b9`).
4. **Circularité `row` (TS7022)** : sur composant générique, `.slots['x-cell']`
   = `(props:{row:Row<T>})=>any` avec `T` inféré de `:data` ; le modèle golar
   crée une référence circulaire. Le modèle `InstanceType<__VLS_self>` de Volar
   la casse (inférence props/slots séparée). → c'est la Phase 2 qui règle ça.
5. **Mesure polluée** par les `.golar.tsx` laissés dans `app/pulse` : toujours
   les supprimer avant de mesurer.
6. **`__VLS_ctx = InstanceType<typeof __VLS_self>`** référence `__VLS_self`
   défini plus bas : OK (type hoisté), Volar fait pareil.
7. **UTable/DataTable ne sont ni ctor ni fonction** reconnue → tombent sur le
   fallback de `asFunctionalComponent1`. Le corps Volar de `asFunctionalComponent`
   (fallback `slots?: any`) est requis.
8. `dump-golar` ne type-checke pas → il valide la **structure** (byte-match),
   pas les types. La circularité ne se voit qu'au typecheck (Phase 5) — mais si
   le byte-match est atteint, les types suivent par construction.
9. **Branches git** : le travail vit sur `integrate` (poussé `aidalinfo/main`).
   `main` local suit l'upstream NikhilVerma — ne pas confondre.

---

## 10. Stratégie git

```bash
git checkout -b feat/volar-2.2-model integrate
# ... Phases 1+2+3 en un bloc cohérent, puis Phase 4 par fixture (1 commit/fixture) ...
# main/integrate restent à l'état vérifié (dc6eb6f) tant que la parité n'est pas atteinte
```
Ne fusionner dans `integrate`/`main` qu'après Phase 5 verte. `dump-golar` et cette
checklist restent sur `integrate` comme outillage.

---

## Résumé « prêt à dérouler »

1. Env (section 1) → build `tsgo` + `dump-golar`.
2. Baseline 199 (section 3).
3. Branche `feat/volar-2.2-model`.
4. **Un bloc** : helpers (P1) + ctx/self/export (P2) + factories/slots/events (P3).
5. Converger fixture par fixture avec `dump-golar` jusqu'au byte-match (P4).
6. Vérifier Pulse → ~6 (P5) ; tests ; merger.

État de départ garanti : TS2321 déjà à 0, `__VLS_vSlot` déjà aligné, oracle +
deltas + outil de diff déjà en place. Il reste P2+P3 (le gros bloc) + la
convergence P4.
