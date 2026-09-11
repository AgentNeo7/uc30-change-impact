# UC30 — AgentChangeImpact

Declared dependency test selection; no novel method. This is a runnable local prototype with bounded checks. Full catalog requirements remain partial or unmet in `requirements.json`. It is not a production integration or differentiated-method release.

## Run

Requires Python 3.13; tested with `/opt/homebrew/bin/python3.13`. Uses only the standard library. From this directory:

```bash
python3.13 tool.py --input examples/input.json --output result.json
python3.13 test_tool.py -v
```

The reference input may intentionally return 1 for a declared failure. Exit 0 means a completed report, including an explicit unknown; it does not mean safety. Exit 1 means a configured check failed. Exit 2 means malformed input or an I/O failure. Output is deterministic JSON. Compare it with `examples/expected.json`. Reports never execute external actions.

## Inputs and checks

`examples/input.json` defines the supported explicit input contract. `examples/cases.json` contains 9 original synthetic scenarios with expected JSON frozen before implementation. Its hash is in `examples/manifest.json`. Tests compare full reports, exercise CLI exit codes, and reject four malformed inputs. `checks.json` preserves command, exit code, output and code hash. Tests passed locally; this tiny corpus is internal validation, not independent review or broad reliability evidence.

## Scope and limits

No native Salesforce parser or behavior tests in this standalone utility. Graph direction is consumer → dependency. Reachability is potential impact, not observed regression. Prior novel-method no-build remains.

Malformed-input checks cover only the tested shapes. This is not a hardened untrusted-input service. Input permissions and truth must be established by the caller. Do not supply production credentials. Examples contain synthetic data.

## Baseline and research decision

[Primary source](https://github.com/forcedotcom/sf-skills/blob/main/skills/agentforce-architecture-analyze/SKILL.md), accessed 2026-09-11. Official architecture analysis already exists; declared graph reachability is established, with no new-method claim. Publication date/version is unknown unless recorded in `capability.json`; live documentation or main-branch behavior must be pinned before integration. No external product was executed. This source is vendor/maintainer evidence, not independent recognition.

Prior comparative parity is preserved: no-build for a new method. This package exposes bounded existing review logic only.

## Release and attribution

This source preview contains local artifacts; no outreach occurred. MIT is applied to original code; full module release gates remain unmet. AI authored this code, tests and documentation. Balaji supplied priorities and constraints; no unobserved implementation work or external recognition is attributed to him. Before a broader release, assign a maintenance owner and address the original requirements and blockers individually.

## Correctness amendment — 2026-09-11

Unknown references or impacted nodes without a usable mapped test now select every declared test ID. `fallback_reasons` explains why; `unmapped_impacted` identifies uncovered nodes. A test mapped to a consumer covers its declared transitive dependencies for this selection model. An unmapped affected branch still triggers fallback. Cycles terminate. An empty test universe always reports unknown, including when no changes are declared. Full-suite selection does not establish that the suite is sufficient or that behavior was tested.

Version 1 fixtures/checks are preserved. Version 2 regression oracles preceded implementation changes and exposed the original missing fallback (`regression-before-fix.json`, exit 1). One fixture-authoring alias accidentally emptied the known-no-change test mapping; the post-fix failed run is preserved in `checks-v2-fixture-defect.json`. Version 3 corrects that input only, retaining version 2 files and unchanged expected result. All nine current scenarios and malformed CLI checks now pass (`checks.json`, exit 0). This fixture correction is not a method improvement.

## Bounded CLI input — 2026-09-11

The CLI reads at most 2,000,000 bytes and rejects JSON deeper than 32 levels, containers over 1,000 entries, duplicate object keys and nonfinite numbers. Output cannot resolve to the input file, including symlink or existing same-file aliases. These errors exit 2 before writing. Five test methods now include duplicate-key, nesting, byte/container-size, numeric-overflow and overwrite regressions. `checks-before-io-hardening.json` preserves earlier checks; `checks.json` records the new run and source hashes. Decision algorithms and frozen scenario fixtures did not change. These bounds do not constitute a general security audit.

## Source preview status

Experimental offline source; scoped tests passed, full original acceptance is incomplete. See [release status](RELEASE_STATUS.md), [checks](release-checks.json), [requirements](requirements.json) and [attribution](ATTRIBUTION.md). No production, independent-validation or differentiation claim.
