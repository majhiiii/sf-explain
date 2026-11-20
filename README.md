# sf-explain

[![CI](https://github.com/majhiiii/sf-explain/actions/workflows/test.yml/badge.svg)](https://github.com/majhiiii/sf-explain/actions/workflows/test.yml)
[![Version](https://img.shields.io/npm/v/sf-explain.svg)](https://npmjs.org/package/sf-explain)
[![License](https://img.shields.io/badge/license-BSD--3--Clause-blue.svg)](LICENSE.txt)

The missing **root cause analyzer and error explainer** for the Salesforce CLI (`sf explain`).

It analyzes failures from failed `sf` commands (deploy, retrieve, Apex tests, scratch orgs, auth, packaging), collapses cascading compiler noise, identifies the true root cause, and provides verified, actionable fixes with official documentation links.

Matching is powered entirely by **50+ community-maintained offline YAML rules** — **zero AI/LLMs**, **zero telemetry**, and **zero runtime network calls**.

---

## ⚡ The Difference: Standard `sf` vs. `sf explain`

> _"The Salesforce CLI already prints error messages — why do I need `sf explain`?"_

The Salesforce CLI tells you **what syntax token failed**, but dumps every secondary compiler cascade equally and gives cryptic one-liners for complex errors. `sf explain` is designed for the errors that waste 30 minutes of developer time:

| Problem Scenario                                                     | Standard Salesforce CLI (`sf`)                                                                                                                                    | With `sf explain`                                                                                                                                            |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Cascading Compiler Errors** (e.g. 1 syntax typo causing 46 errors) | Dumps **46 separate errors** across your terminal. Developers waste 20 minutes inspecting 45 false "variable does not exist" and "method already defined" errors. | **Collapses 46 errors into 1 Root Cause** (e.g. mismatched bracket on line 159) and hides 45 cascading noise errors. Fix 1 line, everything compiles.        |
| **Cryptic Auth & JWT Failures** (`INVALID_GRANT`, `invalid_client`)  | Outputs a generic one-line error: `INVALID_GRANT: expired or invalid assertion`.                                                                                  | Pinpoints the **4 real-world causes** (certificate expiration, clock drift, wrong username, Connected App pre-authorization) with step-by-step fix commands. |
| **Scratch Org Failures** (`SignupDuplicateSettingsSpecified`)        | Prints cryptic internal exception codes with no guidance.                                                                                                         | Tells you the **exact setting conflict** in `project-scratch-def.json` and what line to remove.                                                              |
| **Missing Schema & Metadata Dependencies**                           | Throws raw `FIELD_INTEGRITY_EXCEPTION` or `Cannot create Master-Detail`.                                                                                          | Explains the **deployment order requirement** (deploy as lookup first, populate parent IDs, convert to master-detail).                                       |
| **CI / CD Pipelines**                                                | Raw ASCII terminal tables dumped into runner logs that developers ignore.                                                                                         | `--summary` outputs **clean GitHub-flavored Markdown** with collapsible details directly into `$GITHUB_STEP_SUMMARY` or PR comments.                         |
| **Data Privacy & Leak Prevention**                                   | Logs expose local machine paths, developer usernames, emails, org IDs, and private tokens into CI logs.                                                           | **Automated offline redaction** of file paths, IP addresses, Named Credentials, private keys, and custom metadata (`*__c`) before printing.                  |

---

### Real-World Example: 46 Errors Collapsed to 1

#### ❌ What standard `sf` outputs:

```text
=== Deploy Errors (46) ===
ERROR: force-app/main/default/classes/B2BCreditLimitService.cls: Expecting '}' but was: ']' (159:10)
ERROR: force-app/main/default/classes/B2BCreditLimitService.cls: Unexpected token '='. (168:32)
ERROR: force-app/main/default/classes/B2BCreditLimitService.cls: Unexpected token '>'. (168:53)
ERROR: force-app/main/default/classes/B2BCreditLimitService.cls: Variable does not exist: hierarchyAccountIds (164:33)
ERROR: force-app/main/default/classes/B2BCreditLimitService.cls: Variable does not exist: res (176:13)
ERROR: force-app/main/default/classes/B2BCreditLimitService.cls: Variable does not exist: res.availableCredit (178:63)
... (40 more errors flooding your terminal)
```

#### ✅ What `sf explain` outputs:

```text
Analysis complete: 46 problems found (1 root cause, 45 cascading), 25 explained

1) Expecting '}' but was: ']'
   Location:    [REDACTED_PATH]\force-app\main\default\classes\B2BCreditLimitService.cls:159:10
   Rule:        apex-syntax-error
   Likely cause: The Apex compiler encountered a syntax or tokenization error in the source code.
   Fix:
                1. Check line 159 col 10 for mismatched braces {}, brackets [], or parentheses ().
                2. Check for typos, unexpected operators, or misplaced punctuation around the token.
                3. Ensure all statements terminate with a semicolon and string literals are closed.
   Confidence:  high   Source: https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_classes_defining.htm

   ⚠️  45 cascading errors hidden (run with --show-cascade to view all)
```

---

## 📦 Installation

Install directly into the Salesforce CLI:

```bash
sf plugins install sf-explain
```

> [!NOTE]
> When installing third-party plugins that are not signed by Salesforce, the CLI displays a trust confirmation:
> `This plugin is not digitally signed. Do you want to continue to install it? (y/n)`
> Press `y` to continue. You can add `sf-explain` to your `unsignedPluginAllowList.json` to prevent future prompts.

To link the repository locally for development:

```bash
git clone https://github.com/majhiiii/sf-explain.git
cd sf-explain
yarn install
yarn build
sf plugins link .
```

---

## 🚀 All Supported Commands & Usage Patterns

`sf-explain` works with any failing Salesforce CLI command through multiple invocation modes:

### 1. Command Wrapper Mode (Zero manual piping)

Prefix any `sf` command with `sf explain --`. It runs your command normally; if the command succeeds, it exits silently; if it fails, it intercepts the error and explains it immediately:

```bash
sf explain -- sf project deploy start --source-dir force-app
sf explain -- sf org create scratch -f config/project-scratch-def.json
sf explain -- sf apex run test --test-level RunLocalTests
sf explain -- sf org login jwt --client-id <id> --jwt-key-file <key> --username <user>
```

### 2. Pipe Plain Text from Terminal Output

Pipe stdout and stderr directly from any command:

```bash
sf project deploy start 2>&1 | sf explain
sf apex run test --code-coverage 2>&1 | sf explain
sf project retrieve start 2>&1 | sf explain
```

### 3. Pipe JSON Output

Pipe structured JSON from any `sf` command:

```bash
sf project deploy start --json | sf explain
sf org create scratch --json | sf explain
sf package version create --json | sf explain
```

### 4. Analyze a Saved Log or Result File

Read from an existing build artifact or failure log:

```bash
sf explain --file deploy-result.json
sf explain --file build-failure.log
```

### 5. Expand Cascading Errors (`--show-cascade`)

By default, cascading secondary compiler errors are collapsed under the root cause. Use `--show-cascade` to view every hidden error with its exact file and line number:

```bash
sf explain --file deploy-result.json --show-cascade
```

### 6. Filter by Severity Level (`--severity-threshold`)

Only analyze errors at or above a minimum severity level (`error`, `warning`, `info`):

```bash
sf explain --file deploy-result.json --severity-threshold error
```

### 7. Output Formatted Markdown for CI/CD (`--summary`)

Generate a structured GitHub-flavored Markdown report perfect for PR comments, Slack notifications, or `$GITHUB_STEP_SUMMARY`:

```bash
sf explain --file deploy-result.json --summary
```

### 8. Write Results Directly to File (`--output-file`)

Save the analysis directly to disk without shell redirects:

```bash
sf explain --file deploy-result.json --output-file results/analysis.md --summary
sf explain --file deploy-result.json --output-file results/analysis.json --json
```

### 9. CI Quality Gate (`--fail-on-unmatched`)

Exit with status code `1` if any error encountered does not have a matching rule (useful to ensure zero unexplained errors in release pipelines):

```bash
sf explain --file deploy-result.json --fail-on-unmatched
```

### 10. Local Debugging Without Redaction (`--no-redact`)

Sensitive identifiers (org IDs, usernames, tokens, local paths, custom metadata) are redacted by default. Disable redaction for local debugging:

```bash
sf explain --file deploy-result.json --no-redact
```

### 11. Generate a Community Rule Skeleton (`--contribute`)

Encountered an unexplained error? Generate an offline, sanitized YAML template ready for contribution:

```bash
sf project deploy start --json | sf explain --contribute
sf explain --file unknown-error.json --contribute
```

---

## 🛠️ CLI Flags Reference

| Flag                           | Short | Type      | Default | Description                                                                                             |
| ------------------------------ | ----- | --------- | ------- | ------------------------------------------------------------------------------------------------------- |
| `--file <path>`                | `-f`  | `file`    |         | Path to a file containing failed command output (JSON or text).                                         |
| `--summary`                    |       | `boolean` | `false` | Outputs compact GitHub-flavored Markdown highlighting root causes, collapsed cascades, fixes, and docs. |
| `--output-file <path>`         |       | `string`  |         | Writes analysis output (Markdown, text, or JSON) directly to a file on disk.                            |
| `--show-cascade`               |       | `boolean` | `false` | Displays all cascading and secondary compiler errors instead of collapsing them.                        |
| `--fail-on-unmatched`          |       | `boolean` | `false` | Exits with status code `1` if any failure has no matching rule. CI quality gate.                        |
| `--severity-threshold <level>` |       | `string`  | `error` | Filters failures by minimum severity (`error`, `warning`, `info`).                                      |
| `--contribute`                 | `-c`  | `boolean` | `false` | Generates a pre-filled, sanitized YAML rule template from the error output.                             |
| `--no-redact`                  |       | `boolean` | `false` | Disables automated redaction of sensitive identifiers (for local debugging only).                       |
| `--json`                       |       | `boolean` | `false` | Formats output as versioned JSON (`schemaVersion: 1`) for machine consumption.                          |

---

## 🤖 CI / CD Pipeline Integration

Integrate `sf-explain` into your continuous integration workflows to give developers instant, actionable PR feedback whenever builds fail:

### GitHub Actions Example

```yaml
name: Salesforce CI Pipeline
on: [pull_request]

jobs:
  validate-deployment:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Salesforce CLI & sf-explain
        run: |
          npm install -g @salesforce/cli
          echo "y" | sf plugins install sf-explain

      - name: Deploy to Scratch Org
        id: deploy
        run: sf project deploy start --dry-run --json > deploy-result.json
        continue-on-error: true

      - name: Explain Failures in Step Summary
        if: steps.deploy.outcome == 'failure'
        run: |
          sf explain --file deploy-result.json --summary >> $GITHUB_STEP_SUMMARY
```

---

## 🔒 Privacy & Security Guarantees

- **100% Offline Execution**: Does not make network calls, fetch remote URLs, or ping external servers.
- **Zero AI / LLM Calls**: All matching is deterministic via compiled YAML rules. Your proprietary code and schema never touch an AI API.
- **Automated Privacy Redaction**: Automatically redacts local machine path prefixes (`C:\Users\...`), IPv4 addresses, Named Credentials, private keys, JWT tokens, Salesforce org IDs, session tokens, and custom metadata (`*__c`, `*__r`, `*__mdt`).
- **Read-Only**: Inspects local project configuration (`sfdx-project.json`, `.forceignore`) in read-only mode to diagnose context. Never alters your source files.

---

## 🤝 Contributing Rules

Got an error that wasn't explained? Authoring rules takes less than 5 minutes:

1. Run the failing command into `--contribute`:
   ```bash
   sf explain --file failed-deploy.json --contribute
   ```
2. Copy the generated YAML skeleton into `rules/<rule-id>.yml`.
3. Provide positive and negative fixtures under `test/fixtures/rules/<rule-id>/`.
4. Run `yarn build && yarn test` to verify.
5. Open a pull request!

See [CONTRIBUTING.md](CONTRIBUTING.md) for full instructions and authoring standards.

---

## 📄 License

BSD-3-Clause. See [LICENSE.txt](LICENSE.txt) for details.
