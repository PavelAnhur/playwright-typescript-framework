# ai-qa-harness

A small layer that applies LLM agents to the QA workflow around this Playwright framework. Not a chatbot, not a wrapper — four narrow agents, each with a defined input and a validated output, all reachable from the CLI and via MCP.

## What it does

| Agent                    | Input                                  | Output                                         |
| ------------------------ | -------------------------------------- | ---------------------------------------------- |
| **requirements-analyst** | A requirements document (`.md`)        | Risks + test cases (`.yaml`)                   |
| **failure-analyst**      | A test failure (`.txt` fixture)        | Hypothesis + category + evidence (`.json`)     |
| **judge**                | A triage result + the original failure | Score + verdict + hallucination list (`.json`) |
| **spec-generator**       | A test case from a requirements YAML   | A passing Playwright test (`.spec.ts`)         |

Three things make this different from "call a model and trust the output":

**The judge.** Every failure-analyst hypothesis is scored against a rubric by a second model call. Any claim not grounded in the input is flagged as a hallucination and listed explicitly.

**The refine loop.** spec-generator doesn't just generate a test — it runs it, reads the Playwright error context (including a DOM snapshot), sends it back to the model, and iterates up to maxIterations until the test passes.

**Hollow-pass detection.** When the refine loop reports a passing test, the harness validates every data-testid referenced in the test against the app source. A test that passes because it references a non-existent element is flagged as hollowPass: true — not silently accepted.

## Quick start

One-time setup:

    npm install
    cp .env.example .env.local

Then edit .env.local and fill in DSH_BASE_URL, DSH_MODEL, DSH_API_KEY.

Run the CLI pipeline:

    npm run ai:demo

Output lands in generated-cases/. Raw logs (prompt, response, timing, tokens) land in logs/ai/.

Run the refine loop on a specific case:

    npm run ai:refine generated-cases/checkout.yaml C2 3

This generates a Playwright test for case C2, runs it, and refines it until it passes (up to 3 iterations). The final test lands in tests/specs/review/.

## Individual agents

    npm run ai:requirements   # requirements-analyst on fixtures/requirements/checkout.md
    npm run ai:triage         # failure-analyst on fixtures/failures/checkout-button-disabled.txt
    npm run ai:judge          # judge on the most recent triage output
    npm run ai:refine         # spec-generator + refine loop on a case from a YAML

Each script accepts optional arguments:

    npx tsx src/ai/agents/requirementsAnalyst.ts fixtures/requirements/other.md
    npx tsx src/ai/agents/failureAnalyst.ts fixtures/failures/other.txt
    npx tsx src/ai/agents/judge.ts generated-cases/other.triage.json fixtures/failures/other.txt
    npx tsx src/ai/agents/refineSpecCli.ts generated-cases/checkout.yaml C2 3

## MCP server

Every agent is also exposed as an MCP (Model Context Protocol) tool. Any MCP-compatible client — Klepa AI, Claude Desktop, Cursor, or a self-hosted setup — can call them.

Tools:

- analyze_requirements — path to a requirements markdown, returns risks + cases
- triage_failure — test failure context, returns hypothesis + category + evidence
- judge_triage — path to a triage JSON, returns verdict + hallucination list
- generate_spec — path to a requirements YAML + case ID, runs the refine loop and returns the final test

Client wiring is documented in kilo.jsonc (Klepa AI) and .vscode/mcp.json (VS Code Copilot). The MCP server is src/ai/mcp-server.ts and uses stdio transport.

## Architecture

    src/ai/
      config.ts                     # loads .env.local, resolves paths
      dshClient.ts                  # OpenAI-compatible client, retries, logging
      logger.ts                     # JSONL log per process run
      schemas.ts                    # zod schemas — the contract between agent and caller
      mcp-server.ts                 # exposes all agents as MCP tools
      prompts/
        requirementsAnalyst.ts
        failureAnalyst.ts
        judge.ts
        specGenerator.ts            # generation + refinement system prompts
      agents/
        requirementsAnalyst.ts
        failureAnalyst.ts
        judge.ts
        specGenerator.ts            # one-shot generation of a spec
        refineSpec.ts               # the loop: generate → run → refine
        specGeneratorCli.ts
        refineSpecCli.ts
      tools/
        runPlaywrightTest.ts        # runs a spec, returns pass/fail + error context
        loadProjectContext.ts       # loads AGENTS.md, fixtures, page objects for the prompt
        validateTestSelectors.ts    # checks each data-testid in a spec against the app source
        refineLogger.ts             # per-iteration JSONL for the refine loop

Design decisions worth calling out:

**1. Schemas are the contract.** Every agent's output is validated with zod before it's used. If the model returns category: "flaky" instead of "flake", the schema rejects it and the caller sees a clear error, not a silent misclassification downstream.

**2. Every call is logged.** logs/ai/run-<timestamp>.jsonl contains the full prompt, the raw model response, timing, token usage, and status for every request. logs/ai/refine-<caseId>-<timestamp>.jsonl records each iteration of the refine loop. When the model produces something surprising, the log is the ground truth — not a re-run.

**3. Selectors must be verified.** The refine prompt forbids inventing selectors. Every selector in the generated test must be justified by the DOM snapshot in the Playwright error context or by the project source. After the loop, validateTestSelectors cross-checks every data-testid against maison/web/src and maison/server/src.

## Design principles

- **No provider lock-in.** The client talks OpenAI-compatible POST /chat/completions. Swapping providers is a change to .env.local, not a code change.
- **No silent failures.** If a call fails after retries, the error is logged and the process exits non-zero. CI catches it.
- **JSON mode enforced.** response_format: { type: "json_object" } is on by default, so the model cannot wrap its output in markdown prose.
- **No hallucination without a flag.** The judge's rubric counts any claim not supported by the input as a hallucination, and lists them explicitly.
- **No hollow passes.** A green test that references a non-existent element is treated as suspect and flagged, not accepted.

## Sample output

fixtures/sample-output/ contains frozen examples:

- checkout.yaml — risks and test cases generated from fixtures/requirements/checkout.md
- checkout-button-disabled.triage.json and checkout-button-disabled.judge.json — a triage of a Playwright failure and the judge's verdict
- judge-catches-hallucination/ — a case where the failure-analyst invented a concept ("pages") not present in the test or the API, and the judge caught it: 6/10, partially_correct, four hallucinations flagged
- triage-run/ — a three-failure triage run from the CI reporter
- sample-run.jsonl — a raw log of one pipeline run

## Not included (deliberately)

- **No autonomous browser exploration.** The refine loop runs a test and reacts to its output, but the agents do not explore the UI on their own to discover new scenarios. Adding that would trade stability for a demo that only works half the time.
- **No RAG / vector store.** If a task needs retrieval over a large corpus, that's a separate concern — this layer stays small on purpose.
- **No fine-tuning, no agent framework.** Prompts and zod schemas are enough at this scale.
