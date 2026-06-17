---
name: debug
description: Debug a given issue by investigating everything done so far in the session alongside the codebase. Code-first investigation: let the code tell you the exact strings, exception types, and identifiers to search for instead of guessing.
model: claude-opus-4-6
---

# Debug an issue

Investigate a reported issue end to end. Pull together everything established
so far in the session (tickets, Slack, prior findings) and ground every claim
in the codebase. The output is a diagnosis with `repo/file.py:LINE` citations,
not a guess.

The single most important rule: **use the code to figure out what to search
for.** Blind searches waste time. The code tells you the exact error strings,
exception class names, event names, config flags, and identifiers that actually
exist. Read first, then search for the real tokens, then read the hits.

## Prerequisites

- Know which repos are in scope and where they live on disk. Default Peach set:
  `peach-main` (backend API, business logic, events), `peach-front` (UI, admin
  and agent portals), `peach-docs` (documented behavior).
- Have the concrete symptom in hand: an error message, a screenshot, a loan or
  transaction ID, an endpoint, a timestamp, or a "this used to work" report.
- Confirm the environment (prod, dev, sandbox) and any feature flags or
  per-company config that could change the code path.
- If any of the above is missing and it is load-bearing, ask one question and
  stop. Do not debug a symptom you cannot name.

## Steps

### 1. Understand the issue

State the issue in one or two sentences before touching the codebase. Separate
what was observed (the symptom) from what is assumed (the suspected cause).
Pull in everything already gathered this session: the ticket text, Slack
threads, prior grep results, earlier findings. Write down the exact tokens the
report gives you: error text, status code, field name, ID prefix, endpoint
path. Those tokens are your first search seeds.

### 2. Search the codebase

Start from the most specific token you have and let each hit hand you the next
search term. Always check `peach-docs` first for documented behavior, then
`peach-main` for the implementation, then `peach-front` for the surface.

Skip `node_modules/`, `dist/`, `build/`, `__snapshots__/`, `test/fixtures/`,
and `migrations/` unless the issue is specifically in one of them.

### 3. Pick the right signals

Not every hit matters. Choose the signals that actually sit on the failing
path. A signal is worth following when it is on the code path the symptom
travels, it is gated by the environment or config in play, or it names the
exact identifier from the report. Discard loose keyword matches that are not on
the path.

### 4. Run queries

Once the code tells you which table, column, status, or ID to look at, write
the SQL or API queries to confirm the state. Anchor queries to the real schema
names you found in the models, not to invented column names. Prefer a
self-service query the user can run on the replica, and include it verbatim so
it can be copied.

### 5. Analyze findings

Reconcile what the code says should happen with what the queries and reports
show actually happened. When they diverge, that divergence is the finding.
Decide whether the cause is a bug, a configuration or feature-flag state, a
data condition, or expected behavior that was misread. If the path forks on a
flag or per-company setting, say which branch this case took and why.

### 6. Report

Lead with the diagnosis in one or two sentences. Then give the evidence chain:
each claim with its `repo/file.py:LINE` citation, the query results, and the
config or flag state. Flag anything inferred rather than verified. Close with
the next action: the fix, the escalation, or the data correction. If a fix is
out of scope here, hand the diagnosis to the bug-report skill to file a story.

## What to look for

- **Exact error strings** from the report. Grep the literal text to land on the
  `raise` or `logger` line that emits it.
- **Exception class names** (`BaseAPIError` subclasses, `InvalidApiUsage`,
  custom errors). Find where they are raised and what conditions trigger them.
- **Event names** (`loan.created`, `loan.reimbursement.processed`) and their
  firing mode (PubSub, Database, or both).
- **Config flags and feature flags** that gate the path. A flag set to false is
  often the whole answer.
- **Identifiers and ID prefixes** from the report (loan, borrower, draw,
  transfer, document descriptor). They tell you which model and table to read.
- **Status and enum values** (loan status, transfer status, purchase type).
  The status the report shows versus the status the code requires is usually
  the divergence.
- **Permissions and decorators** (`@Policy`, `@limiter.limit`, role actions)
  when the symptom is a 401, 403, or 429.
- **The handler for the endpoint**: start at the OpenAPI path, follow it to the
  handler in `peach/<domain>/handlers.py`, then into the controller.

## How to search

- Start narrow with the literal token, widen only if it returns nothing:
  `grep -rn "exact error text" --include="*.py" peach/`
- Find where an exception is raised:
  `grep -rn "class <ExceptionName>\|raise <ExceptionName>" --include="*.py" peach/`
- Trace an event from emission to handler:
  `grep -rn "<EventClassName>\|<event.name>" --include="*.py" peach/`
- Locate a config or feature flag and its default:
  `grep -rn "<flag_name>\|feature_flag" --include="*.py" peach/`
- Find an endpoint then its handler:
  `grep -rn "<path-segment>" --include="*.yml" openapi/` then grep the handler
  name in `peach/`.
- For a UI symptom, grep the visible label or test id in `peach-front`, then
  follow the component to the API call it makes.
- Let each hit feed the next query. A function name found in step one becomes
  the search term in step two. Never run a second blind keyword search when a
  hit from the first already named the next token.

## Guidelines

- Code is ground truth. Docs, Slack, and prior tickets describe intent; the
  code describes behavior. When they disagree, the code wins and the gap is a
  finding worth flagging.
- Every load-bearing claim gets a `repo/file.py:LINE` citation or it is marked
  as inference.
- Read the specific lines you cite. Do not cite a file you only grepped.
- Confirm the environment and flag state before blaming the code. The same code
  behaves differently across prod, dev, and per-company config.
- Reproduce the path in your head end to end before declaring a cause. If you
  only read one branch of a fork, say so.
- Keep the report tight. Diagnosis first, evidence second, next action last.
