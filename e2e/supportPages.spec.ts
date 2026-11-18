import { test, expect } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

test.describe('Support & Documentation Subpages E2E', () => {
  const getFileUrl = (filename: string) =>
    pathToFileURL(path.resolve(process.cwd(), 'website', filename)).href;

  test('renders Documentation page with reference manual structure', async ({ page }) => {
    await page.goto(getFileUrl('docs.html'));
    await expect(page).toHaveTitle(/Documentation — NODE studio/i);

    // Header and navigation
    await expect(page.getByText('NODE', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('studio', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /Help & Documentation/i })).toBeVisible();
  });

  test('renders Contact Support page with GitHub Issue Tracker channel', async ({ page }) => {
    await page.goto(getFileUrl('support.html'));
    await expect(page).toHaveTitle(/Support & Troubleshooting — NODE studio/i);

    // Verify support channels
    await expect(page.getByRole('heading', { name: /GitHub Issue Tracker/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Community Feedback/i })).toBeVisible();
  });

  test('renders Feedback page with community issue templates', async ({ page }) => {
    await page.goto(getFileUrl('feedback.html'));
    await expect(page).toHaveTitle(/Feedback & Ideas — NODE studio/i);

    await expect(page.getByRole('button', { name: /Submit on GitHub/i })).toBeVisible();
    await expect(page.locator('select#feedback-type')).toBeVisible();
    await expect(page.locator('textarea#feedback-details')).toBeVisible();
  });

  test('renders Release Notes page with version history', async ({ page }) => {
    await page.goto(getFileUrl('releases.html'));
    await expect(page).toHaveTitle(/Release Notes & Changelog — NODE studio/i);

    await expect(page.getByRole('heading', { name: /Release Notes/i })).toBeVisible();
    await expect(page.getByText('v1.1.11').first()).toBeVisible();
  });

  test('renders Visual Tutorial page with software screenshots and architecture sections', async ({ page }) => {
    await page.goto(getFileUrl('tutorial.html'));
    await expect(page).toHaveTitle(/Visual Tutorial & Architecture Tour — NODE studio/i);

    // Verify main headings and architecture guide
    await expect(page.getByRole('heading', { name: /Studio Walkthrough & Feature Guide/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /How the Hardware & Software Work Together/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /What Did the Software Have Originally vs. Everything We Built/i })).toBeVisible();

    // Verify embedded screenshots
    const figures = page.locator('figure.tutorial-figure img');
    await expect(figures).toHaveCount(5);
    for (let i = 0; i < 5; i++) {
      await expect(figures.nth(i)).toBeVisible();
    }

    // Verify 7-step guide
    await expect(page.getByRole('heading', { name: /7-Step Macropad Configuration Walkthrough/i })).toBeVisible();
  });
});
