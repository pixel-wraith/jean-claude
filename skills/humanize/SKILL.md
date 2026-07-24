---
name: humanize
description: Rewrite a specific piece of human-facing text so a non-expert reads it once and understands it — strip AI tells (em-dashes, "not X but Y", crutch phrases, corporate vocabulary), rewrite stiff / dense / nominalized prose into plain language, and flag truth problems (fabricated facts, invented reasoning). Then apply the approved version back to wherever the text was headed. Use when the user points at a draft, doc, code comment, PR/issue comment, ticket, email, or pasted passage and asks to humanize it, de-AI it, make it sound human, make it readable, or simplify it. Runs only against an explicit target — it never auto-scans.
---

# Humanize

Rewrite AI-sounding, stiff, or dense text into text a person would actually
write — the kind a busy teammate reads once and understands, without stopping
to translate it. Do this without changing what it means or inventing anything.
Operates on **one explicit target** the user hands you. Never scans or rewrites
anything you weren't pointed at.

**The bar to clear:** read every sentence and ask, "would a junior on this team
understand this on the first read?" If the answer is no — because it's stiff,
abstract, jammed with nouns, or written in corporate register — you rewrite it.
That rewrite is a required part of the job, not an optional polish.

The full rule set is in [reference/ai-tells.md](reference/ai-tells.md). The
mechanical tells and plain-language problems are detected by
[scripts/humanize-lint.mjs](scripts/humanize-lint.mjs). Read the reference
before your first pass.

## What it does and doesn't touch

- **Fixes automatically** (mechanical, one correct fix): ellipsis-space.
- **Rewrites in context** (required): em-dashes, "not X, it's Y", reaction
  openers, crutch phrases, generic AI / corporate vocabulary.
- **Rewrites for plain language** (required — this is the heart of the skill):
  stiff or dense sentences, buried verbs (nominalizations like "current
  confirmed need", "per-job download-URL regeneration"), corporate register,
  passive voice that hides who does the thing, and sentences so long the reader
  loses the thread. Turn each into plain, direct language. This is NOT a
  suggestion you weigh — if a sentence fails the first-read bar above, you
  rewrite it. Preserve the meaning, the facts, and any technical identifiers;
  just say it the way a person would.
- **Flags for the human, never auto-fixes**: fabricated numbers/stories,
  invented reasoning, overstated certainty (the truth guardrails).
- **Leaves alone**: the author's meaning, structure, and their own voice when
  it already reads plainly. Don't swap in your own pet phrasing, don't force
  chatty tone or reader-address onto text that's already clear, and don't
  "simplify" accurate technical detail into vagueness. **"Already reads
  plainly" is a high bar, not an excuse** — stiff, nominalized, or corporate
  prose is never "clean," so this clause never justifies leaving it.

Plain does not mean dumbed-down. Keep the real endpoint names, field names,
file paths, and edge cases. Plain is about the *sentences* around them: short,
active, concrete, one idea at a time.

### The moves (how to make prose plain)

- **Dig the verb out of the noun.** "make a decision" → "decide"; "current
  confirmed need" → "what we actually need right now"; "per-job download-URL
  regeneration" → "regenerating the download URL for each job".
- **Name who does what, in active voice.** "a row is written" → "we write a
  row"; "the file is validated" → "the service validates the file".
- **Split the long sentence.** One idea per sentence. If you need a comma to
  hold three clauses together, make it two or three sentences.
- **Say the plain word.** "utilize" → "use"; "sufficient" → "enough";
  "in order to" → "to"; "commence" → "start".
- **Cut filler.** Drop "it's worth noting", "at the end of the day",
  "when it comes to". Say the concrete thing instead.
- **Lead with the point, not the setup.** Put what the reader needs first;
  drop the "not X, it's Y" scaffolding and just state Y.

## Workflow

Follow in order. Do not skip to a rewrite.

1. **Pin the target and its destination.** Confirm what you're humanizing and
   where the result must go: a file (edit in place), a code comment (same
   spot), a PR/issue comment (the comment body), a ticket description, or
   pasted text with no home (output to chat). The approved text goes back to
   that exact destination, nowhere else.
2. **Scan.** Run the linter on the target text:
   `node scripts/humanize-lint.mjs <file>` (or pipe the passage via stdin).
   Then read the text yourself twice: once for truth-guardrail flags (the
   linter can't see those), and once sentence by sentence against the
   first-read bar — the linter catches common plain-language problems, but you
   are the real judge of whether a sentence lands. Collect: mechanical fixes,
   rewrites (both the AI-tell kind and the plain-language kind), and flags.
3. **Grill — flagged spots only.** Interrogate just the truth-guardrail and
   judgment flags: "this stat has no source, is it real?", "this reasoning
   isn't in your input, is it yours or should it come out?". Do NOT grill clean
   passages or confirm each mechanical fix. If there are no flags, skip
   straight to step 4.
4. **Stage the draft in chat and wait.** Apply the mechanical fixes, the
   in-context rewrites, AND the plain-language rewrites so the whole passage
   clears the first-read bar. Resolve the flags per the grill. Present the full
   humanized version in chat for review. Note the substantive changes and any
   flag the author still needs to decide. **Do not apply anything yet.** Wait
   for explicit approval of this text.
5. **Apply to the destination.** Only after the user approves, write the
   approved version back to the destination from step 1 — the file, the comment
   location, the PR comment, the ticket, or (for homeless pasted text) leave it
   as the chat output they'll paste themselves.

## Per-person voice (optional)

The core is person-neutral. If a `voice-config.md` sits by the target or the
user names one, load it and layer its extra banned words / preferred swaps /
register notes on top of the core. No config is fine — the core still runs. See
[reference/voice-config.template.md](reference/voice-config.template.md).

## Portability

This folder is self-contained: SKILL.md, the reference docs, and a
zero-dependency Node linter. Copy the whole `humanize/` folder into any
`.claude/skills/` directory and it works. Tune the `ai-vocabulary` list to fit
your team's house style, and turn the plain-language dial with
`LONG_SENTENCE_WORDS` and the `SWAPS` map in the linter (lower/longer = harder
push toward plain speech). Keep the matching tables in the reference in sync.
