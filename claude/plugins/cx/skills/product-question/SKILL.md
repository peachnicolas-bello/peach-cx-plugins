---
name: product-question
description: Draft a tight #product-questions Slack post (6-8 sentences, ask-led). Use when a CX investigation routes to product and needs Russell Braden or Eddie Oistacher.
model: claude-opus-4-6
---

# Draft a #product-questions post

Extract the context from the user's message (ticket number, topic, lender).

Compose a Slack post for #product-questions following the rule in
`AGENTS.md` → "#product-questions posts: lead with the ask, cap at 6-8
sentences." The rule is non-negotiable for this turn.

## Hard shape (enforce, do not skip)

1. **Opening line** with mention, lender, ticket, and framing
   ("compliance pressure," "blocking implementation," "client-facing
   defect"). One sentence.
2. **Bare-minimum technical context** in one sentence. Skip entirely
   if the asks are self-contained.
3. **Numbered asks.** Each a single sentence ending in a question mark.
   Two or three max. If there are more, file a doc and link it.
4. **One Slack permalink, Shortcut story link, or Zendesk ticket link**
   pointing at the root-cause source. Pick the single best one.
5. **One closing sentence** offering the next step ("happy to file the
   story once direction is set").

## Hard limits

- Total length: 6 to 8 sentences. If the draft hits 9, cut.
- One link in the body, max. Additional links go in a thread reply
  after product reads the OP.
- No greeting beyond `@Russell @Eddie` (or the relevant tags).
- No preamble, no marketing language, no em dashes, no en dashes,
  no ` - ` connectors.
- No padding phrases ("I'd like to highlight," "It's worth noting").
- No restating Peach architecture product already knows.

## Output format

Print the draft inside a fenced ``` code block ``` so Nicolas can copy
it verbatim. Below the block, two short notes:

- **Tags:** which product folks to @ (default Russell Braden and Eddie
  Oistacher; add others only if the topic warrants).
- **Followup link to drop in-thread:** any second permalink (Shortcut
  story, secondary Slack thread) that Nicolas should post as a reply
  after the OP lands.

No other commentary. Do not add a "let me know if you want changes"
prompt. Nicolas will iterate by replying directly.

## Voice rules apply

Everything in `AGENTS.md` → "Voice rules for all responses" applies:
no em dashes, no en dashes, no ` - ` connectors, no marketing words,
no abbreviations beyond `auth` and `OTB`, short sentences, action-led.
