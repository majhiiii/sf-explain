/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { expect } from 'chai';
import { renderSummary } from '../../src/render/summary.js';
import { GroupedAnalysis } from '../../src/engine/grouper.js';

describe('renderSummary', () => {
  it('renders markdown summary for single matched root cause', () => {
    const grouped: GroupedAnalysis = {
      totalFailures: 1,
      totalExplained: 1,
      groups: [
        {
          rootCause: {
            failure: {
              source: 'deploy',
              file: 'force-app/main/default/classes/OrderService.cls',
              line: 12,
              column: 5,
              component: { type: 'ApexClass', name: 'OrderService' },
              message: "Expecting '}' but was: ']'",
              raw: {},
            },
            analysis: {
              failure: {
                source: 'deploy',
                message: "Expecting '}' but was: ']'",
                raw: {},
              },
              matches: [
                {
                  ruleId: 'apex-syntax-error',
                  title: 'Apex syntax error',
                  explain: 'Mismatched bracket in Apex class.',
                  fix: ['Open OrderService.cls', "Replace ']' with '}'."],
                  confidence: 'high',
                  sources: [{ url: 'https://developer.salesforce.com/docs', title: 'Apex Guide' }],
                  why: ['matched syntax'],
                },
              ],
            },
          },
          cascading: [],
        },
      ],
    };

    const md = renderSummary(grouped);
    expect(md).to.include('### 🔍 sf-explain Analysis');
    expect(md).to.include('**1 problem found**, **1 explained**.');
    expect(md).to.include("#### 🔴 Root Cause 1: `Expecting '}' but was: ']'`");
    expect(md).to.include('- **Location:** `force-app/main/default/classes/OrderService.cls:12:5`');
    expect(md).to.include('- **Component:** `ApexClass / OrderService`');
    expect(md).to.include('- **Rule:** `apex-syntax-error` (high confidence)');
    expect(md).to.include('- **Likely Cause:** Mismatched bracket in Apex class.');
    expect(md).to.include('  1. Open OrderService.cls');
    expect(md).to.include("  2. Replace ']' with '}'.");
    expect(md).to.include('- **Source:** [Apex Guide](https://developer.salesforce.com/docs)');
  });

  it('renders markdown summary with cascading errors hidden by default', () => {
    const grouped: GroupedAnalysis = {
      totalFailures: 3,
      totalExplained: 1,
      groups: [
        {
          rootCause: {
            failure: {
              source: 'deploy',
              file: 'force-app/main/default/classes/AccountService.cls',
              line: 42,
              message: "Unexpected token ';'",
              raw: {},
            },
            analysis: {
              failure: {
                source: 'deploy',
                message: "Unexpected token ';'",
                raw: {},
              },
              matches: [
                {
                  ruleId: 'apex-syntax-token',
                  title: 'Apex unexpected token',
                  explain: 'Unexpected semicolon in statement.',
                  fix: ['Remove the semicolon.'],
                  confidence: 'medium',
                  sources: [],
                  why: ['matched token'],
                },
              ],
            },
          },
          cascading: [
            {
              failure: {
                source: 'deploy',
                file: 'force-app/main/default/classes/AccountService.cls',
                line: 43,
                message: 'Variable does not exist: count',
                raw: {},
              },
            },
            {
              failure: {
                source: 'deploy',
                file: 'force-app/main/default/classes/AccountService.cls',
                line: 44,
                message: 'Method already defined: init()',
                raw: {},
              },
            },
          ],
        },
      ],
    };

    const defaultMd = renderSummary(grouped);
    expect(defaultMd).to.include('**3 problems found** (1 root cause, 2 cascading), **1 explained**.');
    expect(defaultMd).to.include('> ⚠️ **2 cascading errors hidden.** Run with `--show-cascade` to display all.');

    const expandedMd = renderSummary(grouped, { showCascade: true });
    expect(expandedMd).to.include('<details>');
    expect(expandedMd).to.include('<summary><b>Cascading Errors (2)</b></summary>');
    expect(expandedMd).to.include('- `Variable does not exist: count`');
    expect(expandedMd).to.include('- `Method already defined: init()`');
    expect(expandedMd).to.include('</details>');
  });

  it('renders markdown for unmatched failures with contribute callout', () => {
    const grouped: GroupedAnalysis = {
      totalFailures: 1,
      totalExplained: 0,
      groups: [
        {
          rootCause: {
            failure: {
              source: 'generic',
              message: 'CompletelyUnknownInternalError: something broke',
              raw: {},
            },
          },
          cascading: [],
        },
      ],
    };

    const md = renderSummary(grouped);
    expect(md).to.include('#### ❓ Issue 1: `CompletelyUnknownInternalError: something broke`');
    expect(md).to.include('- **Status:** No matching rule.');
    expect(md).to.include('- **Contribute:** Run `sf explain --contribute`');
  });
});
