
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

## 📁 Project Structure

<details>
<summary>📂 Click to expand full project structure</summary>

```bash
# Generated using: tree -f -I "node_modules|test-results|playwright-report"

playwright-typescript-framework/
├── src/
│   ├── config/
│   │   ├── env.ts
│   │   └── timeouts.ts
│   ├── types/
│   │   ├── account.ts
│   │   ├── cart.ts
│   │   ├── certificate.ts
│   │   ├── csv.ts
│   │   ├── order.ts
│   │   ├── product.ts
│   │   └── storage-state.ts
│   └── setup/
├── tests/
│   ├── fixtures/
│   │   ├── api.fuxture.ts
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
│   ├── specs/
│   │   ├── api/
│   │   │   ├── buyer/
│   │   │   │   ├── authentication.spec.ts
│   │   │   │   ├── cart-operations.spec.ts
│   │   │   │   ├── error-envelope.spec.ts
│   │   │   │   └── order-operations.spec.ts
│   │   │   ├── home-page/
│   │   │   │   ├── cors-headers.spec.ts
│   │   │   │   ├── error-envelope.spec.ts
│   │   │   │   ├── health.spec.ts
│   │   │   │   ├── products-catalogue.spec.ts
│   │   │   │   ├── products-categories.spec.ts
│   │   │   │   ├── products-certificate.spec.ts
│   │   │   │   ├── products-id.spec.ts
│   │   │   │   ├── security-headers.spec.ts
│   │   │   │   └── seed-info.spec.ts
│   │   │   └── seller/
│   │   │       ├── edge-cases.spec.ts
│   │   │       ├── pagination-filter.spec.ts
│   │   │       ├── products-certificate.spec.ts
│   │   │       ├── products-discount.spec.ts
│   │   │       ├── products-get.spec.ts
│   │   │       ├── products-images.spec.ts
│   │   │       ├── products-patch.spec.ts
│   │   │       ├── products-post.spec.ts
│   │   │       └── security-idor.spec.ts
│   │   ├── ui/
│   │   │   ├── home-page/
│   │   │   │   ├── accessibility.spec.ts
│   │   │   │   ├── authenticated-buyer.spec.ts
│   │   │   │   ├── catalog-toolbar.spec.ts
│   │   │   │   ├── header-navigation.spec.ts
│   │   │   │   ├── hero-section.spec.ts
│   │   │   │   └── product-card.spec.ts
│   │   │   ├── login-page/
│   │   │   │   ├── accessibility.spec.ts
│   │   │   │   ├── edge-cases.spec.ts
│   │   │   │   ├── functionality.spec.ts
│   │   │   │   ├── layout.spec.ts
│   │   │   │   ├── navigation.spec.ts
│   │   │   │   ├── responsive.spec.ts
│   │   │   │   ├── security.spec.ts
│   │   │   │   ├── session.spec.ts
│   │   │   │   ├── user-experience.spec.ts
│   │   │   │   └── validation.spec.ts
│   │   │   └── register-page/
│   │   │       └── register.spec.ts
│   │   └── unit/
│   │       └── utils/
│   │           ├── csv-reader.test.ts
│   │           ├── file-utils.test.ts
│   │           ├── path-utils.test.ts
│   │           └── stack-trace.test.ts
│   ├── test-data/
│   │   └── specs/
│   │       ├── api/
│   │       │   └── home-page/
│   │       │       └── products-catalogue/
│   │       │           └── products.csv
│   │       └── ui/
│   │           └── home-page/
│   │               └── catalog-toolbar/
│   │                   ├── categories.csv
│   │                   └── sort-options.csv
│   └── utils/
│       ├── csv-reader.ts
│       ├── file-utils.ts
│       ├── path-utils.ts
│       └── stack-trace.ts
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
npm test

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
✅ Comprehensive Testing: 270+ tests across three layers\
✅ Maintainable Code: Page Object Model and custom fixtures\
✅ Type Safety: Full TypeScript coverage\
✅ Parallel Execution: Optimized test execution\
✅ CI/CD Ready: Automated testing in GitHub Actions\
✅ Cross-Browser: Chrome, Firefox, WebKit, and mobile\

### 🤝 Contributing
Fork the repository\
Create your feature branch (git checkout -b feature/amazing-feature)\
Commit your changes (git commit -m 'Add some amazing feature')\
Push to the branch (git push origin feature/amazing-feature)\
Open a Pull Request\

### 📝 License
This project is licensed under the MIT License - see the LICENSE file for details.

## 📬 Connect with Me
LinkedIn: [Pavel Anhur](https://www.linkedin.com/in/pavel-anhur-1917821bb/)\
Email: pavel.anhur@gmail.com\

🌟 Why This Project?
This project demonstrates my expertise in:

Test Automation: Building comprehensive test suites for modern web applications\
Framework Design: Creating maintainable, scalable test frameworks\
TypeScript: Writing type-safe, production-quality code\
CI/CD: Automating testing in continuous integration pipelines\
Best Practices: Following industry standards (POM, fixtures, data-driven testing)\
