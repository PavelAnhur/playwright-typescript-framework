# ai-qa-harness

A small layer that applies LLM agents to the QA workflow around this Playwright framework. Not a chatbot, not a wrapper — three narrow agents, each with a defined input and a validated output.

## What it does

Three agents, one command:

| Agent                    | Input                                  | Output                                         |
| ------------------------ | -------------------------------------- | ---------------------------------------------- |
| **requirements-analyst** | A requirements document (`.md`)        | Risks + test cases (`.yaml`)                   |
| **failure-analyst**      | A test failure (`.txt` fixture)        | Hypothesis + category + evidence (`.json`)     |
| **judge**                | A triage result + the original failure | Score + verdict + hallucination list (`.json`) |

The judge is what makes this different from "call a model and trust the output." Every hypothesis is scored against a rubric by a second model call, and any claim not grounded in the input is flagged.

## Quick start

One-time setup:

```
npm install
cp .env.example .env.local
```

Then edit `.env.local` and fill in `DSH_BASE_URL`, `DSH_MODEL`, `DSH_API_KEY`.

Run the full pipeline:

```
npm run ai:demo
```

Output lands in `generated-cases/`. Raw logs (prompt, response, timing, tokens) land in `logs/ai/`.

## Individual agents

```
npm run ai:requirements   # requirements-analyst on fixtures/requirements/checkout.md
npm run ai:triage         # failure-analyst on fixtures/failures/checkout-button-disabled.txt
npm run ai:judge          # judge on the most recent triage output
```

Each script accepts an optional file path argument:

```
npx tsx src/ai/agents/requirementsAnalyst.ts fixtures/requirements/other.md
npx tsx src/ai/agents/failureAnalyst.ts fixtures/failures/other.txt
npx tsx src/ai/agents/judge.ts generated-cases/other.triage.json fixtures/failures/other.txt
```

## Architecture

```
src/ai/
  config.ts               # loads .env.local, resolves paths
  dshClient.ts            # OpenAI-compatible client, retries, logging
  logger.ts               # JSONL log per process run
  schemas.ts              # zod schemas — the contract between agent and caller
  prompts/
    requirementsAnalyst.ts
    failureAnalyst.ts
    judge.ts
  agents/
    requirementsAnalyst.ts
    failureAnalyst.ts
    judge.ts
```

Two design decisions worth calling out:

**1. Schemas are the contract.** Every agent's output is validated with zod before it's used. If the model returns `category: "flaky"` instead of `"flake"`, the schema rejects it and the caller sees a clear error, not a silent misclassification downstream.

**2. Every call is logged.** `logs/ai/run-<timestamp>.jsonl` contains the full prompt, the raw model response, timing, token usage, and status for every request. When the model produces something surprising, the log is the ground truth — not a re-run.

## Design principles

- **No provider lock-in.** The client talks OpenAI-compatible `POST /chat/completions`. Swapping providers is a change to `.env.local`, not a code change.
- **No silent failures.** If a call fails after retries, the error is logged and the process exits non-zero. CI catches it.
- **JSON mode enforced.** `response_format: { type: "json_object" }` is on by default, so the model cannot wrap its output in markdown prose.
- **No hallucination without a flag.** The judge's rubric counts any claim not supported by the input as a hallucination, and lists them explicitly.

## Sample output

`fixtures/sample-output/` contains one frozen run of the full pipeline:

- `checkout.yaml` — risks and test cases generated from `fixtures/requirements/checkout.md`
- `checkout-button-disabled.triage.json` — triage of a real-looking Playwright failure
- `checkout-button-disabled.judge.json` — the judge's verdict on that triage
- `sample-run.jsonl` — the raw log of that run

The triage correctly classifies the failure as a **product bug**: the checkout button is not disabled when the cart is empty, despite the spec requiring it. The judge scores the triage 9/10 and finds no hallucinations.

## Not included (deliberately)

- **No autonomous UI exploration.** The agents analyze text and code; they do not drive a browser on their own. Adding that would trade stability for a demo that only works half the time.
- **No RAG / vector store.** If a task needs retrieval over a large corpus, that's a separate concern — this layer stays small on purpose.
- **No fine-tuning, no agent framework.** Prompts and zod schemas are enough at this scale.