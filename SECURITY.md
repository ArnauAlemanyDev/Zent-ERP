# Security policy

Zent ERP is a portfolio demonstration, intended for local use with synthetic data. It is not a production-ready service or a supported commercial product.

## Scope

Security reports concerning the current default branch are welcome. Historical versions and the unsigned demonstration installer do not receive a guaranteed maintenance commitment.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting for this repository when enabled (Security → Report a vulnerability). If unavailable, request a private reporting channel without publishing the vulnerability details. Do not include real customer records, credentials, JWTs, licence keys or other secrets in public issues. Include the affected component/version, impact, and minimal reproduction in a local test environment. No response-time SLA is promised.

## Safe local use

- Generate your own `.env` using `node scripts/configurar.mjs`; never commit it.
- Keep the API, portal and SQL Server on loopback; do not expose the demo to the Internet.
- Use synthetic records, and import spreadsheets only from trusted sources.
- The Windows executable is unsigned and needs the separately running backend and SQL Server.
- Review dependency updates and run regression tests before merging.

See [Security engineering and verification](docs/security/assessment.md) for implemented controls, test commands, residual risks and deployment limitations.
