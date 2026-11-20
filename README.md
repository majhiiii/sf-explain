# sf-explain

[![CI](https://github.com/majhiiii/sf-explain/actions/workflows/test.yml/badge.svg)](https://github.com/majhiiii/sf-explain/actions/workflows/test.yml)
[![Version](https://img.shields.io/npm/v/sf-explain.svg)](https://npmjs.org/package/sf-explain)

An **offline Salesforce CLI plugin** (`sf explain`) that analyzes output from failed `sf` commands (deploy, retrieve, Apex test runs, scratch org creation, auth) and tells developers the likely cause and actionable fix.

Matching is powered entirely by **community-maintained YAML rules** — no LLMs, no AI APIs, and zero network calls at runtime.

---

## Why sf-explain?

Workarounds for common Salesforce CLI failures are scattered across documentation guides, known-issues pages, and GitHub issues. Developers usually only find them after hitting painful blockers. `sf-explain` puts verified knowledge one command away, and lets anyone contribute fixes via pull requests.

### Core Principles

- **100% Offline**: No network calls, telemetry, or analytics at runtime.
- **Privacy First**: Sensitive data (tokens, session IDs, org IDs, emails, instance URLs, home paths) are automatically redacted before printing.
- **Read-Only**: Inspects read-only local project files (`sfdx-project.json`, scratch definitions, `.forceignore`) to diagnose context, but never alters your project files.
- **Fast Startup**: Loads pre-compiled JSON rules in well under 200 ms.

---

## Installation

Install directly into the Salesforce CLI:

```bash
sf plugins install sf-explain
```

> [!NOTE]
> When installing third-party plugins that are not signed by Salesforce, the CLI may display a trust prompt:
> `This plugin is not digitally signed. Do you want to continue to install it? (y/n)`
> Press `y` to continue the installation.

To link the repository locally for development:

```bash
git clone https://github.com/majhiiii/sf-explain.git
cd sf-explain
yarn install
yarn build
sf plugins link .
```

---

## Usage

### 1. Pipe JSON output from any sf command

```bash
sf project deploy start --json | sf explain
```

### 2. Pipe plain-text error output

```bash
sf project deploy start 2>&1 | sf explain
```

### 3. Analyze a saved failure file

```bash
sf explain --file deploy-result.json
```

### 4. Run a command and explain on failure (wrapper mode)

```bash
sf explain -- sf project deploy start --source-dir force-app
```

### 5. Structured JSON output for CI / CD pipelines

```bash
sf project deploy start --json | sf explain --json
```

Output adheres to a versioned schema (`schemaVersion: 1`):

```json
{
  "status": 0,
  "result": {
    "schemaVersion": 1,
    "analyzed": 1,
    "explained": 1,
    "results": [
      {
        "failure": { "source": "generic", "name": "NamedOrgNotFoundError", "message": "..." },
        "matches": [
          {
            "ruleId": "no-target-org-auth",
            "title": "Target org authorization information not found",
            "explain": "The target org specified by alias or username has no valid authorization entry locally.",
            "fix": [
              "Run \"sf org login web --alias <alias>\" to authorize the org.",
              "Set a default target org with \"sf config set target-org <alias>\"."
            ],
            "confidence": "high",
            "sources": [
              {
                "url": "https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_reference.meta/sfdx_cli_reference/cli_reference_org_commands_unified.htm",
                "title": "Salesforce CLI Org Commands Reference"
              }
            ],
            "why": [
              "field 'name' equals 'NamedOrgNotFoundError'",
              "field 'message' contains 'No authorization information found for'"
            ]
          }
        ]
      }
    ],
    "unmatched": []
  }
}
```

---

## Sample Output

```
Analysis complete: 2 problems found, 1 explained

1) Parsing --target-org
   Rule:        no-target-org-auth
   Likely cause: The target org specified by alias or username has no valid authorization entry locally. This happens when the alias is misspelled, the org was never authenticated in this environment, or local auth files were cleared.
   Fix:
                1. Run "sf org login web --alias <alias>" to authorize the org.
                2. Check authorized orgs with "sf org list" to verify the correct alias name.
                3. Set a default target org with "sf config set target-org <alias>".
   Confidence:  high   Source: https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_reference.meta/sfdx_cli_reference/cli_reference_org_commands_unified.htm
   Why matched: field 'name' equals 'NamedOrgNotFoundError'; field 'message' contains 'No authorization information found for'

2) Nonexistent flag: --foo
   No matching rule. Want to add one? Run: sf explain --contribute
```

---

## CI / CD Integration

`sf-explain` includes purpose-built flags for CI/CD pipelines (GitHub Actions, GitLab CI, Azure DevOps, Bitbucket Pipelines) to summarize failures directly into PR comments or pipeline step summaries:

### GitHub Actions Workflow Example

```yaml
- name: Deploy to Salesforce Org
  id: deploy
  run: sf project deploy start --source-dir force-app --json > deploy-result.json
  continue-on-error: true

- name: Explain Deployment Failures
  if: steps.deploy.outcome == 'failure'
  run: |
    sf explain --file deploy-result.json --summary >> $GITHUB_STEP_SUMMARY
```

### CLI Flags Reference

| Flag                           | Short | Description                                                                                     |
| ------------------------------ | ----- | ----------------------------------------------------------------------------------------------- |
| `--file <path>`                | `-f`  | Path to a file containing failed command output (JSON or text).                                 |
| `--summary`                    |       | Outputs clean GitHub-flavored Markdown highlighting root causes, collapsed cascades, and fixes. |
| `--output-file <path>`         |       | Writes the analysis output (Markdown, text, or JSON) directly to a file on disk.                |
| `--fail-on-unmatched`          |       | Exits with status code 1 if any failure has no matching rule. Useful as a CI quality gate.      |
| `--severity-threshold <level>` |       | Filters failures to only analyze items at or above `error`, `warning`, or `info`.               |
| `--show-cascade`               |       | Shows all cascading compiler errors instead of collapsing them behind root causes.              |
| `--contribute`                 | `-c`  | Generates a pre-filled, sanitized YAML rule template from the error output.                     |
| `--no-redact`                  |       | Disables automated redaction of sensitive identifiers (for local debugging only).               |

---

## Contributing Rules

Got an error that wasn't explained? Generate a redacted rule skeleton right from the CLI:

```bash
sf <failing-command> --json | sf explain --contribute
```

This prints a sanitized JSON snippet and a pre-filled YAML skeleton ready to copy into `rules/<rule-id>.yml`.

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for full instructions on authoring YAML rules, testing with positive and negative fixtures, and submitting pull requests.

---

## License

BSD-3-Clause. See LICENSE.txt for details.
