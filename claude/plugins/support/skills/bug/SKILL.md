---
name: bug
description: Create a ready-to-file Shortcut story from user-provided context or an interactive Q&A flow. Invoke with optional raw text as background (e.g. /bug the login page crashes when you try to pay_off a statement). Extract everything possible from the text first, then fill gaps with short questions.
model: claude-opus-4-6
---

# Create a bug / on-call Shortcut story

Turn a reported issue into a clean Shortcut story an engineer can pick up
without re-interviewing the reporter. Lead with the ask. Sound like a support
engineer dropped notes from a real debugging session, not like a template was
filled in.

The skill takes optional raw text as background. Example:
`/bug the login page crashes when you try to pay_off a statement`. If text is
provided, extract as much as possible from it before asking anything. If no
text is provided, or critical information is still missing after parsing, fill
the gaps interactively.

## Steps

### 1. Parse input

Read whatever background text was passed in and pull out everything it already
contains: the surface or feature, the action that triggers it, the symptom,
any IDs, any environment hint, and any company or lender named. Note what you
extracted and what is still missing. Do not ask for anything the text already
answered.

### 2. Identify the repo / surface

Decide which repo or surface the issue lives in: backend (`peach-main`), UI
(`peach-front`, admin or agent or borrower portal), or documented behavior
(`peach-docs`). This drives which template to use and which team it routes to.
A UI crash uses the shorter front-end shape; a backend behavior or data issue
uses the longer backend shape.

### 3. Capture context, problem, impact, and desired outcome

Establish four things before drafting:
- **Context:** company and ID, environment, the loan or entity involved, what
  the user was doing.
- **Problem description:** what happens versus what should happen, with the
  exact error or symptom.
- **Impact:** who is affected and how badly. One borrower, one lender, or many?
  Blocking, compliance pressure, or cosmetic?
- **Desired outcome:** what "fixed" looks like, which becomes THE ASK.

### 4. Fill gaps interactively

If no background text was provided, or critical information is still missing
after parsing, ask the user for the remaining details. Keep it to the few
fields that actually block filing the story. Do not ask for optional fields
just to fill the template.

### 5. Draft, iterate, approve

Draft the story using the matching template. Show it to the user. Incorporate
any feedback and repeat until the user approves. Do not file anything until the
user signs off on the wording.

## Interactive gap-filling

When you need to ask the user, keep questions short and conversational. Ask one
or two at a time, not a wall of fields. Prefer questions that unblock the draft:
which company and environment, the loan or entity ID, the exact error text, and
what they expected to happen instead. Stop asking once you have enough to write
a useful story; an engineer can request more in the story thread.

## Guidelines

- Keep questions short and conversational. Do not overwhelm the user with a
  wall of text.
- The issue title is concise and actionable. "Fix crash on login page back
  navigation", not "There is a problem with the login page".
- Open the description with a **THE ASK** block: one or two sentences,
  action-oriented, no preamble. The engineer should know what they are being
  asked to do without reading the whole story.
- Leave optional template sections out entirely if there is nothing meaningful
  to put in them. Do not include empty sections.
- Match the template to the issue size. A simple "field X shows wrong value Y"
  uses the short front-end shape. Use the longer backend shape only when the
  investigation is genuinely multi-step.
- Voice rules: no em dashes, no en dashes, no ` - ` connectors. No marketing
  language. Short sentences; split anything over 25 words. Do not bold more
  than three labels in a section.
- The story should read like real debugging notes, not generated prose. Avoid
  "it's important to note", "diligently", "robust", "comprehensive".

## Templates

### On-call escalation

```
TITLE

### Company name & ID:

### Env:

### Client Report:


### Expected Result:


### Actual Result:


### Investigation So Far:


### Additional Information:
(Screenshots, videos, example accounts/borrowers/etc.)
Loan ID:
Loan Type:


### Zendesk and Chat Links Attached
```

### Bug escalation (backend)

```
**THE ASK:** <one or two sentences: what the engineer should do>

### Company name & ID:
### Env:

### Client Report:

### Expected Result:

### Actual Result:

### Investigation So Far:

### Additional Information:
(Screenshots, videos, example accounts/borrowers/etc.)
Loan ID:
Loan Type:

### Zendesk and Chat Links Attached
```

### Bug escalation (front-end, short shape)

Use when the symptom is a clear UI defect with no multi-step investigation.

```
**THE ASK:** <one sentence: the fix>

### Company name & ID:
### Env:

### Steps to reproduce:
1.

### Expected:
### Actual:

### Screenshot:

### Zendesk and Chat Links Attached
```

Drop any section above that has nothing meaningful to fill it.
