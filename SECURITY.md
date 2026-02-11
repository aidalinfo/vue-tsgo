# Security Policy

## Supported Versions

We provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: **security@nonfx.dev**

Include the following information:

- Type of issue (e.g. buffer overflow, code injection, etc.)
- Full paths of source file(s) related to the issue
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### What to Expect

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days with preliminary assessment
- **Fix Timeline**: Critical issues patched within 14 days
- **Disclosure**: Coordinated disclosure after patch is available

### Public Disclosure

- We will acknowledge your contribution in the release notes (unless you prefer to remain anonymous)
- Please allow us time to fix the issue before public disclosure
- We follow a 90-day disclosure timeline for security issues

## Security Update Process

1. Security issue reported privately
2. Issue confirmed and assessed for severity
3. Fix developed and tested
4. Security advisory published (GitHub Security Advisories)
5. Patch released with updated binaries
6. Public disclosure with credit to reporter

## Scope

This security policy covers:

- **vue-tsgo CLI** - Binary security issues
- **VS Code Extension** - Extension vulnerabilities
- **Language Server** - LSP security concerns
- **Build Pipeline** - Supply chain security

Out of scope:

- Issues in user's Vue code (that's what vue-tsgo is designed to catch!)
- Third-party dependencies (report to upstream projects)
- VS Code itself (report to Microsoft)

## Security Best Practices

When using vue-tsgo:

- **Verify binaries**: Check SHA256 hashes from releases page
- **Use official sources**: Download from GitHub releases or npm only
- **Keep updated**: Run `vue-tsgo --version` and compare with latest release
- **Report suspicious activity**: If you suspect a compromised binary, report immediately

## Known Security Considerations

- **Arbitrary code execution**: vue-tsgo runs TypeScript type checking which inherently executes type-level code. Do not run vue-tsgo on untrusted codebases.
- **File system access**: The language server reads files in your workspace. Ensure your workspace is trusted.
- **Memory limits**: Set `GOMEMLIMIT` environment variable to prevent excessive memory usage.

## Contact

Security Contact: nikhilgotmail@gmail.com
Project Maintainers: https://github.com/NikhilVerma/vue-tsgo
