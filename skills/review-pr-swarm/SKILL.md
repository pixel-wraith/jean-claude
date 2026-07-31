---
name: review-pr-swarm
description: Reviews a GitHub pull request using a swarm of specialist subagents — one each for security, performance, correctness, requirements, standards, docs drift, PR hygiene, test quality, data compatibility, and prior feedback. Every finding is independently verified before posting, then rewritten so a junior engineer can act on it. Posts Conventional Comments as a single PR review. Runs at one of three depths the user picks at kickoff. Use when asked for a swarm review, panel review, multi-agent PR review, or a thorough review of a pull request. Never runs automatically.
allowed-tools: Bash(gh *), Bash(git *), Bash(jq *), Bash(npm *), Read, Write, Edit, Grep, Glob, Agent
---

# review-pr-swarm

Reviews one pull request with a panel of narrow specialists instead of one generalist.

Each specialist looks for exactly one class of problem and ignores everything else. Their
findings are then attacked by an independent verifier before anything reaches the PR. The
goal is a review with high precision — a comment that lands should be a comment worth
reading.

Every comment it posts must be readable by a **junior engineer** who is new to the codebase and
not fluent in the framework's vocabulary. That standard lives in `writing-style.md` and is
enforced twice — once in each reviewer's prompt, and again by a dedicated editor pass before
anything is posted. A correct finding that the author cannot act on has failed.

This skill is **experimental and actively being tuned**. Two files exist to support that:
`CHANGELOG.md` records what changed in the skill and why, and `RUNS.md` records the numbers
from each real run. Both must be maintained — see step 11.

**This skill never runs automatically.** It runs only when the user names it, and it always asks
which depth to run at before doing any work.

---

## Step 1 — Collect inputs

Three inputs. Resolve each in order.

### Pull request URL

If a PR URL or number was provided in the invocation, use it.

If not, ask the user for one. If they still don't provide one, stop and tell them a review
cannot be performed without knowing which pull request to review. Do not guess from the
current branch.

Derive `{owner}`, `{repo}` and `{pr_number}` from the URL. They are needed for the raw API
calls later.

### Depth — ask, every time

**Always ask the user which depth to run at.** Use the `AskUserQuestion` tool, and present all
three options with what each one costs. Do not make the user remember the names or guess what
they mean, and do not pick one for them.

The only exception: if the invocation already names a depth (`quick`, `standard`, `full`, or a
bare `level 1/2/3`), use it and say which one you used. Otherwise ask.

Each depth sets two things at once — how many specialists run, and how severe a finding has to
be before it reaches the pull request.

| Depth | Reviewers | Reports | Roughly |
|-------|-----------|---------|---------|
| **Quick** | correctness, security, pr-hygiene, docs-drift | critical and high only | ~7 agents |
| **Standard** | the above plus performance, standards, test-quality | critical, high, medium — no nitpicks or praise | ~13 agents |
| **Full** | all ten, adding requirements, data-compat, prior-feedback | everything, including nitpicks, questions, and up to 3 praise | ~19 agents |

Phrase the question in plain English. Something like:

> **Which review?**
> - **Quick** — 4 reviewers, ~7 agents. Only blockers and high-severity problems get posted.
>   Right for a small, low-risk change.
> - **Standard** — 7 reviewers, ~13 agents. Real issues but no nitpicks. Right for most PRs.
> - **Full** — all 10 reviewers, ~19 agents. Everything down to nitpicks and style. Right before
>   a release, or on anything touching auth, migrations, or money.

Guidance to offer if the user asks which to pick: anything touching authentication, database
migrations, schema files, API routes, or billing deserves **Full** regardless of how small the
diff looks. A documentation or configuration change is a **Quick**. Most things are **Standard**.

### Dry run

If the invocation contains `dry run`, `dry-run`, or `--dry-run`, this is a dry run. Do the
entire review including verification, then print the exact review payload that *would* have
been submitted — and submit nothing. Do not call any GitHub write endpoint.

State clearly at the top of the final report whether this was a dry run.

---

## Step 2 — Preflight

Run these in order. They are cheap and everything downstream depends on them.

```bash
gh auth status
gh pr view {{URL}} --json number,title,body,author,baseRefName,headRefName,mergeable,commits,reviews,comments,files,statusCheckRollup,additions,deletions,url
gh pr checkout {{URL}}
git fetch --all --prune
```

Record `additions + deletions` — the PR hygiene reviewer needs the total change count.

### Read CI rather than re-running it

```bash
gh pr checks {{URL}}
```

CI has usually already built, typechecked, linted and tested this branch. Do **not** re-run
that work locally by default. Capture the check results and pass them to the reviewers as
context so they can cite real failures instead of speculating.

Run something locally **only** when CI did not cover it or did not run at all. If CI is
entirely absent, run the fast checks that give reviewers real signal:

```bash
npm run check   # or: npm run typecheck / tsc --noEmit
npm run lint
```

Do not start docker or run the full test suite unless the user asks for it. Do not report
build, lint, test or CI status as review comments — that is CI's job, not the panel's.

### Build the valid-comment-line map

Inline comments are rejected by the GitHub API unless the line appears in the diff. Fetch
the diff and build the map **before** any reviewer runs, then hand it to them.

```bash
gh api repos/{owner}/{repo}/pulls/{pr_number}/files --paginate > /tmp/pr-swarm-files.json
```

Each entry has a `filename` and a `patch` in unified diff format. For each `@@ -a,b +c,d @@`
hunk header, `+c` is the first line number on the RIGHT side (the new file). Walking the
hunk body:

- Lines starting with `+` or a space exist on the RIGHT side — increment the RIGHT counter.
- Lines starting with `-` or a space exist on the LEFT side — increment the LEFT counter.

Only line numbers produced by that walk are valid comment targets.

### Find the requirements

The requirements reviewer needs something to check the code against. Gather what exists:

1. **Linked GitHub issue** — look for `closes #N`, `fixes #N`, `#N` in the PR title, body and
   branch name. Fetch with `gh issue view N --json title,body,comments`.
2. **Linked Jira issue** — look for a Jira key like `ABC-123` in the PR title, body or branch
   name. If `JIRA_BASE_URL`, `JIRA_EMAIL` and `JIRA_API_TOKEN` are all set in the
   environment, fetch it:
   ```bash
   curl -s -H "Authorization: Basic $(printf '%s:%s' "$JIRA_EMAIL" "$JIRA_API_TOKEN" | base64)" \
     -H "Accept: application/json" \
     "$JIRA_BASE_URL/rest/api/3/issue/ABC-123"
   ```
   If those variables are not set, skip Jira silently. Do not prompt for credentials.
3. **PR description** — always available, always included.
4. **Plan file** — if the PR body or issue references a file under `plans/` or a `*.spec.md`,
   read it.

Pass everything found to the requirements reviewer. If **nothing** is found, still run the
reviewer and tell it so — the absence of a stated requirement is itself a finding.

---

## Step 3 — Select the roster

Ten reviewers live in `reviewers/`. **The depth chosen in step 1 decides which of them run.**

| Reviewer | File | Quick | Standard | Full |
|----------|------|:-----:|:--------:|:----:|
| Correctness | `reviewers/correctness.md` | ✓ | ✓ | ✓ |
| Security | `reviewers/security.md` | ✓ | ✓ | ✓ |
| PR hygiene | `reviewers/pr-hygiene.md` | ✓ | ✓ | ✓ |
| Docs drift | `reviewers/docs-drift.md` | ✓ | ✓ | ✓ |
| Performance | `reviewers/performance.md` | | ✓ | ✓ |
| Standards | `reviewers/standards.md` | | ✓ | ✓ |
| Test quality | `reviewers/test-quality.md` | | ✓ | ✓ |
| Requirements | `reviewers/requirements.md` | | | ✓ |
| Data & compatibility | `reviewers/data-compat.md` | | | ✓ |
| Prior feedback | `reviewers/prior-feedback.md` | | | ✓ |

Why these four make up Quick: correctness finds the bugs, security is the one class of miss that
is expensive enough to be worth paying for on every review, and PR hygiene and docs drift are
cheap, apply to every PR regardless of what it touches, and enforce rules this project states
in absolute terms.

### Then drop any that have nothing to look at

On top of the depth, skip a selected reviewer when the diff contains **literally nothing** in
its domain. The bar is "this agent is guaranteed to return nothing," not "this agent probably
won't find much."

- **Test quality** — skip when the diff has no source or test files at all (a docs-only or
  config-only PR).
- **Data & compatibility** — skip when the diff touches no migration directory, no schema file,
  and no exported public interface.
- **Prior feedback** — skip when the PR has no existing review comments.

The other seven always run when their depth includes them.

Say in the final report which depth was used, which reviewers ran, and which were skipped and
why. A reviewer that was not selected and a reviewer that found nothing look identical
otherwise.

---

## Step 4 — Launch the panel

Launch **all selected reviewers in a single message** so they run concurrently — one `Agent`
tool call per reviewer, all in the same response. Use the `general-purpose` agent type.

Each agent's prompt instructs it to read two files before doing anything else:

1. Its own file in `reviewers/` — what to look for, and what to leave alone.
2. `writing-style.md` — how to write a finding so a junior engineer can act on it.

Both are mandatory. State in the prompt that a finding a junior engineer cannot act on without
asking someone what it means has failed, however correct it is.

The prompt then carries a context block:

```
## Pull request under review

Repository: {owner}/{repo}
PR: #{pr_number} — {title}
URL: {url}
Base branch: {baseRefName}
Total changes: {additions + deletions}
Branch is checked out at the repository root; read any file you need.

## PR description

{body}

## Changed files

{list of filenames with additions/deletions per file}

## Valid comment lines

{for each file, the RIGHT-side and LEFT-side line numbers that appear in a diff hunk}

## CI results

{output of gh pr checks, or "CI has not run"}

## Requirements sources
{only for the requirements reviewer — issue body, Jira issue, plan file, PR description}

## Existing review comments
{only for the prior-feedback reviewer — the PR's review comments and reactions}
```

Do **not** tell reviewers the depth or what it filters out. They report everything they find at
its true severity; filtering happens once, centrally, in step 6. A reviewer told "only high and
critical count today" will quietly inflate a nitpick to clear the bar, which makes the filter
unauditable and the severity ratings worthless.

### Required output shape

Every reviewer file already instructs the agent to return findings as a sequence of fenced
blocks. Restate the requirement in the launch prompt:

````
Return your findings as zero or more blocks in exactly this format, and nothing else
besides a one-line summary at the end:

```finding
domain: performance
file: src/lib/server/digest/build.ts
line: 42
side: RIGHT
anchored: yes
label: issue
severity: high
subject: The digest asks the database for repositories one at a time instead of all at once
discussion: This loop builds the daily digest by going through each repository the
  installation has. For every repository it makes its own separate request to the database.
  With 40 repositories that is 40 separate round trips every time a digest is built, where
  one request asking for all 40 would do. Each round trip has a fixed cost, so the digest
  gets slower in direct proportion to how many repositories a customer connects — the
  customers with the most repositories wait the longest. (This pattern is common enough to
  have a name, the "N+1 query", which is worth searching for.)
recommendation: Collect the repository ids into an array first, then make one query using
  `inArray(repo.id, ids)`, and match the results back up in memory.
evidence: src/lib/server/digest/build.ts:40-46 — `for (const repo of repos) { await db.select()... }`
```

Field rules:
- `domain` — your reviewer name, always.
- `file` / `line` / `side` — omit and set `anchored: no` when the finding is not tied to a
  line in this diff. Otherwise `line` MUST be one of the valid comment lines given above.
- `label` — one of: issue, suggestion, nitpick, question, todo, chore, note, praise, thought.
- `severity` — one of: critical, high, medium, low, nit.
- `evidence` — a real file:line reference and a quoted fragment. A finding with no evidence
  will be discarded, so do not submit one.
- `subject`, `discussion`, `recommendation` — written to the standard in `writing-style.md`.
  Note how the example above explains what the code is doing before saying what is wrong with
  it, states the cost in terms of what a customer experiences, and explains the concept before
  naming it. Do that.

If you find nothing, return exactly `NO FINDINGS` and a one-sentence explanation of what
you checked.
````

---

## Step 5 — Merge overlapping findings

Collect every finding from every reviewer. Then compare them pairwise on `file` + `line`:

- **Same location, same underlying problem** → merge into one finding. Keep the clearer
  wording, keep the highest severity, and list both domains in the footer
  (`— performance, correctness reviewers`).
- **Same location, different problems** → keep both. A security concern and a performance
  concern on one line are two comments, not one. Do not collapse them just because they
  share a line number.
- **Different locations** → always keep both, even if the wording is similar.

"Same underlying problem" means the same root cause, not the same symptom. Two reviewers
saying "this promise is unhandled" is one finding; "this promise is unhandled" and "this
promise leaks a connection" are two.

---

## Step 6 — Apply the reporting level

**Do this before verifying, not after.** Verification costs one agent per finding, and a finding
the depth is going to discard can never reach the pull request no matter what a verifier decides
about it. Filtering first means the expensive stage only ever runs on findings that can actually
be posted.

Filter the merged findings by the depth chosen in step 1:

- **Full** — keep everything. Cap `praise` findings at 3; discard the rest of the praise.
- **Standard** — keep `critical`, `high`, `medium`. Discard `low`, `nit` and all praise.
- **Quick** — keep `critical` and `high`. Discard everything else.

Findings removed here are **suppressed**, not refuted. They were never checked, so do not
describe them to the user as though they were confirmed or dismissed — they are findings a
reviewer raised that this depth does not report. List them separately in step 9 so the user can
see what a deeper run would have surfaced.

On the #229 test run this ordering was worth nine agents: 17 findings reached this point and
only 8 survived a Standard filter, so the other 9 would have been verified and then thrown away
unread.

---

## Step 7 — Verify every surviving finding

**This is the step that makes the swarm usable. Do not skip it, and do not skip it for
low-severity findings.**

Launch one verifier agent per finding that survived step 6, batched in parallel — several `Agent` calls per
message. Use the `general-purpose` agent type with the contents of `verifier.md` as the
prompt, plus the finding itself.

The verifier's job is to **refute** the finding. It reads the actual code, not the summary,
and returns `VERDICT: refuted` or `VERDICT: stands` with a one-line reason. It is instructed
to refute when uncertain.

Findings that are refuted **never reach the PR**. Keep them — they are reported to the user
in step 9 and they are the primary signal for tuning the reviewer prompts.

---

## Step 8 — Rewrite everything for the reader

Reviewers are specialists, and specialists write for other specialists. Left alone they produce
findings that are correct and unreadable — "the page is bfcache-eligible and SvelteKit's hook
only resets `navigating`" is a real sentence a reviewer wrote about a stuck button.

Launch **one** editor agent. Not one per finding — one for the whole review. Give it
`editor.md` as its prompt, followed by every finding that survived verification in step 7, in the block format
they arrived in.

One agent handles all of them because the review should read as a single voice. Ten separately
edited comments arrive in ten different registers, which reads to the author like being
reviewed by a committee.

The editor rewrites `subject`, `discussion` and `recommendation` only. It does not change
severity, labels, file paths, line numbers, the `anchored` flag, or what any finding claims —
those were settled by the specialist and the verifier, and the payload is built from them.

Expect the rewritten comments to be **longer**. That is the point, not a regression.

If the editor returns a finding with a changed file path, line number, or severity, discard its
version of that field and keep the original. Everything else it returns is authoritative.

---

## Step 9 — Compose and post the review

### Comment format

Every comment follows [Conventional Comments](https://conventionalcomments.org). The
decoration carries the severity, so there is no separate severity tag.

```
<label> (<decoration>): <subject>

<discussion>

**Recommendation:** <recommendation>

_— <domain> reviewer_
```

Severity maps to decoration:

| Severity | Decoration | Meaning |
|----------|-----------|---------|
| critical, high | `(blocking)` | Must be resolved before merge |
| medium | `(non-blocking)` | Should be addressed, does not gate the merge |
| low, nit | `(if-minor)` | Take it or leave it |

Labels follow the Conventional Comments vocabulary — `issue` for a defect, `suggestion` for a
concrete alternative, `nitpick` for a trivial preference, `question` where the reviewer needs
information, `todo` for a small required change, `chore` for process work, `praise` for
something done notably well, `thought` for a non-actionable observation, `note` for
information the author should have.

The subject line is one sentence, no trailing period, written in plain English. The discussion
explains why it matters — not just what the rule is.

### Anchored findings become inline comments

Each anchored finding is one entry in the review's `comments` array with `path`, `line`,
`side` and `body`. Never combine two findings into one comment.

### Unanchored findings go in the review body

Findings with `anchored: no` — PR hygiene, and docs drift on a file the PR never touched —
cannot be attached to a diff line. They go in the review body under a heading, formatted
identically:

```
{n} blocking · {m} non-blocking · {k} optional

**Not tied to a line**

issue (blocking): PR is 480 changes, over the 300 ceiling

This project caps pull requests at 300 insertions plus deletions...

_— pr-hygiene reviewer_
```

If every finding is anchored, the body is just the one-line count.

### Verdict

| Condition | Event |
|-----------|-------|
| At least one `(blocking)` finding | `REQUEST_CHANGES` |
| Findings exist but none are blocking | `COMMENT` |
| No findings at all | `APPROVE` |

### First: is the reviewer also the author?

**GitHub does not let you review your own pull request with a verdict.** Both `REQUEST_CHANGES`
and `APPROVE` are rejected with a 422 — `Can not request changes on your own pull request` and
the equivalent for approval. Only `COMMENT` is permitted. In a one-person repository that is
every single review, so do not discover it by failing — check first.

```bash
gh pr view {{URL}} --json author --jq '.author.login'   # who wrote the PR
gh api user --jq '.login'                               # who gh is authenticated as
```

**If those two match, the event is always `COMMENT`.** There is no case where a self-review can
carry a verdict, so do not attempt one and do not build a fallback for it.

The verdict table above still decides what the review *means*. It just cannot be expressed as a
GitHub event, so it has to be said in words instead:

| Verdict the findings warrant | Event sent | What the body must say |
|------------------------------|-----------|------------------------|
| `REQUEST_CHANGES` | `COMMENT` | that it would request changes, and that the blocking findings still gate the merge |
| `COMMENT` | `COMMENT` | nothing extra — the event already matches the meaning |
| `APPROVE` | `COMMENT` | that nothing was found and it would have approved |

**Say it at the very top of the body, above the counts.** A review carrying two blocking findings
that arrives as a neutral comment reads as though nothing is wrong, and an empty comment review
reads as though the run broke. Both are worse than the 422 was.

For a would-be `REQUEST_CHANGES`:

```
> **This review would request changes.** GitHub does not allow a verdict on your own pull
> request, so it is posted as a comment. The blocking findings below still need resolving
> before merge.
```

For a would-be `APPROVE`:

```
> **This review would approve.** GitHub does not allow a verdict on your own pull request, so
> it is posted as a comment. No findings survived verification at this depth.
```

Report the same thing in step 10, so a `COMMENT` verdict is never mistaken for "nothing serious
was found" — and an empty review is never mistaken for a failed run.

### Validate, then submit

Build the payload with `jq` so bodies are escaped correctly. Do not build JSON with heredocs.

```bash
jq -n \
  --arg event "REQUEST_CHANGES" \
  --arg body "$REVIEW_BODY" \
  --argjson comments "$COMMENTS_JSON" \
  '{event: $event, body: $body, comments: $comments}' > /tmp/pr-swarm-payload.json
jq . /tmp/pr-swarm-payload.json   # must parse
```

Before submitting, confirm for every comment: `path` matches a `filename` from the files API;
`line` is in the valid-line map from step 2; `side` is set.

**If this is a dry run, stop here.** Print the payload and the report from step 9. Submit
nothing.

Otherwise:

```bash
gh api repos/{owner}/{repo}/pulls/{pr_number}/reviews \
  --method POST --input /tmp/pr-swarm-payload.json
```

On a 422, read the message before doing anything — there are two unrelated causes and they need
opposite responses.

**A self-review error** — `Can not request changes on your own pull request`, or the equivalent
for approval. The author check above should have caught this, so reaching here means the check
failed rather than the payload being wrong. Do not touch the comments. Resend the identical
payload with `event` set to `COMMENT`, and add the appropriate notice to the top of the body.
Then work out why the check missed: usually the PR author and the authenticated `gh` account
differ in case, or `gh` is authenticated as a different account than expected.

**Anything naming a file or line** — an inline comment is anchored somewhere GitHub will not
accept. Re-derive that file's valid lines from the diff, fix the payload, resubmit. **Never**
fall back to `gh pr comment` because an inline comment failed — fix the line and retry the
review endpoint.

---

## Step 10 — Report to the user

Print this in the terminal. It is the tuning signal and it is the reason the skill is worth
running twice.

```
review-pr-swarm · PR #41 · Standard · dry run: no

Posted 6 · suppressed 0 · refuted 5
Verdict: COMMENT (would have been REQUEST_CHANGES — you authored this PR,
  and GitHub allows no verdict on your own. 2 blocking findings still
  need resolving.)

Reviewers run: security, performance, correctness, requirements, standards,
  docs-drift, pr-hygiene, test-quality
Skipped: data-compat (no schema or migration files), prior-feedback (no prior comments)

Refuted (never posted):
  performance · digest/build.ts:42 · "N+1 query in repo loop"
    → refuted: the loop body runs once per installation, and installations are
      fetched one at a time by the caller
  security · routes/login/+page.server.ts:18 · "missing CSRF token"
    → refuted: SvelteKit form actions carry CSRF protection by default

Not reported at this depth (raised, never verified):
  docs-drift · directory-map.md:109 · "forward-looking sentence will go stale" (nit)
  performance · +page.svelte:129 · "hover preloads 11 KB" (low)
  → Full would have checked and reported these.
```

Always list refuted findings with the verifier's reason. Always list suppressed findings when
the depth held anything back — and be precise that those were never verified, so they are
neither confirmed nor dismissed. If a reviewer returned nothing, say so, and name the reviewers
the depth did not select at all. A reviewer that found nothing, a reviewer that was skipped for
having nothing to look at, and a reviewer the depth never ran look identical otherwise.

---

## Step 11 — Record the run

Append one row to `RUNS.md` in this skill's directory:

```
| 2026-07-30 | merge-lantern#41 | 3 | 8 | 11 | 5 | 0 | 6 | perf over-eager on bounded loops |
```

Columns are: date, PR, depth, reviewers run, raw findings, refuted, suppressed, posted, notes.
The notes column is the important one — write what went wrong, not what went right.

**When the skill itself changes** — a reviewer prompt edited, a step reworked, a threshold
moved — add an entry to `CHANGELOG.md` with the date, what changed, and the observed problem
that prompted it. A change with no stated cause is not a change worth keeping.

---

## Rules

- Every finding is its own comment. Never bundle.
- Never post an unverified finding.
- Never post a comment a junior engineer could not act on without asking someone what it means.
  Being correct is the floor, not the bar — see `writing-style.md`.
- Never post a technical term the comment has not already explained in ordinary words.
- Never post build, lint, test or CI status. That is CI's job.
- Never use `gh pr comment`. Everything goes through the reviews endpoint, inline or in the body.
- Never pause for approval before posting on a non-dry run.
- Reviewers stay in their lane. A security reviewer that reports a naming nitpick is a bug in
  its prompt — fix the prompt and record it in `CHANGELOG.md`.
- Reviewers may use Context7 to check current library documentation before claiming a library
  is being misused.
