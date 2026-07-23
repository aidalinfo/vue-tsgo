# Piste — dernier verrou parité : inférence générique niveau-valeur sur imports `.vue`

> État à `cb76bca` (branche `feat/volar-2.2-model`) : app/pulse **139** erreurs
> (baseline 200). Résiduel bloquant parité = **TS7006 (102) + TS7053 (26) = 128**.
> Ce document fige la localisation exacte du bug pour une reprise (session dédiée
> ou report upstream). NE PAS repartir de zéro — tout est narrowé ici.

## Ce que le bug N'EST PAS (écarté avec preuves)
- **Pas le checker** : nourrir le code généré EXACT (Child+Consumer `.golar.tsx`,
  byte-identique au pipeline) à tsgo en `.ts/.tsx` → `payload` **typé** correctement.
  Le checker type parfaitement le même code quand il vient d'un module `.ts`.
- **Pas les helpers / le codegen** : l'export enfant porte `__typeEmits`/`__typeProps`
  identiques à Volar ; 10/11 fixtures byte-match Volar 2.2.12.
- **Pas la classification d'extension** : fix tenté (enregistrer `.vue` dans
  `SupportedTSImplementationExtensions` + `supportedTSExtensionsForExtractExtension`,
  faire consulter `ExtraExtensions` à `ExtensionIsTs`, extension.go:28) →
  **n'a PAS corrigé** (toujours TS7006). Reverté.

## Matrice de reproduction (déterminante)
| Enfant | Consommateur | `payload` |
|---|---|---|
| `.vue` | `.vue` (pipeline réel) | **any** ❌ |
| `.ts`/`.tsx` (même contenu généré) | `.tsx`/`.ts` | typé ✅ |
| `.vue` | `.tsx` | **any** ❌ |
| `.ts` | `.vue` | typé ✅ |
→ **Le déclencheur est : l'ENFANT est un module `.vue`**, indépendamment du consommateur.

## Ce qui résout correctement (niveau TYPE) pour un enfant `.vue`
- `typeof Child` = `DefineComponent<__VLS_Props, …, { open: (payload:{id})=>any }, …>`
- `InstanceType<typeof Child>['$emit']` = `(event:"open", payload:{id})=>void`
- `typeof Child extends new(...args:any)=>any` → **IS_CTOR** (vrai)
- `K extends { $emit: infer E } ? E : any` (le conditionnel exact de
  `__VLS_asFunctionalComponent`, écrit à la main) → **typé**
- Accès direct : `new Child().$emit('WRONG')` → **TS2554** (donc `$emit` typé)

## Le point exact qui dégénère (niveau VALEUR)
L'appel généré `__VLS_asFunctionalComponent(Child, new Child({...}))` dégrade
`payload → any` **uniquement** quand `Child` vient d'un module `.vue`
(module `.ts` à contenu identique → typé). `K` est inféré depuis le 2ᵉ arg
`new Child({...})` ; l'instance/le type apparent de la valeur `.vue` en position
d'inférence générique dégénère, alors que le même type en position purement-type
résout bien.

## Hypothèse de travail pour la reprise
tsgo produit un **symbole de module distinct/instable** pour un `.vue` (fichier
virtuel golar) vs un `.ts` mis en cache → l'**apparent type / résolution de symbole
au niveau valeur** en inférence générique diffère. À investiguer dans
`thirdparty/typescript-go/internal/checker` (résolution du type apparent d'une
valeur importée depuis un module virtuel `.vue` en position d'inférence) et/ou
`internal/golar` (identité/stabilité du SourceFile + symbole de module pour `.vue`).

## Garde-fous pour toute tentative de fix (module-resolution = effets larges)
- Mesurer **TS7006 ET total** app/pulse (cible : TS7006/7053 → ~0, total → ~11).
- **Diff complet du set d'erreurs** avant/après (aucune nouvelle erreur ailleurs ;
  dette réelle vue-tsc TS2589=7 + TS2322=3 inchangée).
- `go test ./internal/checker/... ./internal/vue/... ./internal/golar/...` sans
  nouvel échec vs base (`TestExpressionMapper` échoue déjà sur base — ne pas compter).
- Comparer au set `pnpm -C app/pulse exec vue-tsc --noEmit` → preuve de parité.
- Revert au moindre faux-accept / effet de bord.

## Alternative si pas de fix sûr
Reporter en amont (microsoft/typescript-go ou vue-tsgo) comme limitation
« inférence générique niveau-valeur sur default-import d'un module `.vue` », avec
cette matrice comme repro. La migration codegen (200→139, modèle Volar 2.2.x,
circularité éliminée) reste un acquis mergeable indépendamment.

---

## MISE À JOUR (session dédiée) — hypothèse initiale INFIRMÉE, 2 causes réelles corrigées

**L'hypothèse « l'enfant est un module `.vue` » est FAUSSE.** Matrice re-testée
proprement : un `.ts` on-disk avec le code généré EXACT (même important `./Child.vue`)
type correctement `payload` ; le déclencheur réel est **le consommateur `.vue`**,
puis, plus profond, deux bugs distincts (aucun lié à l'inférence niveau-valeur sur
default-import) :

### Cause #1 (CORRIGÉE, commit 6926254) — helper d.ts monté à la racine `/`
`template-helpers.d.ts` overlayé à `/template-helpers.d.ts`. Les specifiers
`import('vue/jsx-runtime')` / `import('vue')` DANS le helper ne résolvent pas
depuis `/` (pas de `/node_modules`) → `__VLS_Element` = **error type** (pas juste
`any`). L'error type se propage par le retour ctor de `__VLS_asFunctionalComponent`
et **empoisonne les conditionnels** (`__VLS_IsAny<errorType>` = errorType, pas
true/false) → `__VLS_FunctionalComponentProps`/`PickNotAny` = errorType → param
handler `any` (TS7006/7053). Preuve : `import('vue/jsx-runtime').JSX.Element` écrit
directement dans un `.vue` = `Element` ; via le helper à `/` = error type.
**Fix** : référencer le helper depuis `<dirRésolvantVue>/.golar/` (walk-up comme
`resolveVueVersion`), servi par un `helperFS` (match suffixe `/.golar/<basename>`).
Effet : 139 → 122 (TS7006 102→83).

### Cause #2 (CORRIGÉE, commit 58cb5fc) — `__VLS_Props` non extrait pour `withDefaults`
`emitScriptSetupContentWithTypeExtraction` n'extrayait `type __VLS_Props = T` que
pour un `defineProps` initializer DIRECT. Pour `withDefaults(defineProps<T>(), d)`
l'alias n'était jamais émis alors que `__VLS_PublicProps = __VLS_Props` y référait
→ `__VLS_Props` = error type → `__typeProps` empoisonné → `InstanceType<Composant>`
(`$props`/`$emit`) = error type → tout handler/prop-callback sur un composant
`withDefaults` = `any`. Prouvé en programme MINIMAL (pas d'échelle). **Fix** :
déballer `withDefaults` vers le `defineProps` interne dans l'extraction.
Effet : 122 → 111 (TS7006 83→57).

### Cible réelle : `vue-tsc --noEmit` = **6** (TS2589=3 + TS2322=3), PAS 10.
(Le TS2589=7 de golar et le set exact divergent encore ; à converger.)

### CASCADE restante (≈111 → 6) — convergence codegen type Volar 2.2, PAS le checker
Chaque fix « démasque » la couche suivante (les expr. auparavant `any` se typent) :
- **TS7006 `(v)` ×47** : param d'une **prop fonction** (`:on-save="(v)=>…"` sur
  `InlineEditCell`, `withDefaults`). `__VLS_Props` est bien défini maintenant, mais
  le typage contextuel du param à travers l'objet-props généré `new __VLS_X({...})`
  dégrade encore → prochaine investigation.
- **TS18048 ×12** (`__VLS_ctx.height possibly undefined`) : les props avec défaut
  (`withDefaults`) ne sont pas rendues non-optionnelles dans le ctx du composant ;
  le `__defaults`/`__VLS_defaults` doit retirer `| undefined` (modèle Volar).
- **TS7053 ×26** : accès index-signature (slots UTable `#cell`), pattern distinct.
- Démasqués par les fixes : TS2769×2, TS2345×1, TS2538×1, TS2322 +1 — à trier
  (réels app vs faux positifs codegen) contre vue-tsc.
Outillage : `helperFS`, `resolveVueDir`, byte-match `volar_comparison` VERT,
`go test ./internal/checker/...` VERT, `go test ./internal/vue/tests/...` = mêmes
échecs env `node_modules` que la base (non liés).
