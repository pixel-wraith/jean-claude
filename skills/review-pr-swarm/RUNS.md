# review-pr-swarm — run log

One row per real run. Append at the bottom.

The **notes** column is the point of this file. Write what went wrong: which reviewer produced
nonsense, what got refuted and why, what the panel missed that you spotted yourself. A row that
says "worked fine" teaches nothing.

Columns:

- **date** — run date
- **PR** — `repo#number`
- **lvl** — reporting level used
- **rev** — reviewers that ran (of 10)
- **raw** — findings returned by reviewers, before merging
- **merged** — findings after overlap merging
- **refuted** — killed by the verifier
- **suppr** — real, but below the reporting level
- **posted** — reached the pull request
- **notes** — what went wrong

| date | PR | lvl | rev | raw | merged | refuted | suppr | posted | notes |
|------|-----|-----|-----|-----|--------|---------|-------|--------|-------|
| 2026-07-30 | merge-lantern#229 | 3 | 10 | 19 | 17 | 9 | 0 | 8 | v0.2 dry run, same PR as the row below — direct comparison. Reviewers now read `writing-style.md`; editor pass added. Standards went 3 findings (all refuted) → 0, and listed the candidates it dropped and why. Correctness found a **high**-severity bug run 1 missed entirely (Better Auth throws rather than returning `{error}` when the request never reaches the server; button latches disabled). Reviewers ran real experiments this time — builds, browser measurement, mutation tests, a Node repro against a dead port. Refute rate held at ~53% but the refutations are now about scope ("pre-existing, not introduced") rather than factual error. Verifier flagged one severity as inflated (tap target rated medium, defensible only at low) and nothing acts on that — the skill has no path for a severity correction. |
| 2026-07-30 | merge-lantern#229 | 3 | 10 | 18 | 16 | 9 | 0 | 7 | v0.1 dry run. Standards 0/3 survived — all three were unwritten preferences despite its cite-the-rule instruction. Security and docs-drift 0/1 each, both killed on "pre-existing, not introduced by this diff". Test-quality 4/4 survived; it ran real mutation tests. Two skill bugs found: `praise (if-minor)` decoration is nonsense, and step 2's `gh pr checkout` assumes an open PR on a clean tree. |

---

## What to watch for across runs

Things worth tracking as rows accumulate, since they are the triggers for changing a prompt:

- **A reviewer whose findings are mostly refuted.** Its prompt is too eager. Tighten its
  false-positive section with the specific pattern the verifier keeps citing.
- **A reviewer that never finds anything.** Either its domain genuinely does not come up in this
  codebase, or its prompt is too narrow to be useful. Both are worth knowing.
- **A high merge rate.** Two reviewers covering the same ground means their boundaries overlap
  and one of the "not your job" sections needs a line added.
- **Findings you disagreed with that the verifier let through.** The verifier's bar is too low —
  or the finding was correct and your disagreement is the interesting part. Record which.
- **Problems the panel missed that you caught yourself.** The most valuable row content there
  is. Which reviewer should have caught it, and what in its prompt caused it not to?
- **Cost and wall-clock time**, if either becomes a reason not to run the skill.
