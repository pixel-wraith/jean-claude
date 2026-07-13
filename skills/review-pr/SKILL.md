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

## Output — Submit Feedback as Individual PR Review Comments

Do NOT write results to a local file. Do NOT combine all feedback into a single comment. Each piece of feedback must be its own separate comment on the PR.

### What to Submit

Every issue or piece of feedback you identify during the review gets submitted as its own individual inline comment on the specific file and line where the issue exists. No summary comments, no combined reviews — just targeted, actionable comments.

Each comment body should follow this format:

```
**{{Title}}** ({{Severity}})

{{Clear description of the issue — what is wrong and why it matters}}

**Recommendation:** {{Specific, actionable fix the author can apply}}
```

Severity scale for the title:
- **Blocker** — must fix before merge
- **High** — strongly recommend fixing before merge
- **Medium** — should fix soon
- **Low/Nit** — optional/style

### Step 1: Fetch the Diff and Build a Map of Valid Comment Lines

Before constructing any comments, you MUST fetch the PR diff to determine which file/line combinations are valid targets for inline comments. The GitHub API will reject comments on lines that don't appear in the diff.

```bash
gh api repos/{owner}/{repo}/pulls/{pr_number}/files --paginate > /tmp/pr-files.json
```

This returns JSON with each file's `filename` and `patch` fields. Parse each file's `patch` to identify which line numbers are valid comment targets:

- The `patch` field contains unified diff format. Each hunk starts with a `@@` header like `@@ -10,4 +12,6 @@`.
- The `+12,6` part means the RIGHT side (new file) starts at line 12 for this hunk.
- Walk through the hunk lines after the `@@` header:
  - Lines starting with `+` or ` ` (space/context) exist on the RIGHT side — increment the RIGHT line counter.
  - Lines starting with `-` or ` ` (space/context) exist on the LEFT side — increment the LEFT line counter.
- Only lines that appear in the diff hunks are valid targets for inline comments.

**Rule:** Every comment you create MUST have its `line` verified against the diff. If the exact line you want to comment on is not in the diff, use the nearest line within the same diff hunk that provides sufficient context.

### Step 2: Build the Review Payload

Submit all comments as a single review with event `REQUEST_CHANGES`. Each finding is an entry in the `comments` array. The review `body` should be a single short sentence summarizing the review (e.g., "Found 3 issues that should be addressed before merging."). Do NOT put detailed findings, status reports, or section headers in the review body.

Use `jq` to construct the JSON payload — this ensures proper escaping of special characters in comment bodies. Do NOT use heredoc-based JSON construction.

Every comment in the `comments` array MUST include these fields:
- `path` — file path relative to repo root (must match a `filename` from the PR files API response)
- `line` — line number that exists within a diff hunk for this file (verified in Step 1)
- `side` — `"RIGHT"` for added or context lines (this is the default for most review comments), `"LEFT"` for deleted lines
- `body` — the formatted comment text

Example payload construction:

```bash
jq -n \
  --arg event "REQUEST_CHANGES" \
  --arg body "Found N issues to address before merging." \
  --argjson comments '[
    {
      "path": "src/example.ts",
      "line": 42,
      "side": "RIGHT",
      "body": "**Title** (Severity)\n\nDescription of the issue.\n\n**Recommendation:** Actionable fix."
    }
  ]' \
  '{event: $event, body: $body, comments: $comments}' > /tmp/review-payload.json
```

### Step 3: Validate Before Submitting

Before submitting the review, verify:
- Every comment's `path` matches a `filename` from the PR files list
- Every comment's `line` exists within a diff hunk for that file (confirmed in Step 1)
- Every comment has `side` set (`"RIGHT"` for new/changed lines, `"LEFT"` for deleted lines)
- The JSON is valid: `jq . /tmp/review-payload.json`

### Step 4: Submit the Review

```bash
gh api repos/{owner}/{repo}/pulls/{pr_number}/reviews \
  --method POST \
  --input /tmp/review-payload.json
```

**Error handling:** If the API returns a 422 error:
1. Read the error message — it usually identifies which comment has an invalid `path` or `line`.
2. Re-examine the diff for that file to find the correct line number.
3. Fix the payload and resubmit.
4. Do NOT fall back to `gh pr comment`. Fix the inline comment and retry.

### When There Are No Issues

If you find no issues worth commenting on, submit an `APPROVE` review with a brief body explaining why:

```bash
gh api repos/{owner}/{repo}/pulls/{pr_number}/reviews \
  --method POST \
  -f event="APPROVE" \
  -f body="No issues found. <one-sentence rationale>"
```

### Rules

- Every finding = its own inline comment in the `comments` array. Never combine multiple findings into one comment.
- Always submit as `REQUEST_CHANGES` when there are findings, regardless of severity.
- NEVER use `gh pr comment` because an inline comment API call failed. Always fix the line number and retry the review API instead.
- The ONLY acceptable use of `gh pr comment` is for findings that are genuinely not tied to any file at all (e.g., "this PR is missing a database migration entirely"). This should be extremely rare.
- Do NOT include build/lint/test status, CI check summaries, preparation notes, or risk assessments in the review. Only submit actionable feedback on the code.
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
