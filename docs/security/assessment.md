# Security engineering / Zent ERP

## Scope and evidence

Local portfolio demonstration, Windows x64, Node.js 24 and SQL Server 2022 Developer in Docker. Assessment date: 2026-11-26. This is a targeted hardening effort, not a penetration-test certification.

| Area | Implemented controls | Evidence |
| --- | --- | --- |
| S00 · Dependencies | Updated Electron, Electron Builder, Vite, Router and SheetJS; removed Nodemon; targeted Express `qs` override | Full npm audit reports reduced from 59 aggregate findings to 6 moderate findings (not necessarily distinct vulnerabilities). No high/critical findings in the last observed audit. |
| S01 · Authentication | Bounded per-IP/per-login-route rate limiter, credential shape validation, explicit HS256, no-store login responses | 6 unit checks; actual internal endpoint returned 401 for 10 invalid logins and 429 for the next. |
| S02 · API | Exact CORS allowlists, security headers, API no-store, bounded parser, safe parser errors, portal ticket validation | 8 unit checks; real HTTP headers and unapproved-origin rejection observed. |
| S03 · Authorization | Current database identity checked on authenticated requests; role/client association checks; fail-closed behavior | 9 unit checks and 9 successful local SQL/API integration checks, including tenant isolation and disabled accounts. |
| Logging | Structured startup messages and sanitized connection failures | 3 unit checks and successful backend startup. |
| S04 · Electron | Sandbox, context isolation, no Node integration in renderer, CSP, navigation/IPC/permission restrictions | 7 unit checks; hardened Windows executable built successfully. Complete manual feature regression still needs confirmation. |
| S05/S06 · Verification | Unified runner, HTTP checks, CI workflows, dependency update configuration | 33 unit tests, 22 HTTP checks and 9 SQL/API integration checks passed locally (64 total); hosted CI remains unverified. These results precede the final performance and portal login UI patches. |

## Reproduce checks

From the repository root, using Node.js 24:

```sh
node scripts/test-security.mjs
```

This runs unit tests without a database or credentials. Integration is explicitly opt-in: start the local demo infrastructure according to the README, use the generated demo accounts, and run:

```sh
node scripts/test-security.mjs --integration
```

Integration includes HTTP checks and the existing authorization fixture suite. It creates temporary synthetic database records, attempts to remove them even on failure, and can leave audit events. Do not run against real data. Allow the login limiter window to expire before repeatedly running these checks. Default local API ports 3001 and 8090 are required. No credentials or token values are printed by the new runner.

```sh
npm audit --prefix backend
npm audit --prefix frontend
npm audit --prefix portal
```

The GitHub workflow reports all severities and fails the full audit on high/critical findings; the production-only audit fails on moderate or higher. These thresholds do not hide moderate development findings. Electron is a development dependency for npm purposes but a shipped runtime, so the full audit matters. CI does not start SQL Server, run fixture tests, produce a release or install the Windows package. Dependabot proposes updates; they require review, not automatic merging.

## Residual risk and limitations

- **Packaging toolchain:** six moderate npm findings remain in the Electron Builder dependency chain because of minimatch ([GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)). Avoid untrusted packaging inputs. Do not downgrade to vulnerable older builder releases or force unvalidated major overrides to obtain a zero count. Recheck when compatible fixes arrive. Reassess before release; findings can change over time.
- **Session management:** JWTs can become usable again if a disabled account is reactivated before token expiry; the current check is not permanent token revocation. Browser-side token storage remains a concern in the event of script injection.
- **Rate limiting:** in-memory and reset on process restart; per-IP/route rather than a distributed account-level control.
- **Local transport:** loopback HTTP and local SQL transport are intended for the demo only. A deployment needs TLS, stronger secret management, network controls and a review of database privileges.
- **CORS:** origin restrictions are a browser defense, not authentication. Opaque `null` origins remain allowed for internal API requests from loopback for packaged Electron compatibility.
- **Input validation:** focused on reviewed routes; not a comprehensive schema validation or SQL injection assessment of every controller.
- **Electron:** inline styles remain allowed; development CSP accommodates Vite. Packaged UI navigation, barcode preview, external WhatsApp navigation, bulk license preview and imported synthetic licenses, running timer and session history were observed. Physical printing, barcode scanner hardware, clipboard and complete timer stop/pause/resume regression remain unverified. The redesigned portal login still needs a real sign-in retest. Installer is unsigned.
- **Infrastructure:** npm audits do not cover the Docker image, SQL Server configuration, operating system or all runtime attack paths. No public deployment or production security claim is made.

## Maintenance

Review weekly audit results, update lockfiles in reviewed pull requests and repeat unit, local integration and manual regression tests. Enable private vulnerability reporting in the repository settings. Revisit temporary overrides and residual findings periodically.
