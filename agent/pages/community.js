'use strict';

/**
 * Page helpers for Salesforce Experience Cloud / Community portals.
 * Selectors prefer stable attributes used by Salesforce login + common
 * Experience Builder components, with fallbacks for custom branded portals.
 */

async function openPortal(page, config) {
  await page.goto(config.portalUrl, { waitUntil: 'domcontentloaded' });
}

function loginEntry(page) {
  return page
    .getByRole('link', { name: /log\s*in|sign\s*in/i })
    .or(page.locator('[data-testid="nav-login"]'));
}

async function loginAsCommunityUser(page, config) {
  await openPortal(page, config);

  // Experience Cloud often lands on a site home with a Login link.
  const loginLink = loginEntry(page);
  if (await loginLink.first().isVisible().catch(() => false)) {
    await loginLink.first().click();
    await page.waitForLoadState('domcontentloaded');
  }

  await page.locator(config.selectors.username).first().fill(config.username);
  await page.locator(config.selectors.password).first().fill(config.password);
  const submit = page
    .locator(config.selectors.submit)
    .or(page.getByRole('button', { name: /log\s*in|sign\s*in/i }));
  await submit.first().click();
  await page.waitForLoadState('domcontentloaded');

  // Fail fast on common Salesforce login errors.
  const error = page
    .locator('#error')
    .or(page.locator('.loginError'))
    .or(page.locator('.slds-notify_alert'))
    .or(page.locator('[data-testid="login-error"]'));
  if (await error.first().isVisible().catch(() => false)) {
    const text = (await error.first().innerText()).trim();
    throw new Error(`Community login failed: ${text}`);
  }
}

async function expectLoggedInHome(page) {
  const homeSignals = page
    .locator('[data-testid="portal-home"]')
    .or(page.locator('.forceCommunityThemeNav'))
    .or(page.getByRole('heading', { name: /welcome/i }))
    .or(page.getByRole('link', { name: /my account/i }))
    .or(page.getByRole('link', { name: /log\s*out/i }))
    .or(page.getByRole('button', { name: /log\s*out/i }));
  await homeSignals.first().waitFor({ state: 'visible' });
}

async function navigateNav(page, label) {
  const link = page
    .locator(`nav a`, { hasText: label })
    .or(page.getByRole('link', { name: label }))
    .or(page.locator(`[data-testid="nav-${slug(label)}"]`));
  await link.first().click();
  await page.waitForLoadState('domcontentloaded');
}

async function createCase(page, { subject, description }) {
  await navigateNav(page, 'Cases');
  const newCase = page
    .getByRole('link', { name: /new case/i })
    .or(page.getByRole('button', { name: /new case/i }))
    .or(page.locator('[data-testid="new-case"]'));
  await newCase.first().click();

  await page
    .locator('input[name="subject"], #subject, [data-testid="case-subject"]')
    .first()
    .fill(subject);
  await page
    .locator(
      'textarea[name="description"], #description, [data-testid="case-description"]'
    )
    .first()
    .fill(description);
  await page
    .getByRole('button', { name: /submit/i })
    .or(page.locator('button[type="submit"]'))
    .or(page.locator('[data-testid="case-submit"]'))
    .first()
    .click();

  await page
    .locator('[data-testid="case-success"]')
    .or(page.getByText(/case created|successfully/i))
    .first()
    .waitFor({ state: 'visible' });
}

async function searchKnowledge(page, query) {
  const search = page
    .locator('input[type="search"]')
    .or(page.getByPlaceholder(/search/i))
    .or(page.locator('[data-testid="knowledge-search"]'));
  await search.first().fill(query);
  await search.first().press('Enter');
  await page.waitForLoadState('domcontentloaded');
  await page
    .locator('[data-testid="knowledge-results"] article')
    .or(page.locator('[data-testid="knowledge-item"]'))
    .or(page.locator('.forceCommunitySearch'))
    .or(page.getByText(/result/i))
    .first()
    .waitFor({ state: 'visible' });
}

async function logout(page) {
  const logout = page
    .getByRole('link', { name: /log\s*out/i })
    .or(page.getByRole('button', { name: /log\s*out/i }))
    .or(page.locator('[data-testid="nav-logout"]'));
  await logout.first().click();
  await page.waitForLoadState('domcontentloaded');
}

function slug(label) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

module.exports = {
  openPortal,
  loginAsCommunityUser,
  expectLoggedInHome,
  navigateNav,
  createCase,
  searchKnowledge,
  logout,
  loginEntry,
};
