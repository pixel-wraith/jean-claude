#!/usr/bin/env node
// humanize-lint — deterministic scan for AI tells and plain-language problems.
// Detects the fixable/rewritable tells and the common plain-language problems
// (long sentences, passive voice, buried verbs, wordy/corporate phrases). Those
// plain-language findings are REQUIRED rewrites, not optional polish — the tag
// name CLARITY is historical. The model is still the judge of every sentence;
// the linter just catches the usual suspects.
// Truth-guardrail checks (fabricated numbers, invented reasoning) are NOT
// deterministic and are handled by the model during the humanize pass, not here.
//
// Usage:
//   node humanize-lint.mjs <file>       # scan a file
//   cat draft.md | node humanize-lint.mjs   # scan stdin
//   node humanize-lint.mjs <file> --json    # machine-readable output
//
// Exit code: 0 = clean, 1 = findings, 2 = usage/read error.
// Zero dependencies (Node built-ins only). Node 16+.

import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const json = args.includes("--json");
const file = args.find((a) => !a.startsWith("--"));

const LONG_SENTENCE_WORDS = 30; // flag sentences longer than this; tune to taste

// MECHANICAL = one correct fix, safe to apply automatically.
// REWRITE    = needs a contextual rewrite; the humanize pass rewrites it,
//              it is never blindly find/replaced.
// CLARITY    = a plain-language problem (dense/passive/buried-verb/wordy). These
//              are REQUIRED rewrites where the sentence fails the first-read
//              test, not optional. Higher false-positive rate by design, so the
//              model judges each hit rather than rewriting blindly — but "it
//              reads fine to me" is not a pass for stiff or corporate phrasing.
// Each rule: { id, kind, re, why, fix }. `re` must be global.
const RULES = [
  // ---- MECHANICAL ---------------------------------------------------------
  {
    id: "ellipsis-space",
    kind: "MECHANICAL",
    re: /(…|\.\.\.)\s+/g,
    why: "ellipsis followed by a space",
    fix: "delete the space so it reads word…word",
  },
  // ---- REWRITE ------------------------------------------------------------
  {
    id: "em-dash",
    kind: "REWRITE",
    re: /\s?[—–]\s?|\s--\s/g,
    why: "em/en dash (a strong AI tell)",
    fix: "recast the sentence, or use an informal ellipsis",
  },
  {
    id: "not-x-but-y",
    kind: "REWRITE",
    re: /\b(it'?s|that'?s|this is)\s+not\s+[^.?!]{1,60}?,?\s+(it'?s|that'?s|but)\b/gi,
    why: "\"not X, it's Y\" antithesis construction",
    fix: "state Y directly; drop the negated setup",
  },
  {
    id: "isnt-the-problem",
    kind: "REWRITE",
    re: /\b\w[\w\s]{1,40}?\s+(isn'?t|aren'?t|wasn'?t)\s+the\s+(problem|issue|point)\b/gi,
    why: "\"X isn't the problem, Y is\" variant of the antithesis tell",
    fix: "make the real point directly",
  },
  {
    id: "reaction-opener",
    kind: "REWRITE",
    re: /(^|[.!?]\s+)(your|this|that)\b[^.?!]{0,40}?\b(hit|landed|stuck with|resonated|got me|made me)\b/gi,
    why: "reaction-narration opener (narrating your response instead of the point)",
    fix: "lead with the substance, not your reaction to it",
  },
  {
    id: "crutch-phrases",
    kind: "REWRITE",
    re: /\b(really landed|stuck with me|does real work|chewing on|circle back|deep dive|dive (in|into)|unpack this|at the end of the day|when it comes to|it'?s worth noting|needless to say|that being said)\b/gi,
    why: "filler / crutch phrase that adds no information",
    fix: "cut it, or replace with the concrete thing you mean",
  },
  {
    id: "ai-vocabulary",
    kind: "REWRITE",
    re: /\b(delve|seamless(ly)?|robust|leverage|game[- ]?changer|unlock|elevate|supercharge|boasts?|testament to|underscore[sd]?|tapestry|ever[- ]evolving|cutting[- ]edge|revolutioniz\w+|harness(ing)? the power|navigate the landscape|in today'?s (fast[- ]paced|digital) \w+|furthermore|moreover|in conclusion)\b/gi,
    why: "generic corporate/AI vocabulary (team-neutral default list, tune to taste)",
    fix: "use a plainer, more specific word",
  },
  // ---- CLARITY (soft plain-speech nudges) ---------------------------------
  {
    id: "nominalization",
    kind: "CLARITY",
    re: /\b(make|makes|made|perform(s|ed)?|conduct(s|ed)?|provide[sd]?|carry out|reach(ed)?|undertake)\s+(a |an |the )?\w+(tion|ment|ance|ence|sis|ision)\b/gi,
    why: "buried verb (a 'do a doing-noun' phrase reads as bureaucratic)",
    fix: "use the plain verb instead (e.g. \"decide\" not \"make a decision\")",
  },
  {
    // Aux + a real past participle. Regular -ed is length-guarded (\w{4,}ed) to
    // skip short adjectives/colors ("red", "used"); irregulars are an explicit
    // list. This is deliberately conservative — passive detection is noisy, and
    // a false hit on clean text erodes trust in a soft nudge.
    id: "passive-voice",
    kind: "CLARITY",
    re: /\b(is|are|was|were|be|been|being)\s+(\w{4,}ed|written|broken|given|taken|chosen|driven|hidden|shown|thrown|drawn|known|done|made|held|sent|built|found|told|kept|left|lost|meant|dealt|seen|caught|brought|taught|bought)\b(\s+by\b)?/gi,
    why: "likely passive voice (hides who does what; higher false-positive check)",
    fix: "name the actor and use an active verb where it reads clearer",
  },
];

// Wordy phrase -> plain suggestion. Emits CLARITY findings. Teams edit freely.
const SWAPS = {
  "utilize": "use",
  "utilizes": "uses",
  "utilizing": "using",
  "in order to": "to",
  "prior to": "before",
  "subsequent to": "after",
  "in the event that": "if",
  "due to the fact that": "because",
  "for the purpose of": "to",
  "a number of": "several / many",
  "the majority of": "most",
  "facilitate": "help",
  "demonstrate": "show",
  "commence": "start",
  "terminate": "end",
  "endeavor": "try",
  "ascertain": "find out",
  "sufficient": "enough",
  "approximately": "about",
  "methodology": "method",
  "functionality": "what it does",
  "aforementioned": "this / that",
};

function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text[i] === "\n") line++;
  return line;
}

function scan(text) {
  const lines = text.split(/\r?\n/);
  const findings = [];

  // Per-line regex rules
  lines.forEach((line, i) => {
    for (const rule of RULES) {
      rule.re.lastIndex = 0;
      let m;
      while ((m = rule.re.exec(line)) !== null) {
        findings.push({
          line: i + 1,
          col: m.index + 1,
          id: rule.id,
          kind: rule.kind,
          match: m[0].trim() || m[0],
          why: rule.why,
          fix: rule.fix,
        });
        if (m.index === rule.re.lastIndex) rule.re.lastIndex++; // avoid zero-width loop
      }
    }
    // Wordy-phrase swaps
    for (const [phrase, plain] of Object.entries(SWAPS)) {
      const re = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
      let m;
      while ((m = re.exec(line)) !== null) {
        findings.push({
          line: i + 1,
          col: m.index + 1,
          id: "wordy-phrase",
          kind: "CLARITY",
          match: m[0],
          why: "wordier than it needs to be",
          fix: `prefer "${plain}"`,
        });
        if (m.index === re.lastIndex) re.lastIndex++;
      }
    }
  });

  // Long-sentence pass (over the whole text, not per line)
  const sentenceRe = /[^.!?]+[.!?]+/g;
  let s;
  while ((s = sentenceRe.exec(text)) !== null) {
    const sentence = s[0].trim();
    const words = sentence.split(/\s+/).filter(Boolean).length;
    if (words > LONG_SENTENCE_WORDS) {
      const start = s.index + s[0].indexOf(sentence.split(/\s+/)[0]);
      findings.push({
        line: lineOf(text, start),
        col: 1,
        id: "long-sentence",
        kind: "CLARITY",
        match: `${words} words`,
        why: `sentence runs ${words} words (over ${LONG_SENTENCE_WORDS}); hard to follow`,
        fix: "split it into two, or cut the qualifiers",
      });
    }
  }

  findings.sort((a, b) => a.line - b.line || a.col - b.col);
  return findings;
}

function readInput() {
  if (file) return readFileSync(file, "utf8");
  try {
    return readFileSync(0, "utf8"); // stdin
  } catch {
    return null;
  }
}

const text = readInput();
if (text == null || text === "") {
  process.stderr.write(
    "usage: node humanize-lint.mjs <file>  (or pipe text via stdin)\n"
  );
  process.exit(2);
}

const findings = scan(text);

if (json) {
  process.stdout.write(JSON.stringify({ findings }, null, 2) + "\n");
  process.exit(findings.length ? 1 : 0);
}

if (findings.length === 0) {
  process.stdout.write("clean — no AI tells or plain-language problems found.\n");
  process.exit(0);
}

const groups = [
  ["MECHANICAL", "safe to auto-apply"],
  ["REWRITE", "needs a contextual rewrite"],
  ["CLARITY", "plain-language rewrite — required where the sentence fails the first-read test"],
];
const loc = (f) => `${String(f.line).padStart(4)}:${String(f.col).padStart(3)}`;

for (const [kind, label] of groups) {
  const hits = findings.filter((f) => f.kind === kind);
  if (!hits.length) continue;
  process.stdout.write(`\n${kind} (${label}) — ${hits.length}\n`);
  for (const f of hits)
    process.stdout.write(`  ${loc(f)}  ${f.why}: "${f.match}"  → ${f.fix}\n`);
}
process.stdout.write(
  `\n${findings.length} finding(s). Truth-guardrail checks are NOT covered here — read for fabricated facts/reasoning separately.\n`
);
process.exit(1);
