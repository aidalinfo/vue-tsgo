# Intégration CI — `vue-go-tsc` sur les projets Nuxt (aidalinfo)

Ce guide explique comment brancher **`vue-go-tsc`** (le type-checker Vue natif,
alternative rapide à `vue-tsc`) dans un projet Nuxt de l'org et dans sa CI
GitHub Actions.

> `vue-go-tsc` est la redistribution npm de
> [`NikhilVerma/vue-tsgo`](https://github.com/NikhilVerma/vue-tsgo). Tout le
> mérite technique revient à l'auteur amont ; on ne change que le nom npm et le
> lieu de release.

## Pourquoi

- **~10-50x plus rapide** que `vue-tsc` (Go natif, pas de runtime Node).
- **Zéro delta d'erreurs sur les fichiers `.vue`** vs `vue-tsc` sur des projets
  réels. Un léger delta subsiste sur les `.ts/.tsx` (différences amont
  typescript-go vs tsc) — voir le [README](../README.md#error-parity).
- Idéal pour la CI : type-check en quelques secondes au lieu de minutes.

---

## 1. Installation dans le projet

`vue-go-tsc` s'installe comme dev-dependency. Son `postinstall` télécharge le
binaire natif correspondant à la plateforme depuis les
[Releases du fork](https://github.com/aidalinfo/vue-tsgo/releases).

```bash
# Projet mono-app (Nuxt à la racine)
pnpm add -D vue-go-tsc

# Monorepo (app sous app/<name>/, comme irlscript)
pnpm -C app/<name> add -D vue-go-tsc
```

> **Épinglez une version exacte** en CI pour la reproductibilité
> (`"vue-go-tsc": "1.2.3"`, pas `^1.2.3`).

Vérifier l'installation :

```bash
pnpm exec vue-go-tsc --version
```

---

## 2. Script de type-check

Ajoutez un script dans le `package.json` du projet. **Deux modes** selon le
projet — choisissez celui qui correspond.

### Mode A — `nuxt prepare` + tsconfig généré (recommandé par défaut)

Le plus fiable, fonctionne pour Nuxt 3 **et** Nuxt 4, projet simple ou app de
monorepo. Nuxt doit d'abord générer `.nuxt/tsconfig.json`.

```jsonc
{
  "scripts": {
    // remplace / complète `nuxt typecheck`
    "typecheck:vue": "nuxt prepare && vue-go-tsc -p .nuxt/tsconfig.json --noEmit"
  }
}
```

> Nuxt 4 génère plusieurs tsconfig (`.nuxt/tsconfig.app.json`,
> `.nuxt/tsconfig.server.json`, `.nuxt/tsconfig.node.json`). Pointez sur celui
> que votre `nuxt typecheck` utilise (généralement le tsconfig racine qui les
> référence). En cas de doute, utilisez le **Mode B**.

### Mode B — Build mode (`-b`) pour projets composites / monorepos

Pour les gros projets Nuxt avec *project references* (tsconfig composite).
C'est le mode utilisé pour le benchmark 706 fichiers du README.

```jsonc
{
  "scripts": {
    "typecheck:vue": "nuxt prepare && vue-go-tsc -b --noEmit"
  }
}
```

**Prérequis** : un `tsconfig.json` composite correctement configuré (project
references). Si `vue-go-tsc -b` ne trouve rien à checker, c'est que le tsconfig
n'est pas composite → utilisez le Mode A.

### Quel mode choisir ?

| Situation | Mode |
|-----------|------|
| Nuxt standard, une app | **A** |
| Nuxt 4, tsconfig multiples | **A** (pointez le tsconfig racine) |
| Monorepo avec project references | **B** |
| Gros projet, besoin de perf max | **B** |
| Doute / erreurs bizarres avec B | **A** |

---

## 3. Câblage CI (GitHub Actions, self-hosted)

Aligné sur la convention de l'org (cf. `irlscript`) : `runs-on: self-hosted`,
`pnpm/action-setup`, `setup-node` avec cache pnpm. On **ajoute simplement un
step** dans le job CI existant — pas de composite action, pas de reusable
workflow.

### Insertion dans un `ci.yml` existant

```yaml
jobs:
  ci:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      # ... vos steps existants (prisma, lint, etc.) ...

      # Type-check Vue/Nuxt avec vue-go-tsc (remplace `nuxt typecheck`)
      - name: Typecheck (vue-go-tsc)
        run: pnpm -C app/<name> typecheck:vue
```

Pour un projet mono-app (Nuxt à la racine), retirez le `-C app/<name>` :

```yaml
      - name: Typecheck (vue-go-tsc)
        run: pnpm typecheck:vue
```

### Exemple complet minimal

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  typecheck:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Typecheck (vue-go-tsc)
        run: pnpm -C app/<name> typecheck:vue
```

---

## 4. Migration depuis `vue-tsc` / `nuxt typecheck`

| Avant | Après |
|-------|-------|
| `vue-tsc --noEmit -p tsconfig.json` | `vue-go-tsc -p tsconfig.json --noEmit` |
| `vue-tsc -b --noEmit` | `vue-go-tsc -b --noEmit` |
| `nuxt typecheck` | `nuxt prepare && vue-go-tsc -p .nuxt/tsconfig.json --noEmit` |

**Période de bascule** : `vue-go-tsc` vise le zéro delta sur les `.vue`, mais un
léger delta subsiste sur les `.ts/.tsx` (amont typescript-go vs tsc). Si votre
CI est stricte, gardez temporairement `nuxt typecheck` en parallèle (job
non-bloquant `continue-on-error: true`) le temps de valider la parité sur votre
base, puis retirez-le.

---

## 5. Dépannage

| Symptôme | Cause probable / solution |
|----------|---------------------------|
| `postinstall` échoue au download | Pas d'accès à `github.com/aidalinfo/vue-tsgo/releases` depuis le runner (proxy/réseau). Vérifiez la sortie réseau du self-hosted runner. |
| `Unsupported platform` | Plateforme/arch non couverte (voir `os`/`cpu` du package). Plateformes supportées : linux/darwin/win32 × x64/arm64. |
| `vue-go-tsc: command not found` | Binaire non installé → relancez `pnpm install` ; testez `pnpm exec vue-go-tsc --version`. |
| `-b` ne remonte aucune erreur | tsconfig non composite → utilisez le **Mode A** (`-p .nuxt/tsconfig.json`). |
| Erreurs `.ts` inattendues vs `vue-tsc` | Delta amont typescript-go vs tsc (attendu). Voir la section Error Parity du README. |

---

## Voir aussi

- [README](../README.md) — présentation, perf, parité d'erreurs.
- [Releases du fork](https://github.com/aidalinfo/vue-tsgo/releases) — binaires + versions npm.
- Amont : [NikhilVerma/vue-tsgo](https://github.com/NikhilVerma/vue-tsgo).
