import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {test} from 'node:test';

// No credentials, network, Cloudflare calls, signature creation or GitHub writes.
// Supply a trusted Tavotto checkout; do not replace its validators with copies.
const option=(name:string,fallback?:string)=>{const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1];};
const tavotto=option('--tavotto-root',process.env.TAVOTTO_SOURCE);
assert.ok(tavotto,'Pass --tavotto-root pointing to a trusted Tavotto checkout');
const root=resolve(option('--policy-root',resolve(import.meta.dirname,'..'))!);
const fixture=JSON.parse(readFileSync(resolve(import.meta.dirname,'../.github/cla-e2e-fixture.json'),'utf8'));
const policy=JSON.parse(readFileSync(resolve(root,'.github/cla-policy.json'),'utf8'));
const {validateLive}=await import(pathToFileURL(resolve(tavotto,'services/cla-cloudflare/src/native/config.ts')).href);
const {LiveService}=await import(pathToFileURL(resolve(tavotto,'services/cla-cloudflare/src/native/service.ts')).href);
const native=()=>({...fixture.identity,...fixture.capabilities,policy:structuredClone(policy),
  // This reserved invalid origin and sentinel SHA exist only in offline tests.
  // Deployment origin/reference remain null in the committed fixture.
  origin:'https://cla-e2e.invalid',referenceSha:'a'.repeat(40),
  autoHolder:false,syntheticSigning:false,mockCheckPublishing:false});
const code=(e:unknown)=>(e as {code?:string})?.code;
test('native validator accepts compatible metadata with every capability off',()=>validateLive(native()));
test('owner immutable ID pin cannot be removed or changed',()=>{
  for(const pins of [{},{erwanjun:88193521}]){const c=native();c.exemptionIds=pins;
    assert.throws(()=>validateLive(c),e=>['exemptions_unpinned','exemptions_invalid'].includes(code(e)!));}
});
test('unsupported agreement version remains rejected',()=>{
  const c=native();c.policy.agreements.individual.version='test-only-20261026';
  assert.throws(()=>validateLive(c),e=>code(e)==='agreement_invalid');
});
test('unconfigured provider cannot enable publication',()=>{
  const c=native();c.githubEnabled=true;c.checkPublishingEnabled=true;
  assert.throws(()=>validateLive(c),e=>code(e)==='provider_unconfigured');
});
test('signing guard rejects even with valid compatible metadata',()=>{
  const service=new LiveService(native(),{} as never,{} as never,{} as CryptoKey);
  assert.throws(()=>service.signing(),e=>code(e)==='signing_disabled');
});
test('deployment remains explicitly unconfigured, not an invented live endpoint',()=>{
  assert.equal(fixture.testOnly,true);assert.equal(fixture.deployment.configured,false);
  for(const name of ['origin','callback','databaseName','databaseId','referenceSha'])assert.equal(fixture.deployment[name],null);
  assert.equal(fixture.deployment.evidenceKeyConfigured,false);assert.equal(fixture.deployment.oauthClientSecretConfigured,false);
  assert.ok(Object.values(fixture.capabilities).every(v=>v===false));
  assert.equal(policy.provider.configured,false);
  assert.equal(policy.provider.name,null);assert.equal(policy.provider.check_name,null);
});
const python=String.raw`
import copy, importlib.util, json, pathlib, sys
source, root = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
spec=importlib.util.spec_from_file_location("trusted_cla_gate",source/"scripts/ci/cla_gate.py")
gate=importlib.util.module_from_spec(spec);spec.loader.exec_module(gate)
policy=json.loads((root/".github/cla-policy.json").read_text())
gate.validate_policy(policy)
person=lambda login: {"login":login,"sources":["offline-test-fixture"]}
neutral=[{"name":"CLA E2E connectivity (TEST ONLY)","app":{"id":5480322,"slug":"erwanjun-cla-e2e-20261026"},"status":"completed","conclusion":"neutral"}]
result={"documents":gate.verify_documents(policy,root)}
for name, people, unknown in [
 ("owner",[person("erwanjun")],[]),
 ("non_exempt",[person("non-exempt-fixture")],[]),
 ("mixed",[person("erwanjun"),person("non-exempt-fixture")],[]),
 ("empty",[],[]),
 ("unresolved",[person("erwanjun")],[{"sha":"a"*40,"kind":"co-author","name":"Offline fixture","email":"unknown@example.invalid"}])]:
 result[name]=gate.decide("pull_request",policy,neutral,people,unknown)
bad=copy.deepcopy(policy);bad["agreements"]["individual"]["sha256"]="0"*64
result["bad_digest"]=gate.verify_documents(bad,root)
print(json.dumps(result))
`;
const gate=JSON.parse(execFileSync(process.env.PYTHON??'python3',['-c',python,resolve(tavotto),root],{encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}}));
test('trusted gate verifies exact TEST ONLY document bytes',()=>{
  assert.deepEqual(gate.documents,[]);
  for(const kind of ['individual','corporate']){
    const text=readFileSync(resolve(root,policy.agreements[kind].path),'utf8');
    assert.ok(text.includes('TEST FIXTURE — NOT A CLA'));
    assert.ok(text.includes('CLA_VERSION: '+policy.agreements[kind].version));
    assert.ok(text.includes('Do not sign or attest to it.'));
  }
});
test('owner is exempt, never reported as signed',()=>{
  assert.equal(gate.owner.status,'success');assert.equal(gate.owner.contributors[0].verdict,'exempt');
  assert.ok(!gate.owner.contributors.some((x:{verdict:string})=>x.verdict==='signed'));
});
test('unsigned non-exempt fixture is rejected despite neutral connectivity Check',()=>{
  assert.equal(gate.non_exempt.status,'failure');assert.equal(gate.non_exempt.contributors[0].verdict,'missing');
});
test('owner exemption cannot hide another non-exempt contributor',()=>{
  assert.equal(gate.mixed.status,'failure');
  assert.deepEqual(gate.mixed.contributors.map((x:{verdict:string})=>x.verdict),['exempt','missing']);
});
test('empty or unresolved contributor inputs stay fail-closed',()=>{
  assert.equal(gate.empty.status,'failure');assert.equal(gate.unresolved.status,'failure');
});
test('tampered agreement digest is rejected',()=>assert.ok(gate.bad_digest.length>0));

