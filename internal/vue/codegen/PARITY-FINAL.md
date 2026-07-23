# Parité vue-tsgo ↔ vue-tsc — conclusion finale

## Résultat livré (sur `main`)
app/pulse : **200 → 11**. vue-tsgo est un **surensemble strict** de vue-tsc :
il signale **toutes** les erreurs réelles de vue-tsc (déterministe) + 5 faux
positifs, tous dans la famille route-union nitropack.

| | golar (main) | vue-tsc |
|---|---:|---:|
| TS2322 (dette réelle aikit) | 3 | 3 (identiques) |
| TS2589 (route-union deep) | 7 | 3 (golar ⊇ : les 3 réels + ~4 « frontière ») |
| TS2353 (Sortable, tiers) | 1 | 0 |
| **Total** | **11** | **6** |

## Migration codegen : FAITE et validée
Modèle Volar 2.2.x complet (`__VLS_ctx = InstanceType<__VLS_self>`,
`PickFunctionalComponentCtx`, `getSlotParams`, `getVForSourceType`,
`__VLS_dollars`, helpers 2.2.x). 10/11 fixtures byte-identiques à Volar 2.2.12.
`go test` checker + `volar_comparison` verts. Circularité slots (TS7022/TS2448)
+ toutes les régressions ctx/props/imports éliminées. Zéro régression.

## Pourquoi le 6 exact est irréductible (prouvé, pas supposé)
Le résiduel = **checker typescript-go**, pas golar (dump Volar nourri à tsgo en
isolation déborde aussi). Débogué avec instrumentation (`TSGO_DUMP_INST`, branche
`fix/nitro-instantiation`) + comparaison directe tsc 5.9.3 :

1. **Intrinsèque, pas de la redondance** : par statement qui trippe, 5 000 000
   worker-calls dont **~4,5 M états distincts (type+alias+mapper)** pour seulement
   ~1000–5000 expressions de types. Les caches content-keyed existent et marchent ;
   ils ne « hit » pas car le travail est génuinement distinct. Redondance ~9 %.
2. **tsc et tsgo instancient autant (~0,3 % d'écart)** sur fichier identique ; mêmes
   points de reset du compteur. tsgo ne parcourt aucune branche que tsc élague.
3. Les 4 TS2589 « en trop » = **effet de frontière** : une expression `useFetch`
   instancie ~4,5–5M → juste sous 5M chez tsc, juste au-dessus chez tsgo. Le
   non-déterminisme (membres rotatifs) vient du checking concurrent (jitter type-ids
   autour de 5M).
4. **Aucun fix sûr** : pas de court-circuit superflu ; un cache ignorant le mapper
   corromprait les types (faux-accept) ; relever/dé-globaliser la valve 5M = risque
   hang + gros refactor. Le vrai fix = réduire l'instanciation du scoring de routes
   comme tsc (racine amont #929/#1730/#4465, tri stable vs creation-order) = réécriture
   checker lourde, hors « fix sûr ».

## Statut d'usage
- **vue-tsgo = accélérateur rapide** (~119× vs vue-tsc), attrape 100 % des erreurs
  réelles → excellent pour un feedback local rapide.
- **Pas un gate strict** tant que la frontière 5M route-union n'est pas alignée
  (non-déterminisme sur ~4 composants fetch-lourds). **vue-tsc reste le gate CI.**
- Outillage laissé pour une reprise éventuelle : `TSGO_DUMP_OVERFLOW` (relater.go),
  `TSGO_DUMP_INST` (branche `fix/nitro-instantiation`), `cmd/dump-golar`, oracle
  `volar-2.2.12-reference/`, `gen-volar.cjs`.
