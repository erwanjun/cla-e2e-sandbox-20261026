# CLA isolated E2E sandbox

TEST ONLY. The documents in this repository are software test fixtures, not legal agreements. Do not sign or attest to them. They grant no rights and must never become production signing evidence.

The fixture version is 1.0 solely to exercise the unchanged native configuration validator. The policy hashes bind the exact TEST ONLY bytes. The explicit owner exemption pins erwanjun to GitHub account ID 88193520 in `.github/cla-e2e-fixture.json`; an exempt verdict is not a signed verdict. A non-exempt contributor must still be rejected while the provider is unconfigured. Mixed, empty and unresolved contributor sets remain fail-closed.

The App connectivity diagnostic produced a completed **neutral** Check, `CLA E2E connectivity (TEST ONLY)`, on the earlier PR head. It verified App authentication, scoped sandbox reads and Check write/readback. It did not accept a CLA signature, establish signing eligibility or enable a provider. A Check on an earlier head is not verification of this updated head.

The provider remains `configured: false`. All capability flags remain false; deployment origin, callback, database name/ID and reference SHA remain explicitly null. App/repository/installation/account IDs are previously verified identity pins, not deployment claims. No secrets, public service, callback, database binding, scheduled job or workflow is configured by this repository.

Run the offline regression against a trusted Tavotto checkout with Node 24 and Python 3:

```sh
node --experimental-strip-types tests/cla-policy-regression.mts --tavotto-root "$TAVOTTO_SOURCE"
```

The test imports the trusted native validator and signing guard and invokes the trusted Python CLA gate. It does not copy their implementations or use a mock success result. The `non-exempt-fixture` identity and neutral Check input are explicitly local counterexamples; no such GitHub account, commit, signature or Check is created. No credentials or network are used. Local results are not hosted CI, OAuth or full CLA end-to-end acceptance.

The original main branch and user README are outside this test change. No merge or production activation is authorized by this fixture.
