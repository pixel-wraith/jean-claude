# review-pr-swarm — change history

Every change to this skill gets an entry here: what changed, and the observed problem that
prompted it. A change with no stated cause is not a change worth keeping.

Add new entries at the top. Include the date, a version, and a **Why** that names real evidence
— a run in `RUNS.md`, a false positive that got posted, a finding that was missed.

---

## 2026-08-04 — v0.9 — the standards reviewer must cite a rule, mechanically

**Why.** `standards.md` already told the reviewer to quote the convention it was applying and say
where it came from, and that a finding without one "is your taste and must not be posted". The
reviewer ignored it. On the #229 run it produced three findings and all three were refuted:

- a comment style it claimed the project used, where the form it demanded appears in **zero**
  files of that type and the sibling page does exactly what the diff did
- a claim that a decorative character was the only unhidden one in the codebase, which was
  factually wrong — the same file had several
- a colour-contrast threshold the reviewer itself conceded was written down nowhere, objecting to
  something the shared link component already does

Each cost a verifier agent to disprove.

**The uncomfortable bit.** Run 2 produced zero findings from this reviewer and listed seven
candidates it had dropped with reasons, which looks like the file working. It was not — the
correction was in that run's launch prompt, written by hand:

> "In a previous run all three findings from this reviewer were thrown out at verification
> because they were unwritten preferences dressed as standards. Do not repeat that."

So run 2 showed the instruction works when it is forceful and up front, not that the file was
fixed. In the file it still sat at line 82 of 105, after everything else.

**What changed.** The instruction is now a required field rather than a request. Standards
findings carry a `rule` field naming the convention and its source — a document path with a
quoted line, or two or more sibling files establishing an unwritten pattern. Step 5 discards any
standards finding whose `rule` is missing or vague **before merging and before verification**, and
step 10 reports the count next to the refuted ones so a reviewer that starts failing the check is
visible rather than silently quiet.

Two things follow from putting the gate before verification rather than after. A preference-shaped
finding now dies for free instead of costing an agent to refute. And the reviewer file leads with
the requirement and the three failures that produced it, rather than closing with a note.

**Why this reviewer alone gets a field no other has.** Its own severity table says `critical —
essentially never`. It is the only reviewer whose entire job is judging against rules that may
not exist, so the line between "documented convention" and "my taste" is thinner here than
anywhere else on the panel.

---

## 2026-08-01 — v0.8 — stops assuming `gh pr checkout` will work

**Why.** Step 2 ran `gh pr checkout` unconditionally. It breaks in three situations, and all
three were true of this project at the same moment while writing this entry:

- **Dirty working tree.** Checking out drags uncommitted work onto another branch. Hit on the
  #229 run, where the tree had unrelated changes that had to be protected by hand.
- **Merged PR, branch deleted.** GitHub deletes the head branch on merge by default, so there is
  nothing left to fetch. `gh pr checkout 237` has nothing to do.
- **Code already at HEAD.** If the PR was merged into the branch you are on, checking out
  achieves nothing. Also hit on #229, where HEAD *was* the squash-merge of the PR under review.

Both real runs worked around this by hand. The skill's own step 2 has never successfully run
against a merged pull request.

**What changed.** Step 2 now decides rather than assumes, taking the first case that applies:
already at the PR's state → do nothing; clean tree → check out; dirty tree → **stop and ask**,
never stash or force, because the user's uncommitted work is not the skill's to move.

**The useful discovery:** GitHub keeps `refs/pull/N/head` indefinitely, even after the branch is
deleted. Verified by fetching PR #237's head — `c8c3fe6` — long after its branch was gone, without
touching the working tree. So merged PRs are fully reviewable; the skill was simply using the
wrong mechanism to reach them. That is now the documented fallback.

**The honest limitation of that fallback:** files can be read with `git show FETCH_HEAD:<path>`,
but nothing can be *run*. That matters more than it sounds — the most reliable findings across
both runs came from verifiers that executed something (mutation tests, a real build, a browser
measurement) rather than reasoning about it. So the reviewer context block now states which of
the three situations applies and whether running tests is possible, because a reviewer that
expects a test suite and cannot find one will report its absence as a finding.

The context block also now lists any unrelated uncommitted files and says they are not part of
the PR. On #229 that had to be added by hand to stop reviewers reviewing them.

**Considered and rejected:** an isolated `git worktree`, which would never touch the user's tree
at all. Rejected because a fresh worktree has no `node_modules` — 691 MB in this project — so
every reviewer wanting to run the suite would need an install first, or fall back to reading.
Sharing `node_modules` by symlink was also rejected: a PR that changes a dependency would then be
tested against the wrong tree, and a test passing or failing for the wrong reason is worse than
not running it.

---

## 2026-07-31 — v0.7 — every comment must ask for something: praise, thought and note removed

**Why.** The severity-to-decoration table applied a decoration to every finding, which produced
`praise (if-minor)` on the #229 run — a compliment marked "take it or leave it".

The narrow fix was a decoration exception for praise. Following the reasoning out instead: the
problem is not the decoration, it is that three of the nine labels ask the author for nothing.
`praise`, `thought` and `note` are all "here is something interesting" comments, and they break
the review twice over.

They make the reader do sorting the review should have done. Every other comment carries an
implicit "and therefore do this"; one that does not forces the author to read it through before
discovering nothing was asked.

And they cannot take a decoration honestly, because a decoration says what the author must *do*.
`praise (if-minor)` is a compliment you may ignore. `thought (blocking)` is a non-actionable
observation you must resolve before merge.

**What changed.** The vocabulary is six labels, not nine: `issue`, `suggestion`, `nitpick`,
`question`, `todo`, `chore`. All six ask for something, so the decoration table now applies
cleanly to every one with no exceptions — removing the labels deleted the bug rather than
special-casing it.

Also gone: Full's "cap praise at 3" rule and Standard's "discard all praise" clause. Two special
cases removed from the reporting filter.

Reviewers are told explicitly that the three labels do not exist, so one does not get invented,
and are told what to do instead — an observation worth the author's attention is worth saying
what to do about it, either as a fact inside the discussion of a real finding, or as a `question`
if an answer is actually wanted. If neither fits, it does not belong on the pull request.

**Consequence worth watching.** A run can now legitimately post nothing at all. Under the old
vocabulary a reviewer with nothing to report could still emit praise or a thought and look
productive. That option is gone, which is the intent — but it means an empty review is now the
expected result on a clean PR rather than a sign something went wrong.

---

## 2026-07-31 — v0.6 — self-approval is blocked too, so a self-review is always a comment

**Why.** v0.5 handled `REQUEST_CHANGES` but hedged on `APPROVE`, because the restriction had only
been observed for one of them and GitHub's REST documentation mentions neither. Jake confirmed
that self-approval is blocked in the same way, so the hedge is replaced with the fact.

**What changed.**

- **A self-authored review is always `COMMENT`.** No verdict of any kind is possible, so the
  skill no longer attempts one or carries a fallback path for it. That removes a branch rather
  than adding one — the v0.5 "try `APPROVE`, fall back on 422" logic is gone.

- **The empty-review case is now handled, and it was the real gap.** v0.5 only warned about a
  blocking review arriving as a neutral comment. But a clean review is worse: with no findings
  and no `APPROVE` event, what lands is a comment saying nothing, which reads as a review that
  crashed rather than one that passed. The body now opens with an explicit "this review would
  approve — no findings survived verification at this depth".

- **The 422 handler covers both self-review messages** rather than only the request-changes one,
  and is reframed as a backstop: reaching it means the author check failed, not that the payload
  was wrong.

**How this was established:** by Jake, from experience, not from documentation or a run of this
skill. GitHub's REST docs for the reviews endpoint still say nothing about self-review
restrictions in either direction, so this note is the only record of why the skill behaves this
way.

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
