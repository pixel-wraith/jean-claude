# The rule set

Three layers. The **AI-tell core** is mechanical and universal — it applies to
everyone who runs this skill. The **clarity nudge** is a soft plain-speech push,
suggestions only. The **truth guardrails** are judgment calls a person must
resolve; the skill can only flag them.

The linter (`scripts/humanize-lint.mjs`) detects the AI-tell core and the
clarity nudges deterministically. It cannot detect truth-guardrail issues —
those come from reading the text against what is actually known/sourced.

---

## Layer 1 — AI-tell core (mechanical, universal)

Each tell is tagged the way the linter tags it.

### MECHANICAL — one correct fix, applied automatically in the staged draft

| Tell | Fix |
|---|---|
| Ellipsis followed by a space (`word… word` / `word... word`) | Delete the space: `word…word` |

### REWRITE — needs a contextual rewrite (never a blind find/replace)

| Tell | Why it reads as AI | Fix |
|---|---|---|
| Em / en dash (`—`, `–`, ` -- `) | Strongest single AI tell in prose | Recast the sentence, or use an informal ellipsis |
| "not X, it's Y" / "it isn't X, it's Y" | Antithesis scaffold; overused by models | State Y directly, drop the negated setup |
| "X isn't the problem, Y is" | Same antithesis tell, inverted | Make the real point directly |
| Reaction-narration openers ("your comment hit me…", "this really landed…") | Narrates the writer's reaction instead of the substance | Lead with the substance itself |
| Crutch phrases ("really landed", "stuck with me", "does real work", "chewing on", "at the end of the day", "when it comes to", "it's worth noting", "that being said", "deep dive", "circle back") | Filler that carries no information | Cut it, or replace with the concrete thing meant |
| Generic AI vocabulary ("delve", "seamless", "robust", "leverage", "game-changer", "unlock", "elevate", "supercharge", "testament to", "underscores", "tapestry", "ever-evolving", "cutting-edge", "furthermore", "moreover", "in conclusion") | Corporate-blog register that no person actually speaks | Plainer, more specific word |

The vocabulary list is a **team-neutral default**. Teams should add/remove
entries to fit their house style — edit the `ai-vocabulary` rule in
`scripts/humanize-lint.mjs` and the table above together.

---

## Layer 2 — Plain-language rewrite (required)

AI prose is often tell-free but still hard to read: dense, passive, abstract,
jammed with nouns, written in corporate register. Text like that fails the job
even with zero em-dashes. This layer is **required, not a suggestion**. The test
for every sentence: *would a junior on the team understand it on the first read?*
If not, rewrite it into plain, direct language. The linter tags these `CLARITY`,
but the tag name is historical — treat them as rewrites you owe the reader, the
same as Layer 1.

The one limit: do not lose the author's meaning, drop a technical fact, or
invent reasoning to fill a gap. Keep the real endpoint/field/file names and the
edge cases; make the *sentences around them* plain. And genuinely-plain prose is
left alone — but stiff, nominalized, or corporate phrasing does not count as
plain, so "it already reads fine" is never a reason to skip a rewrite here.

| Problem | Why it's hard to read | Rewrite |
|---|---|---|
| Long sentences (over ~30 words) | Reader loses the thread | Split into two or three. One idea per sentence. |
| Passive voice ("was handled by", "is processed") | Hides who does what | Name the actor, active verb: "the worker handles it" |
| Nominalizations / buried verbs ("make a decision", "perform an analysis") | The action is trapped in a noun | Free the verb: "decide", "analyze" |
| Stiff noun-stacks ("current confirmed need", "per-job download-URL regeneration") | Reads like a spec label, not a sentence | Say it as an action: "what we actually need now", "regenerating the download URL for each job" |
| Corporate register ("leverage", "facilitate", "utilize", "sufficient") | Nobody talks like this | Plain word: "use", "help", "use", "enough" |
| Wordy phrases ("in order to", "due to the fact that", "a number of") | Long way to say a short thing | "to", "because", "several" |

Thresholds and the wordy-phrase list are **defaults** in
`scripts/humanize-lint.mjs` (`LONG_SENTENCE_WORDS`, the `SWAPS` map). A team or
person who wants a harder push can lower the threshold and extend the list. That
dial changes how much the linter flags; it does not change that plain language
is required — the linter is a helper, and you are still the judge of every
sentence.

---

## Layer 3 — Truth guardrails (judgment — flag, never auto-fix)

The linter cannot see these. During the pass, read the text and flag any spot
that trips one of these. Do **not** rewrite them silently, and never invent
content to smooth them over. Raise them in the grill and let the author resolve.

- **Fabricated specifics.** A number, statistic, date, name, quote, or metric
  that has no cited source. Flag: "Where does this figure come from?"
- **Fabricated stories.** A first-person anecdote or incident that the author
  did not actually supply. Flag: "Did this happen, or did the draft invent it?"
- **Invented reasoning.** A logical leap, causal claim, or "insight" that isn't
  grounded in what the author said or in a real source. Flag: "This inference
  isn't in your input — is it yours, or should it come out?"
- **Overstated certainty.** Hedged input rendered as confident fact. Flag the
  mismatch.

Rule of thumb: if a claim or logical step did not come from the author's own
input or a real source, it is a flag, not a rewrite.

---

## Per-person voice (optional)

The core above is destination-neutral and person-neutral. If a `voice-config.md`
sits next to the target (or the author points to one), load it and apply its
extra banned words, preferred phrasings, and register notes **on top of** the
core. See `voice-config.template.md`. Absence of a config is fine — the core
still runs.
