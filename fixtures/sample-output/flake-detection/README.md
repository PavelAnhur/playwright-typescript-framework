# Flake detection — frozen example

This folder contains a frozen output of the `flake-detector` (`src/ai/tools/detectFlake.ts`), captured on a real parallel-isolation flake in the API suite.

## File

`order-operations.json` — the full `FlakeDetectionResult` object returned by the detector.

## What it shows

The detector ran five phases against `tests/specs/api/buyer/order-operations.spec.ts`:

| Phase                      | Scope | Workers | Repeat-each | Result     | Duration |
| -------------------------- | ----- | ------- | ----------- | ---------- | -------- |
| file-serial-w1-r1-attempt1 | file  | 1       | 1           | PASSED     | 2914ms   |
| file-serial-w1-r1-attempt2 | file  | 1       | 1           | PASSED     | 2865ms   |
| file-parallel-w2-r1        | file  | 2       | 1           | PASSED     | 2736ms   |
| file-parallel-w2-r3        | file  | 2       | 3           | **FAILED** | 4125ms   |

Final classification: `flake_parallel`.

The failing test:
`api/buyer/order-operations.spec.ts:60:3 › Buyer API -- Order Operations › should get single order by reference`

## Why this happens

`order-operations.spec.ts` calls `POST /_reset` in `beforeEach`. That endpoint resets the server's global state — products, carts, orders, users. Under `--workers=2`, two workers run different tests from the same file at the same time, and one test's `_reset` can wipe the state another test just created.

The file fails **only** when run in parallel. In serial (`--workers=1`) it always passes. That's the signature of a parallel-isolation flake — the detector reports it as `flake_parallel`.

## What to do about it

Three options, listed in the detector's recommendation:

1. Add `test.describe.configure({ mode: 'serial' })` to serialize the file.
2. Refactor the tests to use unique per-test data (own users, own products).
3. Fix the server side — `POST /_reset` should not exist in production, or should scope to the calling session.

In the framework we chose option 1 as an immediate fix. The underlying issue is tracked in the maison repo (see maison issue `POST /_reset resets global server state`).

## Reproducing

`npm run ai:flake-detect -- tests/specs/api/buyer/order-operations.spec.ts`

The flake is probabilistic — it fires roughly 1 in 40 runs at `--repeat-each=3`. If the detector reports `not_reproduced`, retry.
