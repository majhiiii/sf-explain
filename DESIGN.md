# sf-explain: System Design

## 1. Purpose

`sf explain` is an **offline plugin for the Salesforce CLI**. Given the output of a failed `sf` command, it explains the likely cause and the fix, using community-maintained YAML rules.

Why it exists: workarounds for common failures are scattered across docs, known-issues pages, and GitHub issues, and developers only find them after hitting the problem. This tool puts that knowledge one command away, and lets anyone add a rule with a pull request.

### Non-goals (v1)

- No LLM or AI calls. No network access at runtime. No telemetry.
- No connection to a Salesforce org.
- No automatic fixing of the user's project.
- Not a replacement for `sf doctor` (which checks the CLI environment). `sf explain` explains _failures_.
- Deploy-speed profiling is a separate future feature ("why-slow"), not v1.

## 2. User experience

```
# Pipe JSON output from any sf command
sf project deploy start --json | sf explain

# Explain a saved result
sf explain --file deploy-result.json

# Explain pasted plain-text error output (lower confidence)
sf project deploy start 2>&1 | sf explain

# Stretch (M3): run the command and explain on failure
sf explain -- sf project deploy start --source-dir force-app
```

Illustrative output (content is a placeholder, real rules come from `rules/`):

```
Deploy failed: 2 problems found, 1 explained

1) <error summary>                                  rule: <rule-id>
   Likely cause:  <one or two sentences>
   Fix:           1. <step>
                  2. <step>
   Confidence: high   Source: <url>

2) <error summary>
   No matching rule. Want to add one? Run: sf explain --contribute
```

`--json` returns a stable, versioned schema (section 4.4) for use in CI.

Exit codes: `0` when analysis ran (whether or not a rule matched), nonzero for bad or empty input. An optional `--fail-on-unmatched` flag is allowed later.

## 3. Architecture

```
 stdin / --file / wrapped command
              |
      [1 Input adapters]   detect shape: deploy, test, scratch-org, generic error, plain text
              |
      [2 Normalizer]       -> Failure[]  (one common shape)
              |
      [3 Context probes]   optional, read-only: sfdx-project.json, scratch def, ...
              |
      [4 Matcher]          rules.json + Failure + probes -> ranked Match[]
              |
      [5 Renderer]         human output, or --json
```

Key principle: **adapters absorb the messy CLI output shapes; everything after step 2 only knows `Failure`.** When the CLI changes its output, only an adapter changes.

Suggested layout (adjust to what the scaffold generates):

```
src/
  commands/explain.ts
  adapters/        one file per input shape + detect.ts
  engine/          matcher.ts, scoring.ts, probes.ts
  rules/           loader.ts (reads dist/rules.json), schema.ts
  render/          human.ts, json.ts
  redact.ts
rules/             *.yml (the community-editable source of truth)
scripts/           build-rules.ts, validate-rules.ts
test/
  fixtures/        real, redacted sf outputs
  fixtures/rules/  per-rule positive and negative cases
messages/          markdown message files
```

## 4. Data contracts

### 4.1 Failure (normalized input)

```ts
interface Failure {
  source: 'deploy' | 'retrieve' | 'test' | 'scratch-org' | 'auth' | 'generic' | 'text';
  command?: string; // e.g. "project deploy start"
  name?: string; // CLI error name, if present
  code?: string; // platform status/error code, if present
  message: string; // the human message
  component?: { type?: string; name?: string };
  file?: string;
  line?: number;
  column?: number;
  exitCode?: number;
  raw: unknown; // original fragment, never printed unredacted
}
```

Capture the real shapes from live `sf --json` runs and store redacted fixtures. Do not trust memory for field names.

### 4.2 Rule (YAML, community-editable)

```yaml
id: scratch-communities-needs-sites # kebab-case, unique
title: Scratch org with Communities is not recognized by the CLI
status: draft # draft | verified
severity: error # error | warning | info
confidence: medium # low | medium | high
appliesTo: # optional bounds
  cliVersion: '>=2.0.0'
match:
  all:
    - field: source
      equals: scratch-org
    - field: message
      regex: '(?i)scratch org' # example only; real trigger comes from a captured fixture
when: # optional: project probes
  - probe: scratchDef.features
    includes: Communities
  - probe: scratchDef.features
    excludes: Sites
explain: >
  The scratch org definition requests Communities but not Sites. The CLI docs
  note that scratch orgs with Communities are sometimes not recognized, even
  though they appear in Dev Hub.
fix:
  - Add "Sites" to the features list in the scratch org definition file.
  - Delete and recreate the scratch org. Note this counts against daily scratch org limits.
sources:
  - url: https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_considerations.htm
    title: Limitations for Salesforce DX
tags: [scratch-org, communities]
```

This example is a **shape illustration**. Before shipping any rule, confirm the real trigger from a captured fixture and re-read the source.

Rule validation (JSON Schema or zod; ask before adding the dependency):

- `id` unique and kebab-case; `sources` has at least one URL; `confidence: high` requires `status: verified`.
- At least one positive and one negative fixture exists for the rule.

### 4.3 Match

```ts
interface Match {
  ruleId: string;
  failureIndex: number;
  score: number;
  confidence: string;
  why: string[];
}
```

`why` lists what matched ("message matched /…/", "scratchDef.features includes Sites"). Always show it. It lets users judge false positives.

### 4.4 JSON output (versioned)

```json
{
  "schemaVersion": 1,
  "analyzed": 2,
  "explained": 1,
  "results": [
    {
      "failure": { "source": "deploy", "message": "..." },
      "matches": [
        {
          "ruleId": "...",
          "title": "...",
          "explain": "...",
          "fix": ["..."],
          "confidence": "medium",
          "sources": [{ "url": "..." }],
          "why": ["..."]
        }
      ]
    }
  ],
  "unmatched": [{ "source": "deploy", "message": "..." }]
}
```

## 5. Rule engine

Matching fields: `source`, `command`, `name`, `code`, `message`, `component.type`, `file` (glob). Operators: `equals`, `contains`, `regex`, `glob`. Combine with `all` / `any`.

Scoring (simple, explainable; tune against fixtures):

- Base score by strongest matcher: `equals` on code or name = 1.0, `regex` = 0.8, `contains` = 0.5.
- +0.1 for each satisfied `when` probe condition.
- Cap by the rule's own `confidence`.
- Rank by score, then by number of conditions (more specific wins). Return the top 3 per failure.

Never present a low-confidence match as certain. Wording must reflect confidence ("likely", "possibly").

## 6. Context probes

Read-only, cheap, optional. Fail silently (a missing file is not an error).

- `sfdx-project.json` (package directories, `sourceApiVersion`)
- Scratch org definition files (`config/*.json`: features, settings)
- `.forceignore` presence
  Rules: only read inside the project root; short timeout; no execution of project code.

## 7. Rule lifecycle and CI

1. Author edits `rules/<id>.yml` and adds fixtures.
2. `validate-rules` checks the schema and fixture requirements.
3. `build-rules` compiles all YAML into `dist/rules.json` (with a checksum). **Runtime reads only the JSON.**
4. CI runs build, lint, unit tests, rule fixture tests, and NUTs.
5. A rule moves from `draft` to `verified` in a pull request after a reviewer re-checks the source.

Fixture test format: `test/fixtures/rules/<rule-id>/positive-1.json` must match; `negative-1.json` must not.

## 8. Performance, privacy, and packaging

**Performance budget (targets, measure them):** plugin adds negligible load time; `sf explain` on piped input with 100 rules finishes in well under 200 ms excluding any wrapped command. Lazy-load heavy modules.

**Privacy:** `redact()` strips usernames, emails, 15/18-character org IDs, instance URLs, access tokens and session IDs. Used before printing any quoted input and before generating contribution templates. Test it with realistic samples. Nothing is ever sent anywhere.

**Contributing a rule from the CLI (M4):** `sf explain --contribute` prints a redacted Failure and a prefilled rule skeleton for the user to paste into a GitHub issue. It does not open the network.

**Packaging:** published to npm; users install with `sf plugins install <package-name>`. Document in the README that unsigned third-party plugins may show a trust prompt (verify current behavior). Semver for the plugin; rules ship with the plugin version.

## 9. Testing strategy

- **Unit:** adapters, normalizer, scoring, redaction, schema validation.
- **Fixture-driven:** every rule against its positive/negative cases.
- **NUT** (`cli-plugins-testkit`): run `sf explain` end to end against saved fixtures; JSON output matches the schema.
- No test depends on a live org or the network.

## 10. Milestones (do one at a time; get approval between)

| #   | Milestone                | Done when                                                                                                                          |
| --- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| M0  | Scaffold                 | `sf dev generate plugin` project builds; CI runs; `sf explain --help` works via the dev bin                                        |
| M1  | Input and model          | Generic-error and plain-text adapters; Failure model; fixtures captured from real runs; `sf explain` prints the normalized failure |
| M2  | Rule engine              | Schema, validator, builder, matcher, scoring; 5 verified rules with fixtures; human and `--json` output                            |
| M3  | More adapters and probes | Deploy, test, and scratch-org adapters; read-only probes; the `--file` flag and the `-- <command>` stretch                         |
| M4  | Safety and contribution  | Redaction with tests; `--contribute`; CONTRIBUTING guide for rules                                                                 |
| M5  | Release                  | README with demo, 15-20 verified rules, CHANGELOG, npm publish v0.1.0                                                              |

## 11. Seed rule candidates (research each before writing)

Sourced from the official "Limitations for Salesforce DX" page and CLI issue tracker (confirm wording in the live source):

- Scratch org with Communities is not recognized, and the documented workaround is also listing Sites.
- Person Accounts enabled in scratch org, then deploy fails with an `Account.PersonAccount` RecordType "cannot be found" error. The docs list no workaround.
- Scratch org created but a setting fails, e.g. a settings file "not available for deploy for this API version".
- "duplicate value found: <unknown> duplicates value on record with id: <unknown>" (documented as a known issue).

From general experience, **unverified, treat as research tasks** and find an official source for each before writing the rule:

- No authorization found for an org alias, or no default target org set.
- Expired or invalid session / refresh token.
- Production deploy blocked by Apex code coverage requirements.
- "Dependent class is invalid and needs recompilation".
- Scratch org creation hits the daily or active scratch org limit.
- "Entity of type X named Y cannot be found" caused by a missing dependency in the deploy.

## 12. Risks and open questions

- **CLI output shapes vary** by command and version. Mitigation: adapters plus real fixtures, and `appliesTo` bounds on rules.
- **Rule rot** as the CLI changes. Mitigation: fixtures in CI, `appliesTo`, and the reviewer step for `verified`.
- **False positives.** Mitigation: confidence levels, the `why` list, and cautious wording.
- **Overlap with existing plugins** (for example, diagnostic commands in sfdx-hardis, and the built-in `sf doctor`). Before M2, spend an hour checking what they already explain, and position `sf explain` around what they do not.
- **Maintenance load.** The contribution flow in M4 is what keeps this alive.

## 13. Future (not v1)

- `sf why-slow`: deploy-time profiler (compile-on-deploy settings, large metadata, test selection).
- `--last`: explain the most recent deploy or test run automatically.
- Offline diagnostic reports with suggested remediation scripts.
- A shared rule registry updatable without a plugin release.
