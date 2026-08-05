# How to write a review comment

Every comment this panel posts is read by the engineer who wrote the code. Assume that person is
**junior**: competent, but new to this codebase, and not fluent in the framework's vocabulary.

Two things have to be true at once, and they are not in tension:

- They can act on it without asking anyone what it means.
- It is **short**.

A comment nobody can follow has failed. So has a comment nobody finishes reading.

---

## Length

**Target 100 words. Hard cap 150.** Code blocks do not count — they are scanned, not read.

If a comment will not fit, it is almost always trying to *prove itself*. It does not need to.
Every finding that reaches the author has already survived an independent verifier whose whole
job was to refute it. The evidence lives in the finding's `evidence` field and the verifier's
reason. **The comment is not where you win the argument. It is where you tell someone what to
do.**

Cut, in this order:

1. Proof that the finding is real — mechanism traces, library internals, the checks you ran to
   rule out alternatives.
2. Reproduction steps beyond the shortest path that shows the problem.
3. Anything the reader can see by looking at the line you anchored to.

When a finding genuinely needs more — an intricate race, a multi-step reproduction — keep the
comment inside the cap and put the rest in a collapsed block:

```markdown
<details><summary>Full reproduction</summary>

1. …
2. …

</details>
```

GitHub renders that collapsed. The review stays scannable and the depth is one click away.

---

## What the reader does not know

They can read code. They cannot read your mind. They do not know your shorthand — N+1, bfcache,
CSRF, idempotent, race condition, hydration, trust boundary — and they do not know why this
codebase does things a particular way, or what a referenced issue number was about.

**Explain a term in the same breath, in about six words, then name it.** Not a paragraph.

> Browsers keep recent pages in memory so Back feels instant — the "back/forward cache".

> One database request per repository instead of one for all of them — an "N+1 query".

Naming it after explaining teaches the term without gatekeeping the fix behind it.

---

## Shape

```
<label> (<decoration>): <one sentence saying what is wrong>

<what the code does now, and what goes wrong — 2-4 sentences>

<what a person experiences, if it is not already obvious>

**Fix:** <pasteable code, or one specific instruction>
```

Not every comment needs every part. A nitpick about a name needs two lines.

---

## Rules

1. **Say what the code does before what is wrong with it.** One clause is usually enough.
2. **State the consequence as something a person experiences** — a stuck button, an eight-second
   digest, a stranger reaching private data. Never "violates the single-responsibility principle".
3. **Never reference something the reader cannot see.** No bare issue numbers or commit hashes. If
   you mention `#197`, say what it was in the same sentence.
4. **Make the fix pasteable.** "Consider refactoring for clarity" is not a fix.
5. **Short sentences, active voice.** Break anything over about 25 words.
6. **Never imply carelessness.** Explain how the mistake happens, not that it was made. "This
   looked safe because the page was expected to be gone" is accurate, generous, and shorter than
   the alternative.

---

## Worked example

Same finding, written badly and written well.

**Too long — 250 words.** Opens with internals, proves itself at length, then finally says what
to do:

> `signingIn` is set to `true` before the redirect and is only ever cleared inside the `if
> (error)` branch. On the success path Better Auth's `redirectPlugin` completes with
> `window.location.href`, a real cross-origin document navigation… nothing disqualifies the page
> from bfcache — no `Cache-Control: no-store`, and posthog binds `pagehide` rather than the older
> `unload`… SvelteKit's own handler at `client.js:2895` only nulls the `navigating` store…
> *(…four numbered repro steps, then the fix)*

Every sentence is true. None of it is the author's problem — it is the verifier's working.

**Right — 95 words:**

> **issue (non-blocking): Pressing Back from GitHub leaves the button stuck**
>
> `signingIn` is set true on click and only reset when the call errors. On success the browser
> leaves for github.com, so it is never reset — which looked safe, because the page was expected
> to be gone.
>
> But browsers keep recent pages in memory so Back feels instant, and restore them exactly as
> they were. Click → GitHub → press Back → the button is greyed out and will not respond. Only a
> refresh clears it.
>
> **Fix:** reset on `pageshow` when `event.persisted` is true. `signup/+page.svelte` has the same
> gap.

---

## Before you submit

- Is it under 150 words?
- Would someone who joined last week understand every sentence?
- Any term I have not explained?
- Have I said what the code *does* before what is wrong?
- Is the fix pasteable?
- Am I proving the finding rather than delivering it?

The last one is the common failure. If a paragraph exists to convince the reader you are right,
cut it — verification already did that job.
