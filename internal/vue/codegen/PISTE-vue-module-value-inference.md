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
