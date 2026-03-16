---
name: review-pr
description: Performs a code review of a specified pull request on GitHub. Use when asked to review the changes in a code review.
allowed-tools: Bash(gh *)
---

## Setup
If no pull request URL was provided, prompt the user to provide one.

If no URL is provided after prompting user, then inform the user you cannot perform a code review on a pull request without the link to it.

If a URL is provided, use it in place of {{URL_TO_PR}} used in the instructions below.

If no branch to compare the changes against was provided, prompt the user to provide one.

If no branch is provided after prompting user, default to using the `main` branch.

Use the branch in place of {{DEFAULT_BRANCH_NAME}} used in the instructions below.

---

Now we are going to review a Pull Request (PR) that has been posted on GitHub for this repo.

## Preparation

Before you review the changes for this PR, you must first:
- Review the documentation in this repo found in `.md` files (but ignore files that end in `.spec.md`).
- Review this repo’s Style Guide found in ⁠`styleguide.spec.md`.
	- If this file does not exist, notify me that it must be created, and do not proceed. If missing, fall back to default project linters/formatters and established conventions where possible.
- Read the existing code to ensure you are familiar with the current implementation, and coding patterns.
- Read the documentation to ensure you know how to work in our tech stack and local environment (env vars, secrets, services).
- Confirm the PR references an issue/ticket and that the PR description includes: problem statement, solution, alternatives considered, manual testing instructions, and a link to the original ticket.
- Ask any clarifying questions you may have to ensure you fully understand this task.

## Local Setup and Deterministic Environment

- Authenticate GitHub CLI:
- Run: `⁠gh auth status` (use ⁠gh auth login if needed)
- Fetch PR information and code:
	- View PR JSON: `⁠gh pr view {{URL_TO_PR}} --json number,title,author,baseRefName,headRefName,mergeable,commits,reviews,comments,files,statusCheckRollup`
	- Checkout branch: ⁠`gh pr checkout {{URL_TO_PR}}`
- Ensure a clean local environment:
	- kill any existing docker containers for this repo: `docker compose down`
	- Install dependencies deterministically: ⁠`npm ci`
	- start the docker containers for this repo: `docker compose up`


## Build, Type, Lint, Format, Tests, Security

Run these in order and record results:
- Build must pass:
	- `⁠npm run build`
- Type checking must pass (for TS repos):
	- ⁠`npm run typecheck or ⁠tsc --noEmit`
- Lint must pass:
	- `⁠npm run lint`
- Format must be clean (no pending format diffs):
	- `⁠npm run format:check` (or equivalent)
- Tests must pass with coverage:
	- `⁠npm run test`
- Security and dependencies:
	- `⁠npm audit --production`
	- Validate lockfile changes are intentional; verify registry sources and dependency licenses against policy

Record any failures in the “Test/Lint/Typecheck/Build Status” section.

## Code Review
Once you have completed the preparation phase:

- Use the GitHub CLI to retrieve all PR information (see above).
- Check out the branch associated with the PR.
- Review the commits in the git log for this branch:
	- `⁠git fetch --all --prune`
	- `⁠git log --oneline --decorate origin/{{DEFAULT_BRANCH_NAME}}..HEAD`
- Establish changed files and scope:
	- `⁠git diff --name-only origin/{{DEFAULT_BRANCH_NAME}}...HEAD`
	- Prioritize changed files but consider impacts to indirectly affected modules.
- Previously provided feedback:
	- If feedback has previously been provided in the PR and the PR owner has said they have addressed that feedback (via comment or thumbs-up reaction), confirm it has been correctly addressed.
	- Link each addressed item to the specific commit, diff, or code reference that resolves it.
	- Provide a concise summary and include it in the “Feedback Addressed” section of the review summary.

Next, execute the review of this PR. Identify any of the following:
- Security issues introduced (code, dependencies, secrets in diff, supply chain integrity)
- Performance issues introduced (runtime, memory, N+1, rendering cost, performance budgets if frontend)
- Logic issues introduced (edge cases, concurrency/race conditions, timeouts/retries/idempotency)
- Backward compatibility breaks (public APIs, schemas, migrations)
- Missing test use cases; flaky or brittle tests
- Tests incorrectly set up or asserting incorrectly
- Violations of rules outlined in the style guide (and language/framework-specific conventions)
- Documentation gaps (README, API docs, changelog, ADRs, code comments)
- Observability considerations (logging levels, metrics, tracing; alerts and dashboards)
- Database migrations:
	- Forward-only and backward compatible
	- Idempotency and zero-downtime strategy

For any issue found:
- Assign a severity using this scale:
	- Blocker: must fix before merge
	- High: strong recommendation before merge
	- Medium: should fix soon
	- Low/Nit: optional/style
- Provide a concise summary, evidence (file:path#line-range, diff, commit), and a recommended solution.

Additional Requirements:
- Do not allow duplicate feedback.
	- Treat (rule or issue type + file path + line range) as a unique key for deduplication.
- You must confirm all of the following:
	- All tests are passing
		- To run tests: ⁠npm run test
	- No linter errors exist in the changed files
	- No TypeScript errors exist in the changed files
	- Build passes
	- Format check passes
	- Security scan shows no high/critical vulnerabilities, or exceptions are justified
- Confirm CI status:
	- Verify all required checks are green in the PR.
	- List any failing checks with links in the “CI Status and Required Checks” section.

## Output — Submit as GitHub PR Review

Do NOT write results to a local file. Instead, submit all feedback directly to the GitHub PR as a single review using the GitHub API.

### Review Summary (the review body)

The review body should contain all sections **except** New Findings (those go as inline comments). Use exactly these sections and formats:

**Preparation Findings**
- {{bulleted notes on style guide presence, docs completeness, environment setup notes}}

**Feedback Addressed**
- Title: {{prior finding title or link}}
- Evidence: {{commit/diff/ref}}
- Resolution summary: {{how it was addressed}}

**Test/Lint/Typecheck/Build Status**
- Build: {{pass/fail}} — {{notes}}
- Typecheck: {{pass/fail}} — {{notes}}
- Lint: {{pass/fail}} — {{notes}}
- Format: {{clean/needs format}} — {{notes}}
- Tests: {{pass/fail}}; coverage {{% if available}} — {{notes}}
- Security (npm audit): {{issues/none}} — {{notes}}

**CI Status and Required Checks**
- Required checks: {{list}}
- Status: {{all green / failing}}
- Links: {{URLs to failing checks if any}}

**Risk and Rollout**
- Author-declared risk: {{low/med/high}}
- Migration/Feature flags: {{present? default-off? cleanup plan?}}
- Rollout/rollback plan: {{summary}}
- Observability impacts: {{logging/metrics/tracing updates}}

**Summary and Recommendation**
- Overall assessment: {{brief}}
- Recommendation: Approve | Request Changes | Comment
- Rationale: {{concise justification}}

### Inline Review Comments (one per New Finding)

Each New Finding must be submitted as a separate inline review comment on the relevant file and line. Each comment body should use this format:

```
**{{Title}}**
**Severity:** Blocker | High | Medium | Low
**Files/Lines:** {{path}}:{{line-range}}
**Summary:** {{what and why it matters}}
**Evidence:** {{diff/commit/ref}}
**Recommendation:** {{actionable fix}}
```

If a finding cannot be tied to a specific file/line (e.g., missing test file, general architectural concern), include it in the review body summary instead.

### How to Submit

Use `gh api` to submit a single pull request review with all inline comments at once:

```bash
gh api repos/{owner}/{repo}/pulls/{pr_number}/reviews \
  --method POST \
  -f event="REQUEST_CHANGES" \
  -f body="<review summary from above>" \
  --jq '.id' \
  -f 'comments=[
    {
      "path": "<file path relative to repo root>",
      "line": <line number in the diff>,
      "body": "**<Title>**\n**Severity:** <level>\n**Files/Lines:** <path:line-range>\n**Summary:** <what and why>\n**Evidence:** <diff/commit/ref>\n**Recommendation:** <actionable fix>"
    }
  ]'
```

- If there are no New Findings (nothing to request changes on), use `event="APPROVE"` instead of `event="REQUEST_CHANGES"`.
- Do NOT pause and wait for approval before submitting — post the review immediately after completing the analysis.

**Commands Reference (for convenience)**
- PR info: ⁠`gh pr view {{URL_TO_PR}} --json number,title,author,baseRefName,headRefName,mergeable,commits,reviews,comments,files,statusCheckRollup`
- Checkout: ⁠`gh pr checkout {{URL_TO_PR}}`
- Diff scope: `⁠git diff --name-only origin/{{DEFAULT_BRANCH_NAME}}...HEAD`
- Log: `⁠git log --oneline --decorate origin/{{DEFAULT_BRANCH_NAME}}..HEAD`
- Install: `⁠npm ci`
- Build: ⁠`npm run build`
- Typecheck: `⁠npm run typecheck` or `⁠tsc --noEmit`
- Lint: ⁠`npm run lint`
- Format check: ⁠`npm run format:check`
- Tests: ⁠`npm run test -- --coverage --runInBand`
- Security: `⁠npm audit --production`

Use Context7
