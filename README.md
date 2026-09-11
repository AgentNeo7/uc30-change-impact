# Salesforce AgentChangeImpact

Analyze two Salesforce DX source snapshots. Extract explicit Flow → custom field, Flow → subflow and Flow → Apex action dependencies, attach source locations, and map potential impact to declared Apex test classes. This replaces the generic Python graph prototype as the primary Salesforce implementation.

## Run locally

Requires Node.js 22+.

```sh
npm ci --ignore-scripts
npm test
npm run example
node src/cli.mjs --base examples/org-b/base --head examples/org-b/head --tests examples/org-b/tests.json
```

No Python runtime, org login, paid API or model is needed for the metadata analysis. The CLI reads real Salesforce DX metadata. It does not execute arbitrary Apex, Flow or agent instructions. Exit 0 means the advisory analysis completed, not that a change is safe; invalid input exits 2. Read `coverageGaps` and `fullSuiteFallback`.

## Native Salesforce fixture

The root `force-app` contains a custom object, Draft Flow, Apex query service and Apex test. API 64.0 is the declared initial compatibility target. In a connected Developer org, from this directory:

```sh
sf project deploy start --source-dir force-app --target-org eb1a-dev --dry-run --test-level RunSpecifiedTests --tests UC30_ReviewActionTest --wait 10 --json
```

A source conversion and local grammar checks do not establish successful compilation. Native results are recorded separately. The fixture does not activate a Flow or install an Agentforce agent. Example test maps include an unrelated control label used only for offline comparisons; native validation runs the actual named class above.

## Scope and comparison

`examples/protocol.json` freezes the comparison and negative controls. Two different object/field/Flow configurations supply original synthetic metadata and expected affected test IDs. `npm test` verifies these controls. Conventional reverse graph traversal is the baseline method. The measured local benefit is extracting graph edges from Salesforce files, not a claimed new selection algorithm or measured native runtime saving.

Unknown metadata, unresolved references, unsupported dependency surfaces, changed Apex bodies and unmapped changes retain the full declared suite. Supported-subset coverage is not exhaustive Flow analysis. Record variable references, formulas, dynamic Apex, sharing, Agentforce configuration and permissions need additional adapters/native tests. All original requirements remain only partially covered; see `module.json`.

Sources: [Flow metadata](https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_flow.htm), [secure Apex](https://developer.salesforce.com/docs/platform/lwc/guide/apex-security), [Salesforce deployment validation](https://developer.salesforce.com/docs/platform/salesforce-cli-reference/guide/cli_reference_project_deploy_validate.html). Vendor documentation is externally reported; the synthetic fixtures and review are AI-authored internal evidence.

## Distribution

Salesforce is the primary implementation. Historical Python source is under `legacy/python-prototype`. See `RELEASE_STATUS.md` and `SALESFORCE_VALIDATION.json`. Full acceptance remains partial.
