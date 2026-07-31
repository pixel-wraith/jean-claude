# review-pr-swarm — change history

Every change to this skill gets an entry here: what changed, and the observed problem that
prompted it. A change with no stated cause is not a change worth keeping.

Add new entries at the top. Include the date, a version, and a **Why** that names real evidence
— a run in `RUNS.md`, a false positive that got posted, a finding that was missed.

---

## 2026-07-31 — v0.5 — knows it cannot request changes on your own pull request

**Why.** The first real run (merge-lantern#244, logged in `RUNS.md`) submitted `REQUEST_CHANGES`
and GitHub rejected it with a 422: `Can not request changes on your own pull request`. The run
recovered by resending as `COMMENT`, but it should never have made the failing call — in a
one-person repository the reviewer is always the author, so this happens on every single review.

**What changed.**

- **The author is checked before the review is submitted.** Step 9 now compares the PR author
  against the authenticated `gh` account. When they match, a verdict of `REQUEST_CHANGES` is sent
  as `COMMENT` instead, with no failed request in between.

- **The downgrade is stated in the review body and in the terminal report.** This is the part
  that actually matters. A review carrying two blocking findings that arrives as a plain
  `COMMENT` reads as though nothing serious was found. The body now opens with a note saying the
  review would have requested changes and that the blocking findings still need resolving, and
  step 10 prints the same thing so the verdict is never silently softened.

- **The 422 handler distinguishes two causes.** It previously assumed every 422 meant a bad
  inline comment line and told you to re-derive line numbers — useless advice for a self-review
  rejection. It now reads the message: a self-review error means resend with a different event
  and leave the comments alone; anything naming a file or line means fix the anchor.

**What is deliberately unresolved.** Whether GitHub blocks self-*approval* the same way is not
known. The `REQUEST_CHANGES` restriction is confirmed by observation; `APPROVE` has not been
tested here, and GitHub's REST documentation for the reviews endpoint says nothing about
self-review restrictions in either direction. Rather than guess, the skill attempts `APPROVE` and
falls back to `COMMENT` on a 422, and the text says plainly that this one is unverified. The
first run that settles it should record the answer in `RUNS.md` and replace the hedge with a
fact.

---

## 2026-07-30 — v0.4 — three depths, chosen by the user, and a cheaper pipeline

**Why.** v0.3 made this the automatic post-`gh pr create` review. Measuring it honestly, that was
about 28 subagents on every pull request — worth it on a migration, absurd on a one-line config
fix. Jake's call: stop guessing which is which, take the automation out, and let him pick the
depth per PR from a prompt that shows the options.

**What changed.**

- **Automatic review removed.** `pr-creation-reviewer` is dormant: its description now says do
  not launch, and its body explains why and what to do instead. Kept rather than deleted so the
  change is reversible from git history. Creating a PR now ends at the PR link.

- **Three depths replace the 1-3 reporting level.** One choice sets both how many specialists run
  and how severe a finding must be to post, so there is only ever one question to answer:

  | Depth | Reviewers | Reports | Roughly |
  |-------|-----------|---------|---------|
  | Quick | correctness, security, pr-hygiene, docs-drift | critical + high | ~7 agents |
  | Standard | + performance, standards, test-quality | + medium, no nitpicks | ~13 agents |
  | Full | all ten | everything incl. nitpicks and praise | ~19 agents |

  Correctness and security are in Quick because bugs and security misses are the expensive
  things to miss. PR hygiene and docs drift are in Quick because they are cheap, apply to every
  PR whatever it touches, and enforce rules this project states absolutely.

- **The skill now asks, every time.** Step 1 uses `AskUserQuestion` with all three options and
  their costs spelled out. It only skips the question if the invocation already named a depth.
  Previously it silently defaulted to level 3 — the most expensive and noisiest setting — which
  is a poor thing to do by default when the user has not said anything.

- **The reporting filter moved before verification.** This was an ordering bug, and it was the
  single largest waste in the pipeline. Verification costs one agent per finding, and the skill
  was verifying every finding and *then* discarding the ones the level would suppress. On the
  #229 run, 17 findings reached that point and only 8 survived a Standard filter — so 9 agents
  were spent checking findings that could never be posted.

  Step order is now: merge → filter by depth → verify → edit → post.

  One consequence worth being honest about in the report: suppressed findings are now *unverified*.
  Previously they were checked and then dropped, so we knew whether they were real. Now they are
  neither confirmed nor dismissed, and step 9 must say so rather than implying they were vetted.

**Net effect on the #229 diff:** 28 agents at the old flat setting, versus roughly 7 / 13 / 19
depending on the depth chosen.

**Still outstanding** — the five items under v0.2 are unchanged. One of them (the verifier
noticing an inflated severity with no way to act on it) gets slightly more load-bearing now that
severity decides whether a finding is verified at all, not just whether it is posted.

---

## 2026-07-30 — v0.3 — promoted to the default PR review

**Why.** Jake asked for the automatic post-`gh pr create` review to run this skill instead of
`review-pr`.

**What changed.**

- **`~/.claude/agents/pr-creation-reviewer.md`** now invokes `review-pr-swarm` rather than
  `review-pr`, passing `level 2` explicitly.

- **This skill's description and header** said the opposite of what is now true. The description
  read "Use ONLY when explicitly asked", and the body carried a bold "This skill never runs
  automatically. It runs only when the user names it." Both would have fought the agent trying to
  fire it. Corrected.

- **Level 2 on automatic runs, not the skill's own default of 3.** Level 3 posts nitpicks and up
  to three praise comments. That is the right setting for a review someone deliberately asked
  for; posted unasked on every pull request including one-line fixes, it reads as noise. Running
  by hand still defaults to 3.

  Worth being clear that this is not a cost saving — the level filters output only, so every
  reviewer still runs at full depth at every level. What changes is how much reaches the PR.

- **The `pr-feedback-evaluator` agent is no longer chained on afterwards.** That agent exists to
  catch false positives in `review-pr`'s output. This skill already does that internally: every
  finding is attacked by an independent agent instructed to refute it, and roughly half do not
  survive. Running the evaluator on top would re-check work already checked.

  (The old agent text claimed `review-pr` launches the evaluator itself. Reading `review-pr`'s
  SKILL.md, it does not — so that instruction was already inaccurate before this change.)

- **The agent is told to relay the posted / refuted / suppressed counts** rather than summarise
  them. Those numbers are the tuning signal, and an orchestrator that swallows them makes the
  run log in `RUNS.md` impossible to fill in honestly.

**Cost, stated plainly.** Every `gh pr create` now spends roughly 10 reviewer agents, one
verifier per surviving finding, and one editor — on the two #229 runs that came to 27-28 agents.
`review-pr` was one agent. If that turns out to be too much for routine PRs, the first lever is
trimming the roster rather than skipping verification, since verification is what makes the
output trustworthy.

**Still outstanding** — the five items listed under v0.2 are unchanged and unfixed.

---

## 2026-07-30 — v0.2 — every comment must be readable by a junior engineer

**Why.** The first dry run (merge-lantern#229, logged in `RUNS.md`) produced findings that were
accurate and unreadable. One comment about a stuck button opened with "the page is
bfcache-eligible and SvelteKit's hook only resets `navigating`" — four unexplained concepts in
one sentence. Others used "mutation-tested", "border box", "trust boundary", "strict-mode
multiple-match failure", and bare references to issue #197 and commit hashes with no
explanation of what any of them were.

Nothing in v0.1 asked reviewers to write for a human. The reviewer prompts were entirely about
what to look for and what to ignore, and said nothing about how to say it. Specialists left to
themselves write for other specialists.

**What changed.**

- **New `writing-style.md`** — the standard, in one place. Eight hard rules (explain every term
  on first use, say what the code does before what is wrong with it, state consequences in terms
  of what a person experiences, numbered repro steps, never reference something the reader
  cannot see, actionable recommendations, short active sentences, never imply carelessness),
  the shape of a good comment, three before/after examples taken from the actual #229 run, and a
  pre-submit checklist.

- **New `editor.md` and a new step 7** — one editor agent receives every verified finding and
  rewrites `subject`, `discussion` and `recommendation` before the level filter runs. It cannot
  change severity, labels, paths, line numbers, or what a finding claims.

  Why an editor rather than trusting the prompts: the same run showed a prompt instruction is
  not self-enforcing. The standards reviewer was explicitly told to cite a written rule for
  every finding and did not manage it once in three attempts. A rule that only lives in a prompt
  is a suggestion.

  Why *one* editor rather than one per finding: it is cheaper, and more importantly it sees
  every comment at once, so the review lands in a single voice. Ten separately edited comments
  read like being reviewed by a committee.

- **All ten reviewer files** gained a "How to write it up" section pointing at
  `writing-style.md`, including the warning that the editor can only polish what it is given —
  a thin explanation stays thin.

- **The example finding in `SKILL.md`** was rewritten to demonstrate the standard rather than
  violate it. The old one said "Digest query runs once per repo instead of batching"; the new
  one explains what the loop does, what it costs a customer with 40 repositories, and names the
  N+1 pattern only *after* explaining it.

**Expected cost.** Comments get roughly twice as long, and each run adds one agent. Both were
accepted deliberately — a comment that takes thirty seconds longer to read and can actually be
acted on beats a terse one that gets skimmed.

**Still outstanding from the #229 run** — surfaced, not yet fixed, awaiting a decision:

1. The severity-to-decoration table produces `praise (if-minor)`, which is meaningless. The
   run emitted a bare `praise:` instead. The table needs a praise exception.
2. Step 2 runs `gh pr checkout` unconditionally. On #229 the PR was already merged into `HEAD`
   and the working tree had unrelated uncommitted changes, so checking out was both pointless
   and disruptive. Needs a merged-PR path and a dirty-tree guard.
3. The standards reviewer's "cite a written rule" constraint is not binding — 0 of 3 findings
   survived verification, all of them unwritten preferences.
4. "Pre-existing, not introduced by this diff" killed four findings across three reviewers. It
   appears in every reviewer file but only as a bullet in a list. It should be a hard gate near
   the top of each prompt.

---

## 2026-07-30 — v0.1 — initial version

First version of the skill. Untested against a real pull request.

**What it does.** Ten specialist reviewers run in parallel against one PR, each one narrow and
each one explicitly forbidden from reporting outside its domain. Their findings are merged,
then every surviving finding is attacked by an independent verifier told to refute it. What
survives is filtered by the reporting level and posted as a single GitHub review using
Conventional Comments.

**Design decisions and why.** These were settled by interview before anything was written, and
are recorded here because several of them are the kind of thing that gets quietly reversed
later without anyone remembering the reasoning.

- **Agent tool rather than the Workflow tool.** The Workflow tool would give schema-enforced
  findings and a per-run journal, which is better tooling. But the question worth answering
  first is whether specialist-per-domain review produces better reviews at all, and that is
  cheaper to answer with the simpler mechanism. Moving to Workflow is the obvious v2 if
  interpreting prose findings into inline comments turns out to be the weak link.

- **Reviewer prompts live in this folder, not in `~/.claude/agents/`.** They will be tuned
  constantly, and the tuning history belongs next to the changelog that explains it. The
  trade-off is that these reviewers cannot be invoked standalone.

- **The reporting level filters output only.** An earlier draft had level 1 running a reduced
  roster at lower depth, which would have made a level-1 review cheap. That was rejected: the
  panel always runs in full, and the level only decides how much reaches the pull request. A
  level-1 review costs what a level-3 review costs. The benefit is that a critical finding can
  never be missed because a cheaper mode skipped the reviewer that would have caught it.

- **Every finding is verified, including nitpicks.** Verifying only high-severity findings was
  considered and rejected. Low-severity noise is precisely what makes a fan-out review tiring to
  read, so it needs the same filter.

- **Refuted findings are reported to the user, not silently dropped.** They are the primary
  signal for which reviewer prompt is too eager. Same for findings suppressed by the level.

- **The decoration carries severity; there is no separate severity tag.** `issue (blocking)`
  already says must-fix. The existing `review-pr` skill puts a `(Blocker)` tag in the title,
  which under Conventional Comments would be saying the same thing twice.

- **Comments carry a reviewer footer.** `_— performance reviewer_`. This exists to trace a bad
  comment back to the prompt that produced it. It is scaffolding for the tuning period and can
  be removed once the prompts settle — record that here when it happens.

- **The verdict is honest.** `REQUEST_CHANGES` only when something is genuinely `(blocking)`.
  `review-pr` always requests changes on any finding, which at level 3 would mean a pile of
  nitpicks formally gates a merge.

- **CI is read, not re-run.** `review-pr` does a full local build, typecheck, lint, format check
  and test run before reviewing. CI already did that on the PR. Local runs are for filling gaps.

- **Unanchored findings go in the review body.** PR hygiene findings have no file and line, and
  docs-drift findings usually point at a file the PR never touched — GitHub rejects inline
  comments on files absent from the diff. Putting them in the body keeps the whole review as one
  GitHub event.

- **A default level of 3.** Deliberately noisy while the skill is being evaluated: better to see
  everything the panel can produce and decide what to filter than to discover later that level 2
  was hiding something useful. Revisit once it is in routine use.

- **Coexists with `review-pr`; never fires automatically.** `review-pr` stays the default,
  including what `pr-creation-reviewer` triggers after `gh pr create`. This one runs only when
  named, which keeps the existing flow safe and allows running both on the same PR to compare.

**Known gaps, to be resolved by testing.**

- No idea yet what the real false-positive rate is, or which reviewer is worst. That is what
  `RUNS.md` is for.
- The merge step in step 5 is judgement-based. If it turns out to collapse findings it should
  have kept, it needs tighter rules.
- Ten reviewers plus one verifier per finding is a meaningful cost per review. Downgrading the
  verifier to a cheaper model is the first lever if cost becomes the blocker — but it degrades
  the component the whole design rests on, so try trimming the roster first.
- Reviewers are not told the reporting level, on purpose, so that filtering is auditable in one
  place. This means level 1 pays for findings that are discarded unread.
