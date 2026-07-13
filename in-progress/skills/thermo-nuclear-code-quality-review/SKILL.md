---
name: thermo-nuclear-code-quality-review
description: Run an extremely strict maintainability review for abstraction quality, giant files, and spaghetti-condition growth. Use for a thermo-nuclear code quality review, thermonuclear review, deep code quality audit, or especially harsh maintainability review.
disable-model-invocation: true
---

# Thermo-Nuclear Code Quality Review

Use this skill for an unusually strict review focused on implementation quality, maintainability, abstraction quality, and codebase health.

Above all, this skill should push the reviewer to be **ambitious** about code structure. Do not merely identify local cleanup opportunities. Actively search for "code judo" moves: restructurings that preserve behavior while making the implementation dramatically simpler, smaller, more direct, and more elegant.

## Preparation

Before you review the changes for this PR, you must first:
- Review the documentation in this repo found in `.md` files (but ignore files that end in `.spec.md` unless explicitely stated).
- Review this repo’s Style Guide found in ⁠`styleguide.spec.md`.
	- If this file does not exist, notify me that it must be created then, fall back to default project linters/formatters and established conventions where possible.
- Read the existing code to ensure you are familiar with the current implementation, and coding patterns.
- Read the documentation to ensure you know how to work in our tech stack and local environment (env vars, secrets, services).
- Confirm the PR references an issue/ticket and that the PR description includes: problem statement, solution, alternatives considered, manual testing instructions, and a link to the original ticket.
    - Tickets for this project live in Jira, not GitHub — the PR description typically will not restate the full requirements. **Prompt the user to provide the requirements from the linked ticket before proceeding.** This is a hard gate: without the requirements, the review can only judge code standards, not whether the changes actually solve the problem the ticket describes. If the user cannot provide the requirements, stop and surface that as the reason the review cannot proceed.
- Ask any remaining clarifying questions needed to understand the task before starting the analysis. All clarifying questions must be asked during this Preparation phase — once analysis begins, the review runs to completion without further pauses.

## Fetch the PR

- Authenticate GitHub CLI:
	- Run: `⁠gh auth status` (use `gh auth login` if needed)
- Fetch PR information and check out the branch:
	- View PR JSON: `⁠gh pr view {{URL_TO_PR}} --json number,title,author,baseRefName,headRefName,mergeable,commits,reviews,comments,files,statusCheckRollup`
	- Checkout branch: ⁠`gh pr checkout {{URL_TO_PR}}`

This skill is a focused code quality / maintainability review. It deliberately does NOT run the project's build, typecheck, lint, format, tests, or security scans — those are the job of CI and the general-purpose review skill. Do not start docker services, do not run `npm ci`, do not run any build or test commands as part of this review.

## Core Prompt

Start from this baseline:

> Perform a deep code quality audit of the current branch's changes.
> Rethink how to structure / implement the changes to meaningfully improve code quality without impacting behavior.
> Work to improve abstractions, modularity, reduce Spaghetti code, improve succinctness and legibility.
> Be ambitious, if there is a clear path to improving the implementation that involves restructuring some of the codebase, go for it.
> Be extremely thorough and rigorous. Measure twice, cut once.

## Non-Negotiable Additional Standards

Apply the baseline prompt above, plus these explicit review rules:

0. **Be ambitious about structural simplification.**
   - Do not stop at "this could be a bit cleaner."
   - Look for opportunities to reframe the change so that whole branches, helpers, modes, conditionals, or layers disappear entirely.
   - Prefer the solution that makes the code feel inevitable in hindsight.
   - Assume there is often a "code judo" move available: a re-organization that uses the existing architecture more effectively and makes the change dramatically simpler and more elegant.
   - If you see a path to delete complexity rather than rearrange it, push hard for that path.

1. **Do not let a PR push a file from under 1k lines to over 1k lines without a very strong reason.**
   - Treat this as a strong code-quality smell by default.
   - Prefer extracting helpers, subcomponents, modules, or local abstractions instead of letting a file sprawl past 1000 lines.
   - If the diff crosses that threshold, explicitly ask whether the code should be decomposed first.
   - Only waive this if there is a compelling structural reason and the resulting file is still clearly organized.

2. **Do not allow random spaghetti growth in existing code.**
   - Be highly suspicious of new ad-hoc conditionals, scattered special cases, or one-off branches inserted into unrelated flows.
   - If a change adds "weird if statements in random places", treat that as a design problem, not a stylistic nit.
   - Prefer pushing the logic into a dedicated abstraction, helper, state machine, policy object, or separate module instead of tangling an existing path.
   - Call out changes that make the surrounding code harder to reason about, even if they technically work.

3. **Bias toward cleaning the design, not just accepting working code.**
   - If behavior can stay the same while the structure becomes meaningfully cleaner, push for the cleaner version.
   - Do not rubber-stamp "it works" implementations that leave the codebase messier.
   - Strongly prefer simplifications that remove moving pieces altogether over refactors that merely spread the same complexity around.

4. **Prefer direct, boring, maintainable code over hacky or magical code.**
   - Treat brittle, ad-hoc, or "magic" behavior as a code-quality problem.
   - Be skeptical of generic mechanisms that hide simple data-shape assumptions.
   - Flag thin abstractions, identity wrappers, or pass-through helpers that add indirection without buying clarity.

5. **Push hard on type and boundary cleanliness when they affect maintainability.**
   - Question unnecessary optionality, `unknown`, `any`, or cast-heavy code when a clearer type boundary could exist.
   - Prefer explicit typed models or shared contracts over loosely-shaped ad-hoc objects.
   - If a branch relies on silent fallback to paper over an unclear invariant, ask whether the boundary should be made explicit instead.

6. **Keep logic in the canonical layer and reuse existing helpers.**
   - Call out feature logic leaking into shared paths or implementation details leaking through APIs.
   - Prefer existing canonical utilities/helpers over bespoke one-offs.
   - Push code toward the right package, service, or module instead of normalizing architectural drift.

7. **Treat unnecessary sequential orchestration and non-atomic updates as design smells when the cleaner structure is obvious.**
   - If independent work is serialized for no good reason, ask whether the flow should run in parallel instead.
   - If related updates can leave state half-applied, push for a more atomic structure.
   - Do not over-index on micro-optimizations, but do flag avoidable orchestration complexity that makes the implementation more brittle.

## Primary Review Questions

For every meaningful change, ask:

- Is there a "code judo" move that would make this dramatically simpler?
- Can this change be reframed so fewer concepts, branches, or helper layers are needed?
- Does this improve or worsen the local architecture?
- Did the diff add branching complexity where a better abstraction should exist?
- Did a previously cohesive module become more coupled, more stateful, or harder to scan?
- Is this logic living in the right file and layer?
- Did this change enlarge a file or component past a healthy size boundary?
- Are there repeated conditionals that signal a missing model or missing helper?
- Is the implementation direct and legible, or does it rely on special cases and incidental control flow?
- Is this abstraction actually earning its keep, or is it just a wrapper?
- Did the diff introduce casts, optionality, or ad-hoc object shapes that obscure the real invariant?
- Is this logic living in the canonical layer, or did the diff leak details across a boundary?
- Is this orchestration more sequential or less atomic than it needs to be?

## What to Flag Aggressively

Escalate findings when you see:

- A complicated implementation where a cleaner reframing could delete whole categories of complexity.
- Refactors that move code around but fail to reduce the number of concepts a reader must hold in their head.
- A file crossing 1000 lines due to the PR, especially if the new code could be split out.
- New conditionals bolted onto unrelated code paths.
- One-off booleans, nullable modes, or flags that complicate existing control flow.
- Feature-specific logic leaking into general-purpose modules.
- Generic "magic" handling that hides simple structure and makes the code harder to reason about.
- Thin wrappers or identity abstractions that add indirection without simplifying anything.
- Unnecessary casts, `any`, `unknown`, or optional params that muddy the real contract.
- Copy-pasted logic instead of extracted helpers.
- Narrow edge-case handling implemented in the middle of an already busy function.
- Refactors that technically pass tests but make the code less modular or less readable.
- "Temporary" branching that is likely to become permanent debt.
- Bespoke helpers where the codebase already has a canonical utility for the job.
- Logic added in the wrong layer/package when it should live somewhere more central.
- Sequential async flow where obviously independent work could stay simpler and clearer with parallel execution.
- Partial-update logic that leaves state less atomic than necessary.

## Preferred Remedies

When you identify a code-quality problem, prefer suggestions like:

- Delete a whole layer of indirection rather than polishing it.
- Reframe the state model so conditionals disappear instead of getting centralized.
- Change the ownership boundary so the feature becomes a natural extension of an existing abstraction.
- Turn special-case logic into a simpler default flow with fewer exceptions.
- Extract a helper or pure function.
- Split a large file into smaller focused modules.
- Move feature-specific logic behind a dedicated abstraction.
- Replace condition chains with a typed model or explicit dispatcher.
- Separate orchestration from business logic.
- Collapse duplicate branches into a single clearer flow.
- Delete wrappers that do not meaningfully clarify the API.
- Reuse the existing canonical helper instead of introducing a near-duplicate.
- Make type boundaries more explicit so the control flow gets simpler.
- Move the logic to the package/module/layer that already owns the concept.
- Parallelize independent work when that also simplifies the orchestration.
- Restructure related updates into a more atomic flow when partial state would be harder to reason about.

Do not be satisfied with "maybe rename this" feedback when the real issue is structural.
Do not be satisfied with a merely cleaner version of the same messy idea if there is a plausible path to a much simpler idea.

## Review Tone

Be direct, serious, and demanding about quality.
Do not be rude, but do not soften major maintainability issues into mild suggestions.
If the code is making the codebase messier, say so clearly.
If the implementation missed an opportunity for a dramatic simplification, say that clearly too.

Good phrases:

- `this pushes the file past 1k lines. can we decompose this first?`
- `this adds another special-case branch into an already busy flow. can we move this behind its own abstraction?`
- `this works, but it makes the surrounding code more spaghetti. let's keep the behavior and restructure the implementation.`
- `this feels like feature logic leaking into a shared path. can we isolate it?`
- `this abstraction seems unnecessary. can we just keep the direct flow?`
- `why does this need a cast / optional here? can we make the boundary more explicit instead?`
- `this looks like a bespoke helper for something we already have elsewhere. can we reuse the canonical one?`
- `i think there's a code-judo move here that makes this much simpler. can we reframe this so these branches disappear?`
- `this refactor moves complexity around, but doesn't really delete it. is there a way to make the model itself simpler?`

## Output Expectations

Prioritize findings in this order:

1. Structural code-quality regressions
2. Missed opportunities for dramatic simplification / code-judo restructuring
3. Spaghetti / branching complexity increases
4. Boundary / abstraction / type-contract problems that make the code harder to reason about
5. File-size and decomposition concerns
6. Modularity and abstraction issues
7. Legibility and maintainability concerns

**Submit Feedback as Individual PR Review Comments**
- Do NOT write results to a local file. Do NOT combine all feedback into a single comment. Each piece of feedback must be its own separate comment on the PR.
- Use [Conventional Comments](https://conventionalcomments.org) for all feedback comments.
- Every comment must carry the `(blocking)` decoration. Do NOT use `nitpick:` and do NOT use the `(non-blocking)` decoration — this review has no optional tier by design. If a finding is too minor to justify a blocking comment, leave it out of the review entirely. Prefer a small number of high-conviction comments over a long list of low-value ones.

### How to Submit

#### Step 1: Fetch the diff and build a map of valid comment lines

Before constructing any comments, fetch the PR diff to determine which file/line combinations are valid targets for inline comments. The GitHub API rejects comments on lines that don't appear in the diff.

```bash
gh api repos/{owner}/{repo}/pulls/{pr_number}/files --paginate > /tmp/pr-files.json
```

This returns JSON with each file's `filename` and `patch` fields. Parse each `patch` to identify which line numbers are valid comment targets:

- The `patch` field is unified diff format. Each hunk starts with a header like `@@ -10,4 +12,6 @@`.
- `+12,6` means the RIGHT side (new file) starts at line 12 for this hunk.
- Walk the hunk lines after the `@@` header:
  - Lines starting with `+` or ` ` (space/context) exist on the RIGHT side — increment the RIGHT line counter.
  - Lines starting with `-` or ` ` (space/context) exist on the LEFT side — increment the LEFT line counter.
- Only lines that appear in the diff hunks are valid targets for inline comments.

**Rule:** Every comment you create MUST have its `line` verified against the diff. If the exact line you want to comment on is not in the diff, use the nearest line within the same diff hunk that provides sufficient context.

#### Step 2: Build the review payload

Submit all comments as a single review with event `REQUEST_CHANGES`. Each finding is an entry in the `comments` array. The review `body` should be a single short sentence summarizing the review (e.g., "Found N blocking issues to address before merging."). Do NOT put detailed findings, status reports, or section headers in the review body.

Use `jq` to construct the JSON payload — this ensures proper escaping of special characters in comment bodies. Do NOT use heredoc-based JSON construction.

Every comment in the `comments` array MUST include:
- `path` — file path relative to repo root (must match a `filename` from the PR files API response)
- `line` — line number that exists within a diff hunk for this file (verified in Step 1)
- `side` — `"RIGHT"` for added or context lines (the default for most review comments), `"LEFT"` for deleted lines
- `body` — a Conventional Comment tagged `(blocking)`

Example payload construction:

```bash
jq -n \
  --arg event "REQUEST_CHANGES" \
  --arg body "Found N blocking issues to address before merging." \
  --argjson comments '[
    {
      "path": "src/example.ts",
      "line": 42,
      "side": "RIGHT",
      "body": "**issue (blocking):** Short subject line.\n\nLonger description of what is wrong and why it matters.\n\n**Recommendation:** Specific, actionable fix the author can apply."
    }
  ]' \
  '{event: $event, body: $body, comments: $comments}' > /tmp/review-payload.json
```

#### Step 3: Validate before submitting

Before submitting the review, verify:
- Every comment's `path` matches a `filename` from the PR files list.
- Every comment's `line` exists within a diff hunk for that file (confirmed in Step 1).
- Every comment has `side` set (`"RIGHT"` for new/changed lines, `"LEFT"` for deleted lines).
- Every comment body is a valid Conventional Comment carrying the `(blocking)` decoration. No `nitpick:` labels and no `(non-blocking)` decorations exist anywhere in the payload.
- The JSON is valid: `jq . /tmp/review-payload.json`.

#### Step 4: Submit the review

```bash
gh api repos/{owner}/{repo}/pulls/{pr_number}/reviews \
  --method POST \
  --input /tmp/review-payload.json
```

**Error handling:** If the API returns a 422 error:
1. Read the error message — it usually identifies which comment has an invalid `path` or `line`.
2. Re-examine the diff for that file to find the correct line number.
3. Fix the payload and resubmit.
4. Do NOT fall back to `gh pr comment`. Fix the inline comment and retry the review API.

#### When there are no findings

If the changes survive the thermo-nuclear bar with nothing to flag, submit a `COMMENT` review (not `APPROVE`) with a brief one-sentence rationale. Final approval is reserved for a human reviewer:

```bash
gh api repos/{owner}/{repo}/pulls/{pr_number}/reviews \
  --method POST \
  -f event="COMMENT" \
  -f body="Thermo-nuclear review complete. No blocking structural, abstraction, or maintainability findings. <one-sentence rationale>. This review intentionally does not approve — final sign-off is reserved for a human reviewer."
```

This should be rare. Before posting a clean review, sanity-check the Bar for a Clean Review below — if any of those conditions are unmet, the correct action is `REQUEST_CHANGES` with inline comments.

## Bar for a Clean Review

Do not post a clean review merely because behavior seems correct. Never submit an `APPROVE` review under any circumstances — approval is always reserved for a human reviewer.

The bar for a clean review (i.e. `COMMENT` with no findings, instead of `REQUEST_CHANGES`) is:

- no clear structural regression
- no obvious missed opportunity to make the implementation dramatically simpler when such a path is visible
- no unjustified file-size explosion
- no obvious spaghetti-growth from special-case branching
- no obviously hacky or magical abstraction that makes the code harder to reason about
- no unnecessary wrapper/cast/optionality churn obscuring the real design
- no clear architecture-boundary leak or avoidable canonical-helper duplication
- no missed opportunity for an obvious decomposition that would materially improve maintainability

Treat these as presumptive blockers unless the author can justify them clearly:

- the PR preserves a lot of incidental complexity when there is a plausible code-judo move that would delete it
- the PR pushes a file from below 1000 lines to above 1000 lines
- the PR adds ad-hoc branching that makes an existing flow more tangled
- the PR solves a local problem by scattering feature checks across shared code
- the PR adds an unnecessary abstraction, wrapper, or cast-heavy contract that makes the design more indirect
- the PR duplicates an existing helper or puts logic in the wrong layer when there is a clear canonical home

If those conditions are not met, leave explicit, actionable feedback and push for a cleaner decomposition.

## Rules

- Every finding = its own inline comment in the `comments` array. Never combine multiple findings into one comment.
- Always submit as `REQUEST_CHANGES` when there are findings. Every comment in this review is `(blocking)` by design.
- NEVER submit a review with event `APPROVE`. Approval is always reserved for a human reviewer. The only valid events for this skill are `REQUEST_CHANGES` (when findings exist) and `COMMENT` (when no findings exist).
- NEVER use `gh pr comment` because an inline comment API call failed. Always fix the line number and retry the review API instead.
- The ONLY acceptable use of `gh pr comment` is for findings that are genuinely not tied to any file at all (e.g., "this PR is missing a database migration entirely"). This should be extremely rare.
- Pauses are confined to the Preparation phase only (gathering Jira requirements and clarifying questions). Once analysis begins, do NOT pause for further clarification and do NOT wait for any human go-ahead before submitting — post the review immediately after completing the analysis.

**Commands Reference (for convenience)**
- PR info: ⁠`gh pr view {{URL_TO_PR}} --json number,title,author,baseRefName,headRefName,mergeable,commits,reviews,comments,files,statusCheckRollup`
- Checkout: ⁠`gh pr checkout {{URL_TO_PR}}`
- Diff scope: `⁠git diff --name-only origin/{{DEFAULT_BRANCH_NAME}}...HEAD`
- Log: `⁠git log --oneline --decorate origin/{{DEFAULT_BRANCH_NAME}}..HEAD`
- PR files (for diff/line mapping): `gh api repos/{owner}/{repo}/pulls/{pr_number}/files --paginate`
- Submit review: `gh api repos/{owner}/{repo}/pulls/{pr_number}/reviews --method POST --input /tmp/review-payload.json`

Use Context7