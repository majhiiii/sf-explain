# Contributing to sf-explain

Thank you for contributing to `sf-explain`! This guide explains how to add and maintain error explanation rules, write tests, and submit contributions.

---

## Authoring Rules

The core of `sf-explain` is community-maintained YAML rules located under `rules/*.yml`.

### Quick Contribution via CLI

If you hit an unexplained error, you can generate a pre-filled, redacted rule skeleton directly:

```bash
sf <failing-command> --json | sf explain --contribute
# or from a saved error output file:
sf explain --file error.json --contribute
```

This generates a redacted JSON payload, a starter YAML rule skeleton, and a checklist without touching the network.

---

### Rule File Format (`rules/<rule-id>.yml`)

Rules are authored in YAML following this structure:

```yaml
id: my-rule-id # kebab-case, lowercase, unique across rules
title: Short title describing the failure
status: draft # draft | verified
severity: error # error | warning | info
confidence: medium # low | medium | high
match:
  all: # 'all' (AND) or 'any' (OR)
    - field: source # deploy | retrieve | test | scratch-org | auth | generic | text
      equals: deploy
    - field: message
      contains: 'cannot be found'
when: # optional read-only project probes
  - probe: scratchDef.features
    includes: Communities
explain: >
  A clear explanation of the underlying cause in one or two sentences.
fix:
  - Actionable step 1 to resolve the issue.
  - Actionable step 2 if applicable.
sources:
  - url: https://developer.salesforce.com/docs/...
    title: Official Documentation or Salesforce Known Issue
tags: [deploy, custom-fields]
```

### Authoring Rules Standard

1. **Rule ID**: Must be unique and kebab-case (`^[a-z0-9]+(-[a-z0-9]+)*$`).
2. **Sources**: Every rule MUST reference at least one valid official URL (Salesforce documentation, CLI source, or Salesforce Known Issue). Do not invent error causes or fixes.
3. **Confidence Level**:
   - `high`: Use only when an official source explicitly states the cause and fix. Requires `status: verified`.
   - `medium`: Common failure where the cause is probable.
   - `low`: Generic error message with multiple potential causes. Phrase explanations as "likely" or "possibly".
4. **Draft to Verified**:
   - New rules start as `status: draft`.
   - Rules move to `status: verified` once sources and positive/negative fixtures have been reviewed.

---

### Test Fixtures Requirement

Every rule MUST ship with at least one positive fixture and one negative fixture under:

```
test/fixtures/rules/<rule-id>/
├── positive-1.json    # Must match this rule
└── negative-1.json    # Must NOT match this rule
```

### Privacy & Redaction Standard

**NEVER** commit real org IDs (15 or 18 characters starting with `00D`), usernames, real emails, instance URLs, passwords, session IDs, or OAuth tokens into rules or test fixtures. Sanitize all fixtures with placeholder values (e.g. `test-org`, `user@example.com`).

---

## Validation & Testing

Run the rules validator to verify all rules meet the schema and fixture requirements:

```bash
yarn rules:validate
```

Compile the rules into the runtime bundle:

```bash
yarn rules:build
```

Run the full test suite and linter:

```bash
yarn build
yarn lint
yarn test
```

---

## Pull Request Process

1. Fork the repository and create a topic branch (`feat/new-rule-<id>`).
2. Add your rule YAML under `rules/<rule-id>.yml`.
3. Add positive and negative fixtures under `test/fixtures/rules/<rule-id>/`.
4. Ensure `yarn rules:validate`, `yarn build`, `yarn lint`, and `yarn test` pass cleanly.
5. Update `CHANGELOG.md` under `[Unreleased]`.
6. Submit a Pull Request with a link to the official documentation source.
