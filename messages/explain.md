# summary

Explain the likely cause and fix for a failed Salesforce CLI command.

# description

Analyze error output from a failed Salesforce CLI command using community-maintained rules.

# error.no-input

No input provided. Pipe the output of a failed sf command into "sf explain" (e.g. sf ... 2>&1 | sf explain), provide a file with --file, or wrap a command with "-- <cmd>".

# flags.file.summary

Path to a file containing failed command output.

# flags.file.description

Read the error output from a saved JSON or text file instead of standard input.

# flags.contribute.summary

Generate a pre-filled rule contribution template from the failure.

# flags.contribute.description

Format the error output into a redacted Failure and YAML skeleton for community rule authoring without opening any network connections.

# flags.no-redact.summary

Disable automatic redaction of sensitive identifiers.

# flags.no-redact.description

Prevent redacting org IDs, tokens, usernames, paths, and custom metadata for local debugging. Redaction is enabled by default.

# flags.show-cascade.summary

Show all cascading errors instead of collapsing them.

# flags.show-cascade.description

Display secondary and cascading compiler errors that were triggered by a root syntax or configuration failure.

# flags.summary.summary

Output formatted Markdown summary suitable for CI/CD and PR comments.

# flags.summary.description

Generate a structured Markdown report highlighting root causes, collapsed cascading counts, recommended fixes, and documentation links.

# flags.fail-on-unmatched.summary

Exit with code 1 if any failure has no matching rule.

# flags.fail-on-unmatched.description

Fail the command in CI pipelines when an unknown or unhandled failure occurs.

# flags.severity-threshold.summary

Filter failures by minimum severity level.

# flags.severity-threshold.description

Only analyze failures at or above the specified severity level (error, warning, info).

# flags.output-file.summary

Path to a file where results should be written.

# flags.output-file.description

Write analysis output (human-readable text, markdown summary, or JSON) directly to a file on disk.

# examples

- sf project deploy start --json | <%= config.bin %> <%= command.id %>
- <%= config.bin %> <%= command.id %> --file deploy-result.json
- <%= config.bin %> <%= command.id %> --file error.json --contribute
- <%= config.bin %> <%= command.id %> -- sf project deploy start
