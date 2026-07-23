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

---

## RÉSULTAT FINAL — cascade déroulée : 139 → 10 (cible vue-tsc = 6)

7 bugs CODEGEN/golar corrigés (aucun checker), tous prouvés (repro minimal +
byte-match Volar + net en baisse + vue-tsc d'accord), byte-match VERT, checker
tests VERTS, `internal/vue/tests` = 79 échecs env `node_modules` IDENTIQUES à la
base (0 régression). Commits sur `feat/volar-2.2-model` :

1. `6926254` helper `/` → `<vueDir>/.golar/` (import('vue/...') résout).  139→122
2. `58cb5fc` `__VLS_Props` extrait de `withDefaults(defineProps<T>())`.       122→111
3. `ded83a4` diags supprimés dans la région inference-only `new Comp({...})`.  111→60
4. `42d6901` `withDefaults` → `__VLS_WithDefaults` (props défautées non-opt).    60→45
5. `b105d2a` forwarding de slot dynamique `#[name]` + `<slot :name v-bind>`.    (prérequis)
6. `48d39fe` `type __VLS_Props` émis quand defineModel court-circuite l'extraction
   (générique + defineModel → T effacé → slot `row: any`).                      45→23
7. `d55f18a` camelisation des clés de slot-prop `<slot :foo-bar>` (kebab non
   quoté = soustraction → `Number`).                                            23→10

### Écart résiduel 10 vs 6 = MUR CHECKER (codegen byte-identique à Volar) :
- **4× TS2589** (AssetLeaseAssignmentSection, AssetModelForm, OrderLinkSection,
  PersonSelect) — instanciation trop profonde sur les **unions de routes Nitro**
  (issue connue du projet ; PersonSelect a même un `as string` qui satisfait tsc
  mais pas tsgo). golar & vue-tsc touchent des FICHIERS DIFFÉRENTS (golar rate
  OpportunitySelect que vue-tsc a) → divergence de limite de profondeur tsgo↔tsc.
- **1× TS2353** (MaintenanceKanban `:data-status` sur `<Sortable>`) — codegen
  byte-identique (`dataStatus:` camelisé comme Volar) ; tsc n'erre pas, tsgo si.
  Prouvé que ce n'est PAS l'excess-property-check (tsgo==tsc sur
  `{x} : {…} & Record<string,unknown>`) → le type tiers `Sortable` résout sans
  l'index signature chez tsgo. Résolution de type tiers, niveau checker.
- **TS2322=3** (server/lib/ai/aikit/*.ts) = dette réelle partagée avec vue-tsc.

Corriger l'écart demanderait de toucher la limite d'instanciation du checker
(risque de faux-accepts / boucles) ou la résolution de types tiers — hors
« fix codegen sûr ». Le codegen est convergé sur Volar.

---

## MISE À JOUR (session parité 11-vs-6) — tranché CODEGEN-vs-CHECKER : c'est le CHECKER, et le résiduel TS2589 est NON DÉTERMINISTE

État mesuré à `baaf924` : golar `app/pulse` = **11** (TS2589×7 + TS2322×3 + TS2353×1),
vue-tsc = **6** (TS2589×3 + TS2322×3). Superset confirmé. Aucun fix appliqué
(aucun fix SÛR n'existe — preuves ci-dessous). Instrumentation de diagnostic
ajoutée puis **revertée** (`git checkout` checker.go/relater.go) — arbre propre.

### 1. Les TS2589 « en trop » NE SONT PAS du codegen (preuve directe)
- **Trigger réel = valve `instantiationCount >= 5_000_000`** (PAS `depth==100`),
  à `depth≈8-12`. Instrumentation à `checker.go:instantiateTypeWithAlias`.
- **Type qui explose = la machinerie de scoring de routes nitropack** :
  `CalcMatchScore<MatchedKeys, Route, …>`, `MatchResult`, `MatchedRoutes`,
  `KeySeg`/`RouteSeg`/`RouteRest`, `Score`, template-literals
  `` `${KeySeg}/${KeyRest}` `` — enumération combinatoire large (trace : on voit
  `R extends "/api/workspace/assets/printing-tasks" ? …`). **Même famille que le
  fix TS2321 déjà accepté** (`a85f242`, nitropack `$Fetch<AllRoutes>` + tri de
  types STABLE de tsgo vs tri creation-order de tsc → tsgo instancie plus).
- **Le même code fetch en `.ts` pur ne déborde PAS** ; en `.vue` oui (le binding
  template USelectMenu `:items="options"` re-instancie le type de route).
- **DÉCISIF — Volar-codegen-through-tsgo déborde AUSSI** : le dump Volar 2.2.12
  auto-suffisant (helpers inline, renommés `__VLS2_`) posé dans app/pulse et
  type-checké par **tsgo** en ISOLATION → **TS2589 count=5_000_000 sur KeySeg**,
  identique à golar. Donc le codegen golar n'est PAS en cause : c'est tsgo qui
  sur-instancie les types de routes nitro. vue-tsc est « clean » uniquement parce
  qu'il tourne sur **TSC** (JS), qui converge sous 5M. (Le test « Volar dump dans
  le projet complet = pas de 2589 » était un faux négatif : collision
  `declare global` → helpers empoisonnés en error-type, court-circuitant
  l'instanciation. En isolation renommée, Volar déborde.)

### 2. Le résiduel TS2589 est NON DÉTERMINISTE (le « 4 en trop » n'existe pas comme liste stable)
5 mesures répétées (`baaf924`, binaire propre) : **toujours exactement 7 TS2589**,
mais **membres différents à chaque run** — 7 tirés d'un pool de ~15 composants
fetch-lourds tous collés à la valve 5M :
- **Toujours présents (100%) : EstablishmentSelect, PersonSelect, AppShell** ;
  OpportunitySelect quasi toujours. → ce sont les 3 (+Opp) que vue-tsc signale
  aussi (les « vraiment au-dessus » même pour tsc).
- **Rotatifs (varient par run)** : SupplierSelect, CompanyForm, AllocationsSection,
  OrderLinkSection, EstablishmentPicker, AssetLeaseAssignmentSection,
  AssetModelSelect, AssetServiceLinkSection, AssetAccountingSection,
  AssetSimulationSection, AssetSparePartInstancesSection, AssetSpecSchemaEditor,
  NotificationCenter, useActionCalendarExport, …
- **Cause** : tsgo type-check en CONCURRENCE ; la valve 5M s'appuie sur le
  compteur/caches GLOBAUX du checker → quels fichiers « trippent » dépend du
  scheduling. C'est pourquoi ce doc (§ précédent : AssetLeaseAssignmentSection,
  AssetModelForm, OrderLinkSection, PersonSelect) et le brief lead (PersonSelect,
  SupplierSelect, CompanyForm, AllocationsSection) listaient des fichiers
  DIFFÉRENTS : chacun a capturé un run différent.

### 3. Pourquoi AUCUN fix checker SÛR n'atteint la parité exacte
- **On ne peut PAS distinguer « vrai » de « en trop »** : EstablishmentSelect
  (vrai, vu par vue-tsc) et PersonSelect (en trop) trippent par la **MÊME valve
  COUNT=5M**. Seul `AppShell` tripe par `depth==100`. Supprimer la valve COUNT
  retirerait AUSSI Establishment/Opportunity (vrais) → parité CASSÉE dans l'autre
  sens (golar tomberait à 1 TS2589 vs 3).
- **Relever la limite 5M** ferait converger tsgo comme tsc pour les marginaux,
  mais (a) risque perf/hang GLOBAL sur tout TS (valve de sécurité), (b) ferait
  probablement passer aussi les 3 vrais → encore parité cassée, (c) interdit par
  les garde-fous (preuve de non-régression infaisable).
- Le seul « vrai » fix = faire instancier tsgo AUSSI PEU que tsc sur le
  scoring nitro (tri creation-order / caching convergent) = le bug amont
  #929/#1730/#4465, réécriture checker lourde et risquée. Hors « codegen sûr ».

### 4. TS2353 (MaintenanceKanban `:data-status`) = checker aussi, non trivialement reproductible
- Codegen **byte-identique** golar/Volar (`dataStatus: (status)` camelisé pareil).
- `Sortable` (sortablejs-vue3) est un **composant fonctionnel générique**
  `<GItem>(props: {…} & VNodeProps & AllowedComponentProps & ComponentCustomProps)`
  SANS index-signature ni `dataStatus`. Strictement `dataStatus` EST en trop ;
  tsc ne le signale pourtant pas, tsgo si → divergence d'excess-property-check
  sur props de composant générique.
- **Repro minimale (générique + `new C({… dataStatus})`) : tsgo == tsc** (les
  DEUX signalent). Donc la divergence réelle est une interaction plus profonde
  dans la machinerie `__VLS_asFunctionalComponent` + surcharges `__VLS_setup`/
  `expose` du Sortable générique — pas isolable minimalement, niveau checker.

### VERDICT
Codegen **convergé sur Volar** (byte-match maintenu, `volar_comparison` VERT).
Le résiduel 11-vs-6 est **100% checker** (sur-instanciation nitro + valve 5M
non déterministe ; excess-check générique), **irréductible sans changement
checker risqué et parité-cassant**. Gate (b) : l'acquis 200→11 (superset des 6
réels de vue-tsc, dont TOUJOURS les 3 TS2589 + 3 TS2322 signalés par vue-tsc)
reste mergeable ; la parité EXACTE 6 n'est pas atteignable en fix sûr.
