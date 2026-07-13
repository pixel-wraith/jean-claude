# voice-config (template)

Optional. Copy this to `voice-config.md`, fill in your own preferences, and keep
it next to the things you humanize (or point the skill at it). The humanize core
runs with or without this file — this only layers *your* preferences on top.

Delete any section you don't care about. Keep it short; this is a preference
sheet, not a style bible.

---

## Extra banned words / phrases

Words the core list misses that you personally never want to see. One per line.

```
# example — replace with your own
synergy
best-in-class
```

## Preferred swaps

`avoid → prefer` pairs the skill should apply when it hits the left side.

```
# example
utilize → use
in order to → to
```

## Register notes

A sentence or two on how you want to sound. The skill will respect this when it
rewrites, but it will NOT force it onto clean text.

```
# example
Plain and direct. Short sentences. Fine to start with "And" or "But".
No exclamation points.
```

## Hard mechanical rules (yours)

Anything you enforce absolutely, beyond the core. Example: one contributor bans
em-dashes AND replaces them specifically with an informal ellipsis (no space),
never a comma.

```
# example
No em-dashes; replace with an informal ellipsis, no following space.
```
