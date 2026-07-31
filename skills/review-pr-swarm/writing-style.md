# How to write a review comment

Every comment this panel posts is read by the engineer who wrote the code. Assume that person
is **junior**: competent, but new to this codebase, and not necessarily familiar with the
frameworks, the project's history, or the vocabulary senior engineers use with each other.

A comment they cannot act on without asking someone else what it means has failed, no matter
how correct it is.

This file governs the `subject`, `discussion` and `recommendation` of every finding. Read it
before you write anything.

---

## The reader you are writing for

They can read code. They cannot read your mind.

They do not know:

- What the acronyms and shorthand mean — N+1, bfcache, CSRF, idempotent, race condition,
  trust boundary, memoisation, hydration, tree-shaking.
- Why this codebase does things a particular way, or what was decided in some earlier pull
  request.
- What a referenced issue number was about.
- Which parts of the framework are doing work invisibly on their behalf.

They do know how to read a file, run a test, and apply a fix — **if you tell them plainly what
is wrong and what to do.**

---

## Hard rules

**1. Never use a technical term without explaining it in the same breath.**

The first time a comment uses a term the reader may not know, explain it in ordinary words
right there, then name it. Do not send them to a search engine mid-comment.

> The browser makes one separate database request per repository instead of asking for all of
> them at once. With 40 repositories that is 40 round trips. (This pattern has a name — an
> "N+1 query" — and it is worth searching for.)

Naming the concept *after* explaining it is good: it teaches the term without gatekeeping the
fix behind it.

**2. Say what the code is doing before you say what is wrong with it.**

Do not open with the defect. Open with one or two sentences describing what this code is for
and how it currently behaves. The reader may have written it a week ago, or may have inherited
it. Either way, establishing shared ground first makes the rest land.

**3. Explain why it matters in terms of what a person experiences.**

Not "this violates the single-responsibility principle." Instead: what breaks, for whom, when.
A user sees a stuck button. A digest takes eight seconds instead of one. An uninvited person
reaches data they should not see. Abstract principle is the weakest possible motivation.

**4. Give concrete steps where behaviour is involved.**

If the problem shows up by doing something, number the steps. "Click Continue with GitHub →
land on the permission screen → press Back → the button is greyed out and won't respond" beats
any amount of prose about state flags.

**5. Never reference something the reader cannot see.**

No bare issue numbers, commit hashes, or pull request numbers. If you mention `#197`, say what
`#197` was about in the same sentence. If you mention a commit, say what it did. If you mention
a project convention, quote it and say where it is written down.

**6. Make the recommendation something they can act on immediately.**

Ideally code they can paste. At minimum, a specific instruction naming the file and what to
change. "Consider refactoring for clarity" is not a recommendation.

**7. Write short sentences in the active voice.**

Break up anything over about 25 words. Prefer "the loop runs once per repository" to "a
per-repository iteration is performed."

**8. Never imply the author was careless.**

Explain how the mistake happens rather than that it was made. "This looked safe because the
page was expected to be gone for good" is accurate, generous, and more useful than "the flag
was obviously never reset."

---

## Shape of a good comment

```
<label> (<decoration>): <one plain sentence saying what is wrong>

<1-2 sentences: what this code does and how it currently behaves>

<the problem, in ordinary words, with any technical term explained on first use>

<why it matters — what a person actually experiences>

<numbered reproduction steps, when behaviour is involved>

**Recommendation:** <something they can paste or directly follow>
```

Not every comment needs every part. A nitpick about a variable name does not need
reproduction steps. Use judgement — but never skip "why it matters."

---

## Worked examples

### Too technical

> `signingIn` is set to `true` before the redirect and is only cleared inside the `if (error)`
> branch. On the success path Better Auth does a cross-origin document navigation, so the flag
> is never reset. The page is bfcache-eligible and SvelteKit's bfcache hook only resets
> `navigating` — it does not re-mount components or reset `$state`.

Every sentence is true. A junior engineer cannot act on it. "Cross-origin document
navigation," "bfcache-eligible," "re-mount," and "`$state`" are four unexplained concepts in
three sentences.

### Rewritten

> When someone clicks "Continue with GitHub", the code sets a flag called `signingIn` to true.
> That flag greys out the button and shows a spinner, so nobody can click twice while the
> browser is redirecting.
>
> The flag is only set back to false if the sign-in call returns an error. On the normal path
> the browser leaves for github.com and the flag is never reset — which looked safe, because
> the page was expected to be gone for good.
>
> Browsers, though, keep recently-visited pages in memory so that pressing Back feels instant.
> This is called the back/forward cache. When a page is restored this way it comes back exactly
> as it was left, including `signingIn` still set to true.
>
> 1. Click "Continue with GitHub"
> 2. Land on GitHub's permission screen
> 3. Realise it is the wrong account and press Back
> 4. The sign-in page is back, but the button is greyed out with a spinner and will not respond
>
> Only a page refresh clears it.

---

### Too technical

> The guard's role-scoped query creates a seam: an anchor-shaped hatch evades both the negative
> assertion and the positive test's name regex, so no strict-mode multiple-match failure fires.

### Rewritten

> This test checks that a "Continue with GitHub" **button** does not appear on the landing page.
> It looks for the element by its role — specifically a button.
>
> If someone later added the same thing as a link instead of a button, this test would still
> pass, because a link is a different role. The test would report everything as fine while the
> exact thing it exists to prevent had come back.

---

### Too technical

> PR exceeds the 300-change ceiling; the overage accrued from review-response commits post-dating
> the initial push, with no exception recorded per the established form.

### Rewritten

> This project caps pull requests at 300 changed lines — insertions and deletions added together,
> as GitHub reports them in the diff. It is written down in `docs/internal-context.md`: "Every
> pull request must come in under 300 changes." This one is 338.
>
> Worth knowing: it was not over the limit when you opened it. The first commit was 191 changes.
> It went over while you were responding to review feedback, and nothing re-checks the total at
> that point.
>
> The project does allow exceptions, recorded in the pull request description. An earlier commit
> shows the format: "Size approved as exception: 373 total changed lines, but ~150 are pure
> indentation shifts."

---

## Before you submit a finding, check

- Would someone who joined this team last week understand every sentence?
- Is there a term in here I have not explained?
- Have I said what the code *does* before saying what is wrong?
- Have I said why it matters in terms of what someone experiences?
- Can they act on the recommendation without asking a follow-up question?
- Have I referenced any issue, commit, or convention without saying what it is?

If any answer is wrong, rewrite it. Length is not the enemy — a comment twice as long that
lands is worth far more than a terse one that gets ignored or misread.
