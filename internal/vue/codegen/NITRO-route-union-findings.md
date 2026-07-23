# Route-union nitropack — origine, config, et pourquoi `apiFetch` est nécessaire

Investigation du dernier écart de parité (TS2321 + TS2589 sur les composants qui
font du `useFetch`/`$fetch`). Versions : Nuxt **4.5.0**, nitropack **2.13.4**
(= dernière publiée au moment de l'analyse).

## 1. D'où vient l'union
`.nuxt/types/nitro-routes.d.ts` (généré par nitro) augmente `nitropack/types` :
```ts
interface InternalApi {
  '/api/account/accept-cgu': { post: ... }
  ... // 846 routes
}
```
Le type `$Fetch` de nitropack score le littéral d'URL contre cette union :
```ts
type NitroFetchRequest =
  Exclude<keyof InternalApi, `/_${string}`|`/api/_${string}`>   // 846 clés
  | Exclude<FetchRequest, string> | (string & {})
type $Fetch = <T, R extends NitroFetchRequest, O extends NitroFetchOptions<R>>(
  request: R, opts?: O
) => Promise<TypedInternalResponse<R, T, ...>>   // MatchedRoutes<R>/AvailableRouterMethod<R>
```
Passer un littéral `'/api/...'` fait matcher `R` contre l'union de 846 clés via
`MatchedRoutes<R>` (matching récursif segment/template-literal). Sous le **tri
stable** de tsgo (STO), ce matching sur-instancie → **TS2321** (débordement
relation, depth 100) **et TS2589** (valve d'instanciation 5 000 000). tsc reste
juste sous les limites grâce à l'ordre de création ; tsgo juste au-dessus.

## 2. Contournement côté LIBRAIRIE (config) : AUCUN trouvé
- Pas d'option de config nitro/nuxt pour désactiver/alléger le typage des routes
  (recherche du schéma `NitroConfig`/`NitroOptions` : aucun `typedRoutes` /
  `generateTsConfig` / toggle `typescript` pertinent). `InternalApi` est généré
  inconditionnellement (c'est le mécanisme même du `$fetch` typé).
- **Déjà sur la dernière nitropack (2.13.4)** → pas de bump correctif disponible.
- Donc le seul levier « lib » restant est **upstream** : que nitro rende
  `MatchedRoutes`/`TypedInternalResponse`/le scoring **moins pathologique**
  (matching non-récursif, ou opt-out du typage). → sujet d'issue chez `unjs/nitro`
  (aucune issue existante à ce jour).

## 3. Pourquoi `apiFetch` est LE contournement consommateur (et marche)
`app/composables/useApiFetch.ts` :
```ts
export type FetchLike = (url: string, opts?: FetchOptions) => Promise<unknown>
export function apiFetch<T = any>(url: string, opts?: FetchOptions): Promise<T>
export function apiFetchWith<T = any>(fetchFn: FetchLike, url: string, opts?: FetchOptions): Promise<T>
```
`apiFetch` type l'appel comme `(url: string) => Promise<T>` — il **n'utilise
jamais** le type `$Fetch<NitroFetchRequest>` de nitro, donc **zéro scoring de
routes**. C'est pour ça qu'il évite l'explosion là où les autres formes échouent.

### ⚠️ `as string` seul NE suffit PAS pour `useFetch`/`useLazyFetch`
Vérifié : `useLazyFetch<T>('/api/x' as string, {...})` **erre quand même**
(TS2589 sur l'instanciation du composable lui-même — ses génériques touchent
l'union indépendamment de l'URL). Le `as string` ne suffit que pour un appel
`$fetch` direct. Pour les composables réactifs, il faut **convertir** :
```ts
// AVANT (explose) :
const { data } = useLazyFetch<T>('/api/x' as string, { query: computed(() => (...)) })
// APRÈS (bypass l'union) :
const { data } = useAsyncData('key', () => apiFetch<T>('/api/x', { query: {...} }),
  { server: false, watch: [search] })
```
Et pour un `requestFetch(...)` direct (typé `$Fetch<AllRoutes>`) : passer par
`apiFetchWith(requestFetch, url, opts)`.

## 4. Solution en DEUX parties (complémentaires, prouvé par mesure)
Le TS2321 et le TS2589 sont deux mécanismes distincts :

| Mécanisme | Fix | Où |
|---|---|---|
| **TS2321** (débordement relation, flood ~5900) | bail overflow unilatéral (`relater.go`) | **checker, notre fork** — indispensable, PAS faisable app-side (l'union arrive via le ctx VLS / globals Nuxt, pas les call-sites) |
| **TS2589** (valve d'instanciation 5M, ~4-7 composants) | conversion `apiFetch`/`apiFetchWith` | **app-side** (Pulse) |

Preuve : sur le checker Microsoft pristine (sans bail), convertir un composant en
`apiFetch` supprime bien son TS2589, mais le flood TS2321 reste (844/composant) →
le bail est requis. Avec bail + conversion : le composant tombe à **0 erreur**.

Non-déterminisme : ~15 composants « fetch-lourds » sont à la frontière 5M ; le
pool tourne. Convertir UN composant le nettoie mais le total TS2589 reste ~6 tant
que **tous** ne sont pas convertis. Convertir les ~15 fait aussi tomber les 3
TS2589 « réels » que **vue-tsc** signale (mêmes composants) → les deux outils → ~3.

## 5. Composants frontière à convertir (app-side)
Observés dans le pool TS2589 (rotatif) : `EstablishmentSelect`, `PersonSelect`,
`OpportunitySelect`, `SupplierSelect`, `AppShell`, `CompanyForm`,
`OpportunityDetailView`, `AllocationsSection`, `OrderLinkSection`,
`MaintenanceKanban`, + autres `*Select`/sections fetch-lourdes. Traitement :
`useFetch`/`useLazyFetch` → `useAsyncData(() => apiFetch(...))` ; `requestFetch(...)`
direct → `apiFetchWith(...)`. (Le CLAUDE.md de Pulse documente déjà la règle
`apiFetch` ; ces composants sont ceux qui ne l'appliquent pas encore, ou où le
`as string` ne suffisait pas.)

## 6. Ce que dirait Microsoft (précédents)
STO est un design **voulu** (RyanCavanaugh, #787) ; les types récursifs
pathologiques = responsabilité de la **lib** (#929 : TypeBox a corrigé ses types ;
#4465 : fermé **NOT_PLANNED** car « c'est le tri stable »). → une PR du bail
upstream serait probablement refusée ; le bon destinataire upstream est **nitro**.
