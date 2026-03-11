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
- Create a file in the root of this project named with this pull request's branch (make sure to remove any special characters and replace them with a hyphen), followed with `.spec.md`. So if the branch name for the pull request is `issue/123-auth`, then you should create a file named `issue-123-auth.spec.md` in the root of this project.
    - if this file already exists, you should not create the new file, and instead you will add your output to that existing file.
- All your output throughout this review should be written to the file you just created.
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
	- Provide a concise summary and append it to the “Feedback Addressed” section at the bottom of the output file.

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
- Append the issue to the “New Findings” section at the bottom of the output file.

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

## Output Structure
Write your results to a file named with this pull request's branch (removing any special characters and replacing them with a hyphen), followed with `.spec.md`. So if the branch name for the pull request is `issue/123-auth`, then you should create a file named `issue-123-auth.spec.md` and write your results to it.

Use exactly these sections and formats in your output:

**Preparation Findings**
- {{bulleted notes on style guide presence, docs completeness, environment setup notes}}

**Feedback Addressed**
- Title: {{prior finding title or link}}
- Evidence: {{commit/diff/ref}}
- Resolution summary: {{how it was addressed}}

**New Findings**
- Title: {{short, specific}}
- Severity: Blocker | High | Medium | Low
- Files/Lines: {{path}}:{{line-range}}
- Summary: {{what and why it matters}}
- Evidence: {{diff/commit/ref}}
- Recommendation: {{actionable fix}}

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

**Post Code Review**
- Pause and wait for me to review and approve your feedback.
- Once approved, use the GitHub CLI to post the feedback as a review with Changes Requested to the PR (IMPORTANT: These should not just be added as general comments, they must be added as Change Requests).
	- Each New Finding should be added as a separate change request comment, so each can be worked on and resolved separately. All other data can be added to the Change Request summary comment.

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
