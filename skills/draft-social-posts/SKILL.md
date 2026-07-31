---
name: draft-social-posts
description: Draft LinkedIn and BlueSky/X/Twitter posts promoting a blog post (published URL or local draft file), matching the user's voice and driving clicks to the article. Use when the user shares a blog post URL or local file and asks for social media posts, promo posts, tweets, LinkedIn posts, or wants help promoting an article they wrote.
---

# Draft Social Posts

Drafts 5 LinkedIn posts + 5 BlueSky/X/Twitter posts to promote a blog post. The job is to drive clicks to the article — not to summarize it or replace it.

The source may be either a **published URL** or a **local draft file** (unpublished). Final drafts are saved to the user's slipbox at `/Users/wraith/Documents/wizards-tower/`.

## Step 1: Read the post fresh

**If given a URL:** fetch it with **WebFetch**. Do not rely on summaries or cached impressions.

**If given a local file:** read it with **Read**. Treat it as the source of truth even though it's unpublished.

**If neither is given:** ask the user for the URL or file path before drafting anything.

Re-read the source if:
- The user says they updated the post.
- The content seems thin, generic, or cached.
- The user corrects a detail (don't argue or guess — re-read).

Identify:
- Core thesis
- Specific tips/points (especially numbered lists)
- Personal stories or stats
- Years-of-experience number (if mentioned) — use the **exact** number
- Series context (e.g., "Tip #1 of 10")

### Link handling for unpublished drafts

If the source is a local file with no published URL yet, ask the user for the URL the post **will** live at. If they don't have one yet, use the placeholder `[ARTICLE URL]` in every post and flag this clearly at the top of the output so they remember to swap it in before publishing.

## Step 2: Match the voice

**Tone:**
- Personal and reflective — often references own experience (check post for current YoE; do not guess or round)
- Direct and a little punchy — bold claim, then back it up
- Practical, not preachy — what worked for me, not universal laws
- Conversational — contractions, short sentences, occasional one-liners
- Slightly vulnerable — willing to share regrets, mistakes, "wish I'd known" moments

**Avoid:**
- Corporate LinkedIn-speak ("thrilled to announce", "synergy", "leverage")
- Hype-bro energy ("This will 10x your career!!!")
- Generic motivational fluff
- Hashtag spam

## Step 3: Draft 10 posts

### 5 LinkedIn posts (longer, story-driven)

Pick a variety of angles across the 5 (don't repeat):
- **The Hook** — bold statement or surprising claim, then tease
- **The Contrarian Take** — uncomfortable truth challenging conventional wisdom
- **The Question Opener** — question that invites comments
- **The Personal Story / Reflective** — vulnerable or reflective anecdote
- **The Listicle Tease** — preview the numbered tips
- **The Stat Hook** — striking number or study (only if the post has one)
- **The Series Kickoff** — frame as part of a series if applicable

Format:
- 4–10 short lines/paragraphs
- End with the article link, plus a question to invite engagement where natural
- Sparing emojis only (👇 ✅ ❌) — never overdo
- Generous line breaks for readability

### 5 BlueSky / X / Twitter posts (shorter, punchier)

- Lead with the hook on line 1 (shows in preview)
- Link on its own line at the end for a clean preview card
- Under ~280 characters where possible
- Vary formats: one-liners, mini-lists, before/after, quote-style, "that's the tweet"
- No hashtags unless genuinely relevant
- Don't reuse the exact LinkedIn angle — adapt the framing

## Step 4: Output format

Use this exact structure:

```
## LinkedIn Posts

---

**Post 1 — [Angle Name]**

[post content]

---

**Post 2 — [Angle Name]**

[post content]

---

[...continue through Post 5]

## BlueSky / X / Twitter Posts

---

**Post 1**

[post content]

---

[...continue through Post 5]
```

## Step 5: Tactical notes

After the drafts, include a short closing section with:
- Which posts are the strongest opening salvos and why
- Platform-specific advice for this post (preview behavior, engagement triggers, series framing)
- Reminder to space posts over 2–3 weeks; don't repeat the same angle on the same platform

## Step 6: Save to the slipbox

All drafts get appended to an **existing** slip in the user's slipbox at `/Users/wraith/Documents/wizards-tower/`. Slips always follow the naming convention `SLIP_#.md` (e.g., `SLIP_16.md`) and live directly under the slipbox root — no subfolders.

**Always ask** the user which slip to write to before saving. Never guess or infer from the post title. Accepted answers:
- A number (e.g., `16`) — resolves to `/Users/wraith/Documents/wizards-tower/SLIP_16.md`
- A bare filename (e.g., `SLIP_16.md`) — resolves under the slipbox root
- A full path

**Always append** — never overwrite. The slip already has content. Before appending, Read the file to find a sensible insertion point (end of file by default; under an existing social-posts heading if one exists).

Verify the file exists before writing. If the user names a slip that doesn't exist, stop and ask them to confirm — don't create a new file silently.

Write the same content shown in the chat (drafts + tactical notes) to the slip.

## Rules

- **Always include the article URL in every single post.** Never assume the reader will scroll up. If unpublished, use `[ARTICLE URL]` and flag it.
- **Never invent facts** about the post or the user. If the post says "13 years," say 13 — don't round or estimate.
- **Don't duplicate angles** across LinkedIn and Twitter in a way that feels redundant — adapt the framing.
- **On correction, re-read the source fresh** (URL or file) and redo affected drafts. Don't argue or guess.
- **No filler.** Every line should earn its place.
- **Never guess the output slip.** Always ask which `SLIP_#.md` in `/Users/wraith/Documents/wizards-tower/` to append to. Always append; never overwrite; never create a new slip silently.
