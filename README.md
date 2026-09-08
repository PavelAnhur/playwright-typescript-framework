# 🎭 Playwright TypeScript Test Framework

[![Playwright](https://img.shields.io/badge/Playwright-2.0.0+-45ba4b?logo=playwright&logoColor=white)](https://playwright.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/Vitest-1.0+-6e9f18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> A production-ready test automation framework for modern web applications, combining end-to-end, API, and unit testing with best practices.

## 📋 Overview

This comprehensive test automation framework was built to test the **Maison** Application Under Test (AUT) — a luxury e-commerce demo application. It demonstrates professional testing practices across three key layers:

- **🧪 Unit Tests** - Fast, isolated component testing with Vitest
- **🔌 API Tests** - Contract and integration testing with Playwright
- **🖥️ UI Tests** - End-to-end browser automation with Playwright

### Key Features

- ✅ **Three Testing Layers** - Unit, API, and UI tests in one unified framework
- ✅ **Page Object Pattern** - Clean, maintainable page objects with shared components
- ✅ **Custom Fixtures** - Reusable test fixtures for authentication, products, and orders
- ✅ **Data-Driven Testing** - CSV-based test data with proper typing
- ✅ **Cross-Browser Testing** - Chrome, Firefox, WebKit, and mobile viewports
- ✅ **Comprehensive Reporting** - HTML reports, JUnit XML, and CI/CD integration
- ✅ **Type Safety** - Full TypeScript support with strict type checking
- ✅ **Parallel Execution** - Optimized test execution with parallel workers
- ✅ **CI/CD Ready** - GitHub Actions workflows for automated testing

## 📁 Project Structure
playwright-typescript-framework/
├── 📂 src/
│ ├── 📂 config/ # Configuration management
│ ├── 📂 types/ # TypeScript type definitions
│ └── 📂 setup/ # Test setup and utilities
├── 📂 tests/
│ ├── 📂 fixtures/ # Custom Playwright fixtures
│ │ ├── auth.fixture.ts # Authentication contexts
│ │ ├── product.fixture.ts # Product creation helpers
│ │ ├── order.fixture.ts # Order creation helpers
│ │ └── csv.fixture.ts # CSV data loading
│ ├── 📂 pages/ # Page Object Model
│ │ ├── BasePage.ts # Base page with shared elements
│ │ ├── LoginPage.ts # Login page object
│ │ ├── RegisterPage.ts # Registration page object
│ │ └── HomePage.ts # Home page object
│ ├── 📂 specs/ # Test specifications
│ │ ├── 📂 api/ # API tests
│ │ │ ├── buyer/ # Buyer endpoints
│ │ │ ├── seller/ # Seller endpoints
│ │ │ └── home-page/ # Public endpoints
│ │ ├── 📂 ui/ # UI tests
│ │ │ ├── login-page/ # Login functionality
│ │ │ ├── register-page/ # Registration functionality
│ │ │ └── home-page/ # Home page interactions
│ │ └── 📂 unit/ # Unit tests (Vitest)
│ │ └── utils/ # Utility function tests
│ ├── 📂 test-data/ # Test data files
│ │ └── 📂 specs/ # CSV test data
│ └── 📂 utils/ # Test utilities
├── 📄 playwright.config.ts # Playwright configuration
├── 📄 vitest.config.ts # Vitest configuration
├── 📄 tsconfig.json # TypeScript configuration
└── 📄 package.json # Project dependencies


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

🎯 Key Achievements
✅ Comprehensive Testing: 170+ tests across three layers
✅ Maintainable Code: Page Object Model and custom fixtures
✅ Type Safety: Full TypeScript coverage
✅ Parallel Execution: Optimized test execution
✅ CI/CD Ready: Automated testing in GitHub Actions
✅ Cross-Browser: Chrome, Firefox, WebKit, and mobile

🤝 Contributing
Fork the repository
Create your feature branch (git checkout -b feature/amazing-feature)
Commit your changes (git commit -m 'Add some amazing feature')
Push to the branch (git push origin feature/amazing-feature)
Open a Pull Request

📝 License
This project is licensed under the MIT License - see the LICENSE file for details.

📬 Connect with Me
LinkedIn: Pavel Anhur
Email: pavel.anhur@gmail.com

🌟 Why This Project?
This project demonstrates my expertise in:

Test Automation: Building comprehensive test suites for modern web applications
Framework Design: Creating maintainable, scalable test frameworks
TypeScript: Writing type-safe, production-quality code
CI/CD: Automating testing in continuous integration pipelines
Best Practices: Following industry standards (POM, fixtures, data-driven testing)