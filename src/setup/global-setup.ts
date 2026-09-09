import setupAllure from "./allure-setup";

export default function globalSetup(): void {
  setupAllure();
  console.log('✅ Allure setup completed');
}