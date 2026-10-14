# Agent Operating Rules

These rules govern how an agent works ANY task in this repo. Read this file BEFORE the
work order. The work order tells you WHAT to do; this file tells you HOW to work.

The work order is the task. These rules are the protocol. If a work order and this file
ever conflict, stop and ask — do not guess.

---

## How to read a work order

A work order has four parts. Find them before you start:

1. DELIVERABLE — the one artifact the task asks for. This is the only output.
2. CONSTRAINTS — what you may not change, and what is out of scope.
3. EVIDENCE — the exact commands to run and the exact format to paste results in.
4. REPLY FORMAT — the exact shape of your reply, usually a fixed list (a, b, c, ...).

Produce (1). Honor (2). Paste raw results for (3). Follow (4) exactly.

## What success looks like

A bounded artifact plus raw evidence, in the reply format.
OR
A one-line divergence / blocker with the command that showed it.

Never a narrative. Never a "summary of what I did." Never "recommendations for next
session." Those are failure modes, not deliverables.

---

## The rules

### 1. ONE DELIVERABLE
This task asks for exactly one output artifact, named in the work order.
Produce that artifact. Nothing else. Do not produce commentary about the task.

### 2. DO NOT RE-VERIFY
If you have already checked a fact once in this task, do not check it again.
Checking the same thing twice is a failure mode, not diligence.
If you catch yourself re-deriving something you already concluded, STOP RE-DERIVING
and move on.

### 3. DO NOT RESTATE
Do not restate these rules, the work order, or your own earlier reasoning.
The output is the artifact and its required evidence — not a narrative about producing it.

### 4. STOP-AT-DIVERGENCE
If at any point you find that the requested change would alter behavior, output, ordering,
or data, STOP IMMEDIATELY. Report that single finding and the evidence for it.
Do not continue to the rest of the task.
A correct early stop is a successful result, not a failure.

### 5. FIXED-FORMAT EVIDENCE
Where the work order asks for evidence, it gives a fixed format — a table, a diff, an
exact command plus raw output. Fill that format. Do not substitute a summary, a
description, or a re-explanation. Raw output only.

### 6. WHEN DONE, STOP
When you have produced the deliverable, end your reply. Do not add a "summary of what I
did," a "recommendations for next session," or an offer to continue.

### 7. IF BLOCKED, SAY SO IN ONE LINE
If you cannot produce the deliverable, reply with the single blocking error and the
command that produced it. Do not keep trying variations.

---

## Anti-loop guidance (read this if you feel stuck)

If you notice you are doing any of these, stop and act:

- Proving the same thing a second time -> stop; you already have the answer.
- Writing "verified" next to a conclusion you reached earlier -> stop re-checking.
- Re-reading a file you already read for this task -> stop; use what you have.
- Producing more reasoning instead of the artifact -> stop reasoning and write the artifact.
- Trying a fifth variation of a failed command -> stop; report the block in one line (rule 7).

The failure this file exists to prevent is the loop: an agent that keeps verifying instead
of finishing. Finishing — or stopping cleanly at a divergence — is the goal.
