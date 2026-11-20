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

# examples

- sf project deploy start --json | <%= config.bin %> <%= command.id %>
- <%= config.bin %> <%= command.id %> --file deploy-result.json
- <%= config.bin %> <%= command.id %> --file error.json --contribute
- <%= config.bin %> <%= command.id %> -- sf project deploy start
