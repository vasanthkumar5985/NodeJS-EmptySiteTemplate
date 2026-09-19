# Salesforce Community Portal Test Agent

Playwright-based automation agent for Salesforce **Experience Cloud / Community** portals.

## What it tests

| Suite | Coverage |
| --- | --- |
| `smoke` | Portal home loads, login page reachable |
| `critical` | Community login, create case, search knowledge, logout |

## Quick start (local mock portal)

No Salesforce org required for the demo:

```bash
cp .env.example .env
npm install
npm run mock:portal
# in another terminal
npm test
```

## Point at a real Experience Cloud site

1. Copy `.env.example` → `.env`
2. Set:
   - `PORTAL_URL` — your community site URL (e.g. `https://yourdomain.my.site.com`)
   - `PORTAL_USERNAME` / `PORTAL_PASSWORD` — community user credentials
3. Optionally override login selectors if your login page is customized
4. Run:

```bash
npm run agent -- plan
npm run test:smoke
npm run test:critical
npm test
```

## Agent commands

```bash
npm run agent -- plan          # show planned coverage
npm run agent -- run           # run all suites
npm run agent -- run -s smoke  # smoke only
npm run agent -- run --headed  # watch the browser
npm run agent -- report        # latest markdown report
```

Reports land in `artifacts/test-runs/<timestamp>/` (`report.md`, `report.json`, failure screenshots).

## Project layout

```
agent/
  cli.js              # CLI entry
  config.js           # env-driven portal config
  runner.js           # Playwright orchestration
  reporter.js         # JSON/Markdown reports
  pages/community.js  # Experience Cloud page helpers
  suites/index.js     # smoke + critical suites
mock-portal/          # local stand-in for demo/CI without an org
```

## Notes for real Salesforce orgs

- Use a **sandbox** or dedicated test community user.
- Prefer stable selectors (`data-testid` via Experience Builder) when you control the site.
- Salesforce login pages use `#username`, `#password`, `#Login` by default; the agent already targets those.
- MFA / SSO may require additional setup (session cookies, connected app, or test-only IdP bypass).
