# Changelog

All notable changes to `sf-explain` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-11-20

### Added

- Complete offline Salesforce CLI error explanation plugin (`sf explain`).
- 16 verified community-maintained rules with official documentation sources:
  - `no-target-org-auth`: Target org authorization entry not found.
  - `not-a-sfdx-project`: Executing project commands outside an SFDX workspace.
  - `expired-auth-token`: Session or OAuth refresh token expired/revoked.
  - `scratch-communities-needs-sites`: Scratch org with Communities requires Sites feature.
  - `duplicate-value-on-record`: Unique constraint collision on record deployment.
  - `scratch-person-accounts-recordtype`: Person Accounts record type resolution in scratch orgs.
  - `scratch-settings-api-version`: Setting not available for deploy for target API version.
  - `production-deploy-code-coverage`: Deploy blocked by insufficient Apex code coverage.
  - `dependent-class-invalid`: Dependent class requires recompilation.
  - `scratch-org-limit-reached`: Daily or active scratch org allocation exceeded.
  - `entity-type-cannot-be-found`: Referenced entity or metadata type missing dependency.
  - `custom-field-limit-exceeded`: Object custom field maximum limit reached.
  - `validation-rule-failed`: Custom validation rule violation during DML transaction.
  - `required-field-missing`: Missing required field on record or setting insertion.
  - `invalid-api-version`: Unsupported or deprecated API version specified.
  - `no-default-target-org`: No default target org configured.
- Dedicated input adapters:
  - Deploy/retrieve component failure adapter (`src/adapters/deploy.ts`).
  - Apex test failure adapter (`src/adapters/test.ts`).
  - Scratch org creation failure adapter (`src/adapters/scratch.ts`).
  - Generic JSON CLI error adapter (`src/adapters/generic.ts`).
  - Plain-text error output adapter (`src/adapters/text.ts`).
- Read-only context probes (`src/engine/probes.ts`) querying `sfdx-project.json`, scratch definitions, and `.forceignore`.
- Scoring and matching engine (`src/engine/matcher.ts`, `src/engine/scoring.ts`) with operator evaluations (`equals`, `contains`, `regex`, `glob`) and confidence capping.
- Automatic privacy redaction module (`src/redact.ts`) for Salesforce org IDs, session IDs, Bearer tokens, emails, instance URLs, and user paths.
- Contribution helper `--contribute` (`-c`) generating pre-filled YAML skeletons offline.
- Input flexibility: reading from stdin (pipes), `--file` (`-f`), and wrapped commands (`sf explain -- <cmd>`).
- Structured versioned JSON output (`schemaVersion: 1`) via `--json` flag for CI/CD integration.
- Build & validation scripts compiling rules to `dist/rules.json` with SHA-256 integrity checks.
- Comprehensive `CONTRIBUTING.md` and user guide `README.md`.
