'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { config } = require('./config');
const {
  createRunContext,
  recordResult,
  writeReport,
  printSummary,
} = require('./reporter');
const { suites } = require('./suites');

async function runAgent(options = {}) {
  const suiteName = options.suite || 'all';
  const headed = options.headed === true ? true : !config.headless;
  const selected = selectSuites(suiteName);

  if (!selected.length) {
    throw new Error(`Unknown suite "${suiteName}". Use: smoke, critical, all`);
  }

  const ctx = createRunContext(config.artifactsDir);
  const browser = await chromium.launch({
    headless: !headed,
    slowMo: config.slowMo,
  });

  try {
    for (const suite of selected) {
      for (const test of suite.tests) {
        await executeTest(browser, ctx, suite.name, test);
      }
    }
  } finally {
    await browser.close();
  }

  const { summary, jsonPath, mdPath } = writeReport(ctx);
  printSummary(summary);
  console.log(`\nReport: ${mdPath}`);
  console.log(`JSON:   ${jsonPath}`);

  return {
    summary,
    exitCode: summary.totals.failed > 0 ? 1 : 0,
  };
}

function selectSuites(suiteName) {
  if (suiteName === 'all') return suites;
  return suites.filter((s) => s.name === suiteName);
}

async function executeTest(browser, ctx, suiteName, test) {
  const started = Date.now();
  const context = await browser.newContext({
    baseURL: config.portalUrl,
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(config.timeoutMs);

  const result = {
    suite: suiteName,
    name: test.name,
    status: 'passed',
    durationMs: 0,
    error: null,
    screenshot: null,
  };

  try {
    await test.fn({ page, config, context });
  } catch (err) {
    result.status = 'failed';
    result.error = err && err.stack ? err.stack : String(err);
    if (config.screenshotOnFailure) {
      const file = path.join(
        ctx.runDir,
        `${suiteName}__${slug(test.name)}.png`
      );
      await page.screenshot({ path: file, fullPage: true }).catch(() => {});
      if (fs.existsSync(file)) result.screenshot = file;
    }
  } finally {
    result.durationMs = Date.now() - started;
    recordResult(ctx, result);
    await context.close();
  }
}

function slug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

module.exports = { runAgent };
