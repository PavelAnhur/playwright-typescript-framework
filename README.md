# 🎭 Playwright TypeScript Test Framework

[![Playwright](https://img.shields.io/badge/Playwright-2.0.0+-45ba4b?logo=playwright&logoColor=white)](https://playwright.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/Vitest-1.0+-6e9f18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> A production-ready test automation framework for modern web applications, combining end-to-end, API, and unit testing with best practices.

## 📋 Overview

This comprehensive test automation framework was built to test the [**Maison** Application Under Test (AUT)](https://github.com/PavelAnhur/maison) — a luxury e-commerce demo application. It demonstrates professional testing practices across three key layers:

- **🧪 Unit Tests** - Fast, isolated component testing with Vitest
- **🔌 API Tests** - Contract and integration testing with Playwright
- **🖥️ UI Tests** - End-to-end browser automation with Playwright

### The Allure test execution report can be found [here](https://pavelanhur.github.io/playwright-typescript-framework/)

### Key Features

- ✅ **Three Testing Layers** - Unit, API, and UI tests in one unified framework
- ✅ **Page Object Pattern** - Clean, maintainable page objects with shared components
- ✅ **Custom Fixtures** - Reusable test fixtures for authentication, products, and orders
- ✅ **Data-Driven Testing** - CSV-based test data with proper typing
- ✅ **Environment-specific Testing** - Environment-aware configuration with caching
- ✅ **Cross-Browser Testing** - Chrome, Firefox, WebKit, and mobile viewports
- ✅ **Comprehensive Reporting** - Allure report, HTML reports, JUnit XML, and CI/CD integration
- ✅ **Type Safety** - Full TypeScript support with strict type checking
- ✅ **Parallel Execution** - Optimized test execution with parallel workers
- ✅ **CI/CD Ready** - GitHub Actions workflows for automated testing

## 🤖 AI-QA Harness

An additional layer that applies LLM agents to the QA workflow around this framework. Four narrow agents, each with a defined input and validated output:

| Agent                    | Input                              | Output                                      |
| ------------------------ | ---------------------------------- | ------------------------------------------- |
| **requirements-analyst** | Requirements document              | Risks + test cases (YAML)                   |
| **failure-analyst**      | One or more test failures          | Hypothesis + category + evidence (JSON)     |
| **judge**                | Triage + original failure          | Score + verdict + hallucination list (JSON) |
| **spec-generator**       | Test case from a requirements YAML | A passing Playwright test (`*.spec.ts`)     |

Three design decisions make this different from "call a model and trust the output":

**The judge is adversarial.** Every failure-analyst hypothesis is scored against a rubric by a second model call. Any claim not grounded in the input is flagged as a hallucination and listed explicitly.

**Triage is batched and self-corrected.** `failure-analyst` sends all failures in a single model call (~70–85% cost reduction vs. one-per-failure), then a flake detector re-runs the failing file in serial, parallel, and suite modes to check whether the analyst's classification was wrong. Low-confidence `product_bug` results are the most common correction target.

**CI integrates automatically.** A Playwright reporter hooks into the lifecycle and runs the batch triage after every test run. Flake detection is triggered only for promising candidates, with a per-run cap. Output: `test-results/ai-triage-summary.json` plus a terminal summary.

Every agent is also exposed through an MCP server — any MCP-compatible AI client (Klepa AI, Claude Desktop, Cursor) can call them directly. Run the full CLI pipeline with `npm run ai:demo`. Design notes in [`src/ai/README.md`](src/ai/README.md) and frozen sample runs in `samples/sample-output/`.

## 🔧 Driver Workflow (scripts/)

`scripts/` holds the driver tools that gate and land every change. They are not test code and not Aider plugins. Full inventory: [`scripts/README.md`](scripts/README.md).

The flow, one line per step:

- Start a task branch: `scripts/start-task.sh`
- The Coder edits (Aider), not a script
- Local gate + Judge review: `scripts/flow.sh` (runs `verify.sh`, then `judge.sh`)
- Adversarial Reviewer: separate agent, inspection-only, pre-commit
- Commit + push + PR: `scripts/commit.sh` / `scripts/ai-commit-pr.sh`, `scripts/open-pr.sh`
- Merge + gate poll + cleanup: `scripts/finish-task.sh`
- All of the above in one command: `scripts/land-task.sh`

Honesty rules:

- The gate is `verify.sh` (tsc, vitest, prettier, eslint, `npm ci --dry-run`, `bash -n`, mojibake check).
- The local gate CANNOT see runtime behavior. New script paths are proven by execution on a throwaway branch.
- A green check is not acceptance. Read the artifact, not the signal.

Two things are called "judge". The harness judge (above) scores failure-analyst hypotheses and returns JSON. The review Judge (`scripts/judge.sh`, `scripts/judge.mjs`) reviews the staged diff and must produce a six-section markdown review; a content-shape guard refuses anything without all six sections and a minimum length. Honest limitation: the Judge lane currently fails closed on the AIAI gateway (timeout / partial output). That is a recorded standing limitation, not a pass.

`scripts/land-task.sh` chains commit -> PR -> merge, streams output, and sets ASCII `[ok]` / `[FAIL]` / `[--]` markers only after state verification. The happy path is proven by smoke test (#95); failure paths are not exercised.

## 📁 Project Structure

<details>
<summary>📂 Click to expand full project structure</summary>

```bash
# Project layout (curated). Full listing: tree -f -I "node_modules|test-results|playwright-report|allure-results|allure-report|.git|maison|logs|generated-cases|scratch|samples|src/ai"

playwright-typescript-framework/
├── src/
│   ├── config/
│   │   ├── env.ts
│   │   ├── environment.ts
│   │   └── timeouts.ts
│   ├── fixtures/
│   │   ├── api.fixture.ts
│   │   ├── auth.browser.fixture.ts
│   │   ├── auth.fixture.ts
│   │   ├── csv.fixture.ts
│   │   ├── index.ts
│   │   ├── order.fixture.ts
│   │   ├── pages.fixture.ts
│   │   └── product.fixture.ts
│   ├── pages/
│   │   ├── BasePage.ts
│   │   ├── HomePage.ts
│   │   ├── LoginPage.ts
│   │   └── RegisterPage.ts
│   ├── setup/
│   │   ├── allure-setup.ts
│   │   └── global-setup.ts
│   ├── types/
│   │   ├── account.ts
│   │   ├── cart.ts
│   │   ├── certificate.ts
│   │   ├── csv.ts
│   │   ├── order.ts
│   │   ├── product.ts
│   │   └── storage-state.ts
│   └── utils/
│       ├── allureHelper.ts
│       ├── authContext.manager.ts
│       ├── csvReader.ts
│       ├── fileUtils.ts
│       ├── normalizeFileName.ts
│       ├── pathUtils.ts
│       ├── stackTrace.ts
│       ├── stepDecorator.ts
│       └── stripFences.ts
├── test-data/
│   └── specs/
│       ├── api/
│       │   └── home-page/
│       │       └── products-catalogue/
│       │           └── products.csv
│       └── ui/
│           └── home-page/
│               └── catalog-toolbar/
│                   ├── categories.csv
│                   └── sort-options.csv
├── tests/
│   ├── specs/
│   │   ├── api/
│   │   │   ├── buyer/
│   │   │   ├── home-page/
│   │   │   └── seller/
│   │   ├── review/
│   │   └── ui/
│   │       ├── home-page/
│   │       ├── login-page/
│   │       └── register-page/
│   └── unit/
│       ├── ai/
│       ├── reporters/
│       └── utils/
│           ├── csvReader.test.ts
│           ├── fileUtils.test.ts
│           ├── pathUtils.test.ts
│           └── stackTrace.test.ts
├── scripts/
│   ├── ai-commit-pr.sh
│   ├── aider-lint.sh
│   ├── commit-msg.mjs
│   ├── commit.sh
│   ├── finish-task.sh
│   ├── flow.sh
│   ├── gate-watch.sh
│   ├── judge.mjs
│   ├── judge.sh
│   ├── land-task.sh
│   ├── open-pr.sh
│   ├── start-task.sh
│   └── verify.sh
├── playwright.config.ts
├── vitest.config.ts
├── tsconfig.json
├── package.json
├── package-lock.json
└── eslint.config.js
```

</details>

## 🚀 Getting Started

### Prerequisites

- **Node.js 20.0+** - [Download](https://nodejs.org/)
- **npm** 10.0+ or **yarn** 1.22+

### Installation

```bash
# Clone the repository
git clone https://github.com/PavelAnhur/playwright-typescript-framework.git
cd playwright-typescript-framework

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Run all tests (unit + API + UI)
npm test:all

# Run specific test types
npm run test:unit     # Vitest unit tests
npm run test:api      # Playwright API tests
npm run test:ui       # Playwright UI tests (Chromium)

# Run specific browsers
npm run test:chromium
npm run test:firefox
npm run test:webkit

# Run mobile tests
npm run test:mobile

# Run with UI mode (interactive)
npx playwright test --ui

# Run specific test file
npx playwright test tests/specs/api/buyer/cart-operations.spec.ts --project=api

# Run with grep pattern
npx playwright test -g "should add item to cart"

# Generate HTML report
npx playwright show-report

# Generate JUnit XML report (for CI/CD)
# See test-results/junit.xml
```

### 🎯 Key Achievements

✅ Comprehensive Testing: 250+ tests across three layers\
✅ Maintainable Code: Page Object Model and custom fixtures\
✅ Type Safety: Full TypeScript coverage\
✅ Parallel Execution: Optimized test execution\
✅ CI/CD Ready: Automated testing in GitHub Actions\
✅ Cross-Browser: Chrome, Firefox, WebKit, and mobile

### 🤝 Contributing

Fork the repository\
Create your feature branch (git checkout -b feature/amazing-feature)\
Commit your changes (git commit -m 'Add some amazing feature')\
Push to the branch (git push origin feature/amazing-feature)\
Open a Pull Request

### 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📬 Connect with Me

LinkedIn: [Pavel Anhur](https://www.linkedin.com/in/pavel-anhur-1917821bb/)\
Email: pavel.anhur@gmail.com

🌟 Why This Project?
This project demonstrates my expertise in:

Test Automation: Building comprehensive test suites for modern web applications\
Framework Design: Creating maintainable, scalable test frameworks\
TypeScript: Writing type-safe, production-quality code\
CI/CD: Automating testing in continuous integration pipelines\
Best Practices: Following industry standards (POM, fixtures, data-driven testing)
