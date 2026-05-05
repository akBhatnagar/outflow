# Security Policy

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities. Instead, email the maintainer at the address listed on the GitHub profile, with:

- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested mitigation

We will acknowledge within 72 hours and aim to publish a fix or mitigation within 14 days for critical issues.

## Supported versions

Outflow is pre-1.0. Only the latest commit on `main` is supported with security fixes.

## Scope

In scope:

- Authentication and session bypass
- Privilege escalation across user accounts
- Sensitive data leakage (OAuth tokens, email content, billing data)
- Injection (SQL, prompt, header)
- SSRF, RCE, path traversal

Out of scope:

- Findings that require physical access to the user's device
- Social engineering of maintainers
- DoS / volumetric attacks against the demo deployment
- Findings against third-party services we depend on (report those upstream)
