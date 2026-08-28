import { expect, test } from '@fixtures';


test.describe('Hero Section', () => {
  test('hero content is displayed correctly', async ({ homePage }) => {
    await homePage.open();
    await expect(homePage.eyebrow).toHaveText('The Maison Collection');
    await expect(homePage.heroHeader).toContainText('Quiet luxury');
    await expect(homePage.heroParagraph).toHaveText(/curated atelier/);
  });
});
