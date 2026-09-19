'use strict';

const community = require('../pages/community');

const suites = [
  {
    name: 'smoke',
    tests: [
      {
        name: 'portal home loads',
        async fn({ page, config }) {
          await community.openPortal(page, config);
          await page.locator('body').waitFor({ state: 'visible' });
          const title = await page.title();
          if (!title || title.trim().length === 0) {
            throw new Error('Portal page title was empty');
          }
        },
      },
      {
        name: 'login page is reachable',
        async fn({ page, config }) {
          await community.openPortal(page, config);
          const loginLink = community.loginEntry(page);
          if (await loginLink.first().isVisible().catch(() => false)) {
            await loginLink.first().click();
            await page.waitForLoadState('domcontentloaded');
          }
          await page.locator(config.selectors.username).first().waitFor({
            state: 'visible',
          });
          await page.locator(config.selectors.password).first().waitFor({
            state: 'visible',
          });
        },
      },
    ],
  },
  {
    name: 'critical',
    tests: [
      {
        name: 'community user can log in',
        async fn({ page, config }) {
          await community.loginAsCommunityUser(page, config);
          await community.expectLoggedInHome(page);
        },
      },
      {
        name: 'user can open Cases and create a case',
        async fn({ page, config }) {
          await community.loginAsCommunityUser(page, config);
          await community.expectLoggedInHome(page);
          await community.createCase(page, {
            subject: `Agent test case ${Date.now()}`,
            description:
              'Created by the Salesforce community portal automation agent.',
          });
        },
      },
      {
        name: 'user can search knowledge articles',
        async fn({ page, config }) {
          await community.loginAsCommunityUser(page, config);
          await community.expectLoggedInHome(page);
          await community.navigateNav(page, 'Knowledge');
          await community.searchKnowledge(page, 'password');
        },
      },
      {
        name: 'user can log out',
        async fn({ page, config }) {
          await community.loginAsCommunityUser(page, config);
          await community.expectLoggedInHome(page);
          await community.logout(page);
          await community
            .loginEntry(page)
            .or(page.locator('input[name="username"], #username'))
            .first()
            .waitFor({ state: 'visible' });
        },
      },
    ],
  },
];

module.exports = { suites };
