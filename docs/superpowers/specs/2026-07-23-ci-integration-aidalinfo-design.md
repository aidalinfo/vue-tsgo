# Design — Intégration CI de vue-go-tsc pour l'org aidalinfo

**Date** : 2026-07-23
**Statut** : validé (en attente relecture)

## Contexte

Le fork `aidalinfo/vue-tsgo` doit être utilisable facilement sur les projets
Nuxt de l'org, et s'intégrer aux CI existantes. Aujourd'hui :

- Le package npm CLI (`cli/`) s'appelle `vue-tsgo` (nom déjà pris sur npm public)
  et son `install.js` télécharge le binaire depuis
  `github.com/nonfx/golar/releases` — URL morte pour ce fork.
- La CI du repo (`.github/workflows/ci.yml`) sert à builder/tester vue-tsgo
  lui-même ; `release.yml` publie binaires + npm + extension VS Code.
- Rien ne permet à un projet consommateur d'installer et d'exécuter l'outil.

### Conventions de l'org (relevées sur `powerpackages`, `irlscript`)

- **Runners `self-hosted`** partout ; **pnpm** via `pnpm/action-setup@v4`.
- Publication npm **pilotée par `publishConfig.registry`** du `package.json` :
  `registry.npmjs.org` → public (`NPM_TOKEN`), `npm.pulsemyit.fr` → interne
  (`INTERNAL_NPM_TOKEN`, Basic auth). Skip si la version existe déjà.
- **Pas de composite action ni de reusable workflow** : chaque projet a son
  propre `ci.yml` self-hosted et ajoute l'outil comme *devDependency* + un
  *step* `pnpm`. Les projets Nuxt vivent sous `app/<name>/` avec un step
  `pnpm -C app/<name> typecheck`.

## Décisions

| Sujet | Décision |
|-------|----------|
| Nom package npm | `vue-go-tsc` (public, non scopé, vérifié libre) |
| Registre | `registry.npmjs.org` via `publishConfig.registry` (secret `NPM_TOKEN`) |
| Distribution binaire | GitHub Releases de `aidalinfo/vue-tsgo` |
| Intégration CI | Pas de composite action — devDep + step `pnpm` dans le `ci.yml` du projet |
| VS Code Marketplace | Désactivé (compte upstream, hors périmètre) |
| Mode type-check Nuxt | Les deux documentés (`nuxt prepare` + `-p .nuxt/tsconfig.json`, et `-b --noEmit`) |

## Volet A — Rendre `vue-go-tsc` consommable

### A1. Package CLI (`cli/`)

- `package.json` : `name` → `vue-go-tsc`, ajouter
  `"publishConfig": { "registry": "https://registry.npmjs.org/" }`, garder
  `bin.vue-go-tsc` → `./bin/vue-tsgo` (ou renommer le binaire wrapper ; nom du
  bin exposé = `vue-go-tsc`). Mettre à jour `repository`/`homepage`/`bugs` vers
  `aidalinfo/vue-tsgo`.
- `install.js` : `downloadUrl` → `https://github.com/aidalinfo/vue-tsgo/releases/download/v${PACKAGE_VERSION}/${platformBinary}`.
  Messages d'erreur (URL manuelle) mis à jour de même. `PLATFORM_MAP` inchangé.
- `bin/vue-tsgo` : logique inchangée (forward des args au binaire `tsgo`).
  Le nom de fichier peut rester, seul le nom de commande exposé change.
- `cli/README.md` : install + usage sous le nouveau nom.

### A2. Workflow `release.yml`

- **`build-binaries`** : inchangé (matrice GitHub-hosted linux/darwin/windows ×
  amd64/arm64 — nécessaire pour macOS/Windows, gratuit sur repo public).
- **`create-release`** : notes de release mises à jour (nom `vue-go-tsc`, URLs
  `aidalinfo`). Les binaires restent attachés à la release du tag.
- **`publish-npm`** : réécrit selon la convention powerpackages :
  - lit `name`/`version`/`registry` depuis `cli/package.json` ;
  - **skip** si `npm view vue-go-tsc@<version>` existe déjà ;
  - configure `~/.npmrc` avec `//registry.npmjs.org/:_authToken=${NPM_TOKEN}` ;
  - `npm publish --access public`.
  - Reste sur runner GitHub-hosted (repo public, cohérent avec build-binaries)
    — la convention *publishConfig-driven + skip-if-published* est ce qui est
    repris, pas l'exécuteur self-hosted.
- **`publish-marketplace`** : supprimé (ou step neutralisé). `release-summary`
  ajusté en conséquence (plus de ligne marketplace).

### A3. Docs référençant l'ancien nom + attribution

- `README.md`, `RELEASE.md`, `CHANGELOG.md` : commande/nom npm →
  `vue-go-tsc` là où c'est le nom public consommable. (Le binaire interne reste
  `tsgo` ; seul le package/commande npm change.)
- **Attribution amont** : ajouter en tête de `README.md` un encart clair
  indiquant que ce projet est un fork de `NikhilVerma/vue-tsgo` (lui-même issu
  de `nonfx/golar`), et que aidalinfo n'a fait quasiment aucune modification au
  cœur du projet — seulement l'adaptation de la distribution (nom npm
  `vue-go-tsc`, releases sur le fork) et de l'intégration CI. Tout le mérite
  technique revient à l'auteur amont.

## Volet B — Intégration CI Nuxt (`docs/integration.md`)

Nouveau document, aligné sur le style org (pas d'action réutilisable). Contenu :

1. **Installation dans un projet** : `pnpm add -D vue-go-tsc` (racine ou
   `pnpm -C app/<name> add -D vue-go-tsc`).
2. **Script package.json** : deux variantes documentées —
   - `"typecheck:vue": "nuxt prepare && vue-go-tsc -p .nuxt/tsconfig.json --noEmit"`
     (fiable, Nuxt 3 & 4, projet simple ou monorepo `app/<name>/`).
   - `"typecheck:vue": "vue-go-tsc -b --noEmit"` (build mode / project
     references, gros projets composites) — prérequis : tsconfig composite.
   - Quand choisir l'un ou l'autre.
3. **Wiring CI** : bloc `ci.yml` calqué sur `irlscript` —
   `runs-on: self-hosted`, `pnpm/action-setup@v4`, `setup-node` (`cache: pnpm`),
   `pnpm install --frozen-lockfile`, puis step
   `- name: Typecheck (vue-go-tsc)` → `pnpm -C app/<name> typecheck:vue`.
   Montrer l'insertion dans un job existant (remplacer/compléter le step
   `nuxt typecheck` actuel).
4. **Migration depuis `vue-tsc`/`nuxt typecheck`** : tableau de correspondance
   des commandes, différences connues (delta d'erreurs `.ts` upstream tsgo vs
   tsc mentionné dans le README), et recommandation de garder `nuxt typecheck`
   en parallèle pendant la période de bascule si besoin.
5. **Épinglage de version** : recommander une version exacte en devDep
   (reproductibilité CI), cohérente avec la release publiée.
6. **Dépannage** : postinstall qui échoue (proxy/registre), binaire absent
   (`vue-go-tsc --version`), plateforme non supportée.

## Hors périmètre

- Publication VS Code Marketplace sous un compte aidalinfo.
- Registre npm interne (`npm.pulsemyit.fr`) — on publie en public.
- Reusable workflow / composite action (rejeté : non conforme au style org).
- Modification de la CI de build/test interne (`ci.yml`) du repo — inchangée.

## Critères de succès

- `pnpm add -D vue-go-tsc` dans un projet Nuxt installe le binaire (postinstall
  télécharge depuis les releases `aidalinfo/vue-tsgo`) et `vue-go-tsc --version`
  répond.
- Un tag `vX.Y.Z` publie les binaires sur les Releases du fork **et**
  `vue-go-tsc@X.Y.Z` sur npm public, sans échec dû au marketplace.
- Un projet Nuxt de l'org peut ajouter un step de type-check dans son `ci.yml`
  existant en suivant `docs/integration.md`, sans composite action.
