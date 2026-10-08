# Security policy

## Supported versions

Security fixes are released for the latest minor version.

| Version | Supported |
|---|---|
| 0.1.x | ✅ |

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Report them privately through [GitHub security advisories](https://github.com/fintcore/corewatch/security/advisories/new). Include the affected version, a description, and steps or code to reproduce.

We aim to acknowledge reports within 3 business days and to share a fix timeline within 10 business days.

## Scope

Of particular interest:

- Personal data or credentials that reach a transport despite the default scrubbing.
- Ways an event or a crafted error can make the SDK throw into, or break, the host app.
- Issues in how the HTTP transport handles authorization headers.

The scrubbing is a safety net, not a guarantee: it matches key names, not values. See [Privacy](./docs/privacy.md) for what it does and does not cover.
