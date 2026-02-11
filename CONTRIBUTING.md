# Contributing to vue-tsgo

Thank you for your interest in contributing to vue-tsgo! This guide will help you get started.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Running Tests](#running-tests)
- [Code Style Guidelines](#code-style-guidelines)
- [Submitting Changes](#submitting-changes)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)
- [Getting Help](#getting-help)

---

## 📜 Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

---

## 🚀 Getting Started

### Prerequisites

- **Go 1.25+** ([install](https://go.dev/doc/install))
- **Node.js 20+** for VS Code extension development
- **git** with submodule support
- **make** (optional, for convenience)
- **bun** for JavaScript package management

### Clone the Repository

```bash
git clone https://github.com/NikhilVerma/vue-tsgo.git
cd golar
git submodule update --init --recursive
```

### Apply Patches to typescript-go

```bash
cd thirdparty/typescript-go
git am --3way --no-gpg-sign ../../patches/*.patch
cd ../..
```

### Build the Project

```bash
# Using Makefile (recommended)
make build-binary

# Or manually
go build -o golar/tsgo ./thirdparty/typescript-go/cmd/tsgo
```

### Verify Installation

```bash
./golar/tsgo --version
```

---

## 🔧 Development Workflow

### Project Structure

```
golar/
├── internal/
│   ├── golar/          # Core Golar integration with typescript-go
│   ├── vue/            # Vue-specific parser, codegen, and tests
│   ├── mapping/        # Source-to-service position mapping
│   └── utils/          # Utilities (overlay VFS, etc.)
├── editors/vscode/     # VS Code extension
├── thirdparty/         # Git submodules (typescript-go, etc.)
├── patches/            # Patches applied to typescript-go
└── scripts/            # Build and release scripts
```

### Working on Vue Features

1. **Add tests first** in `internal/vue/tests/`
2. **Implement parser changes** in `internal/vue/parser/`
3. **Update codegen** in `internal/vue/codegen/`
4. **Run tests** to verify behavior
5. **Update documentation** (README, TODO, CLAUDE.md)

### Working on typescript-go Changes

Changes to `thirdparty/typescript-go/` require updating the patch file:

```bash
cd thirdparty/typescript-go
# Make your changes...
git add .
git commit --amend
git format-patch -1 HEAD -o ../../patches/
cd ../..
```

---

## ✅ Running Tests

### Run All Tests

```bash
# Using Makefile
make test

# Or manually
go test ./internal/vue/tests/... -v -count=1
```

### Run Specific Test

```bash
go test ./internal/vue/tests/... -run TestVModelBasic -v
```

### Run Volar Comparison Tests

First set up the reference implementation:

```bash
./scripts/setup-volar-reference.sh
```

Then run comparison tests:

```bash
go test ./internal/vue/tests/volar_comparison/... -v
```

### Test a Single .vue File

```bash
# Show AST
go run ./cmd/test_codegen path/to/file.vue

# Show generated TypeScript service code
go run ./cmd/test_codegen path/to/file.vue --service
```

---

## 📝 Code Style Guidelines

### Go Code

- **Follow Go conventions**: Use `gofmt` and `go vet`
- **Error handling**: Always check errors, don't ignore them
- **Naming**: Use `camelCase` for unexported, `PascalCase` for exported
- **Comments**: Document all exported functions and types
- **Testing**: Write table-driven tests when possible

### TypeScript/JavaScript (VS Code Extension)

- **Use TypeScript** for all new code
- **Follow ESLint rules** (configured in extension)
- **Prefer functional style** over imperative
- **Use async/await** over callbacks

### Vue Codegen

When modifying `internal/vue/codegen/`:

- **Match Volar output** as closely as possible
- **Preserve line counts** for accurate diagnostics
- **Add source mappings** for all generated expressions
- **Test across Vue versions** (3.2, 3.3, 3.4, 3.5, 3.6)

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add support for CSS v-bind()
fix: correct diagnostic position for v-for expressions
docs: update README with performance benchmarks
test: add tests for generic components
chore: update dependencies
```

---

## 🔀 Submitting Changes

### Pull Request Process

1. **Fork the repository** and create a feature branch:
   ```bash
   git checkout -b feat/my-feature
   ```

2. **Make your changes** following the code style guidelines

3. **Write tests** for your changes

4. **Run tests locally**:
   ```bash
   make test
   ```

5. **Commit your changes** with a clear message:
   ```bash
   git commit -m "feat: add support for X"
   ```

6. **Push to your fork**:
   ```bash
   git push origin feat/my-feature
   ```

7. **Open a Pull Request** with:
   - Clear description of changes
   - Link to related issues
   - Screenshots/examples if applicable
   - Test results

### PR Checklist

Before submitting, ensure:

- [ ] Tests pass (`make test`)
- [ ] Code follows style guidelines
- [ ] Documentation updated (if needed)
- [ ] CHANGELOG.md updated (for user-facing changes)
- [ ] No merge conflicts with `main`
- [ ] Commit messages follow Conventional Commits

---

## 🐛 Reporting Bugs

### Before Reporting

1. **Search existing issues** to avoid duplicates
2. **Test with the latest version** to see if it's already fixed
3. **Minimize the reproduction case** to the smallest example

### Creating a Bug Report

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.yml) and include:

- **Environment**: OS, Go version, Node version, vue-tsgo version
- **Reproduction**: Minimal `.vue` file that triggers the bug
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Screenshots**: If applicable
- **Error messages**: Full stack traces

---

## ✨ Requesting Features

### Before Requesting

1. **Check the roadmap** in [TODO.md](./TODO.md)
2. **Search existing feature requests** to avoid duplicates
3. **Consider if it fits the project scope** (type checking, not runtime)

### Creating a Feature Request

Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.yml) and include:

- **Use case**: Why is this feature needed?
- **Proposed solution**: How should it work?
- **Alternatives**: Other approaches considered
- **Volar compatibility**: Does Volar support this?

---

## 💬 Getting Help

### Questions and Discussions

- **GitHub Discussions**: [Ask questions](https://github.com/NikhilVerma/vue-tsgo/discussions)
- **Issue tracker**: For bugs only

### Documentation

- **Architecture**: [docs/architecture.md](./docs/architecture.md)
- **Development guide**: [AGENTS.md](./AGENTS.md)
- **Project internals**: [CLAUDE.md](./CLAUDE.md)

### Response Time

- We aim to respond to issues within 48 hours
- PRs are typically reviewed within 1 week
- Security issues are prioritized (see [SECURITY.md](./SECURITY.md))

---

## 🎯 Good First Issues

New contributors should look for issues labeled:

- `good first issue` — Simple, well-defined tasks
- `help wanted` — Issues where we'd appreciate community contributions
- `documentation` — Documentation improvements

---

## 🙏 Recognition

Contributors are recognized in:

- Release notes (CHANGELOG.md)
- README.md contributors section (auto-generated)
- Git commit history

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).

---

Thank you for contributing to vue-tsgo! 🚀
