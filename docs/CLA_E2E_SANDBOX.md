# CLA staging sandbox

STAGING ONLY. This private repository is where the Tavotto CLA staging service
(`https://cla-staging.tavotto.com`, App `erwanjun-cla-e2e-20261026`) is exercised
end to end. The agreements under `docs/legal/` are test texts: signing them in
staging has no legal effect and grants no rights.

- `.github/cla-policy.json` — the policy the staging service and CI consumer read
  from this repository's default branch. `provider.configured` is true here only.
- `.github/cla-e2e-fixture.json` — identity pins (repository, App, installation,
  holder) and the staging deployment coordinates. No secrets.

The staging runbook lives in the Tavotto repository under
`services/cla-cloudflare/deployment/staging/`. Merge queue cannot run in a
personal-account repository; that step uses a separate organization sandbox.
