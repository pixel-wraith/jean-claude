---
name: humanize
description: Rewrite a specific piece of human-facing text to strip AI tells (em-dashes, "not X but Y", crutch phrases, generic AI vocabulary) and flag truth-guardrail problems (fabricated facts, invented reasoning), then apply the approved version back to wherever the text was headed. Use when the user points at a draft, doc, code comment, PR/issue comment, email, or pasted passage and asks to humanize it, de-AI it, make it sound human, or remove AI tells. Runs only against an explicit target — it never auto-scans.
---

# Humanize

Turn AI-sounding text into text a person would actually write, without changing
what it means or inventing anything. Operates on **one explicit target** the
user hands you. Never scans or rewrites anything you weren't pointed at.

The full rule set is in [reference/ai-tells.md](reference/ai-tells.md). The
mechanical tells are detected by [scripts/humanize-lint.mjs](scripts/humanize-lint.mjs).
Read the reference before your first pass.

## What it does and doesn't touch

- **Fixes automatically** (mechanical, one correct fix): ellipsis-space.
- **Rewrites in context**: em-dashes, "not X, it's Y", reaction openers, crutch
  phrases, generic AI vocabulary.
- **Nudges toward plain speech** (soft, suggestion only): long sentences,
  passive voice, nominalizations, wordy phrases. Offer the plainer version,
  don't force it. This is the light push against cryptic, hard-to-follow AI
  prose; the thresholds are a dial teams can turn up.
- **Flags for the human, never auto-fixes**: fabricated numbers/stories,
  invented reasoning, overstated certainty (the truth guardrails).
- **Leaves alone**: the author's voice, structure, and register. This is
  de-AI-ification plus a clarity nudge, not a style rewrite. Don't force
  conversational tone, reader-address, or your own phrasing onto clean text,
  and don't flatten a passage that already reads plainly.

## Workflow

Follow in order. Do not skip to a rewrite.

1. **Pin the target and its destination.** Confirm what you're humanizing and
   where the result must go: a file (edit in place), a code comment (same
   spot), a PR/issue comment (the comment body), or pasted text with no home
   (output to chat). The approved text goes back to that exact destination,
   nowhere else.
2. **Scan.** Run the linter on the target text:
   `node scripts/humanize-lint.mjs <file>` (or pipe the passage via stdin).
   Then read the text yourself for truth-guardrail flags — the linter can't
   see those. Collect: mechanical fixes, rewrites, and flags.
3. **Grill — flagged spots only.** Interrogate just the truth-guardrail and
   judgment flags: "this stat has no source, is it real?", "this reasoning
   isn't in your input, is it yours or should it come out?". Do NOT grill clean
   passages or confirm each mechanical fix. If there are no flags, skip
   straight to step 4.
4. **Stage the draft in chat and wait.** Apply the mechanical fixes and the
   rewrites, fold in the clarity nudges where they genuinely read better (leave
   the ones that don't), resolve the flags per the grill, and present the full
   humanized version in chat for review. List what you changed, which clarity
   nudges you took vs left, and any flag the author still needs to decide on.
   **Do not apply anything yet.** Wait for explicit approval of this text.
5. **Apply to the destination.** Only after the user approves, write the
   approved version back to the destination from step 1 — the file, the comment
   location, the PR comment, or (for homeless pasted text) leave it as the
   chat output they'll paste themselves.

## Per-person voice (optional)

The core is person-neutral. If a `voice-config.md` sits by the target or the
user names one, load it and layer its extra banned words / preferred swaps /
register notes on top of the core. No config is fine — the core still runs. See
[reference/voice-config.template.md](reference/voice-config.template.md).

## Portability

This folder is self-contained: SKILL.md, the reference docs, and a
zero-dependency Node linter. Copy the whole `humanize/` folder into any
`.claude/skills/` directory and it works. Tune the `ai-vocabulary` list to fit
your team's house style, and turn the clarity dial with `LONG_SENTENCE_WORDS`
and the `SWAPS` map in the linter (lower/longer = harder push toward plain
speech). Keep the matching tables in the reference in sync.
