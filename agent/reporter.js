'use strict';

const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function createRunContext(artifactsDir) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const runDir = path.join(artifactsDir, stamp);
  ensureDir(runDir);
  return { stamp, runDir, results: [] };
}

function recordResult(ctx, result) {
  ctx.results.push(result);
}

function writeReport(ctx) {
  const passed = ctx.results.filter((r) => r.status === 'passed').length;
  const failed = ctx.results.filter((r) => r.status === 'failed').length;
  const skipped = ctx.results.filter((r) => r.status === 'skipped').length;
  const summary = {
    startedAt: ctx.stamp,
    finishedAt: new Date().toISOString(),
    totals: {
      total: ctx.results.length,
      passed,
      failed,
      skipped,
    },
    results: ctx.results,
  };

  const jsonPath = path.join(ctx.runDir, 'report.json');
  const mdPath = path.join(ctx.runDir, 'report.md');
  fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2));
  fs.writeFileSync(mdPath, toMarkdown(summary));
  return { summary, jsonPath, mdPath };
}

function toMarkdown(summary) {
  const lines = [
    '# Salesforce Community Portal Test Report',
    '',
    `- Finished: ${summary.finishedAt}`,
    `- Total: ${summary.totals.total}`,
    `- Passed: ${summary.totals.passed}`,
    `- Failed: ${summary.totals.failed}`,
    `- Skipped: ${summary.totals.skipped}`,
    '',
    '| Suite | Test | Status | Duration (ms) | Error |',
    '| --- | --- | --- | ---: | --- |',
  ];

  for (const r of summary.results) {
    const err = (r.error || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
    lines.push(
      `| ${r.suite} | ${r.name} | ${r.status} | ${r.durationMs} | ${err} |`
    );
  }

  return `${lines.join('\n')}\n`;
}

function printSummary(summary) {
  console.log('\n=== Community Portal Agent Summary ===');
  console.log(
    `Passed: ${summary.totals.passed}  Failed: ${summary.totals.failed}  Skipped: ${summary.totals.skipped}`
  );
  for (const r of summary.results) {
    const mark = r.status === 'passed' ? '✓' : r.status === 'failed' ? '✗' : '○';
    console.log(`${mark} [${r.suite}] ${r.name} (${r.durationMs}ms)`);
    if (r.error) console.log(`  → ${r.error.split('\n')[0]}`);
  }
}

module.exports = {
  createRunContext,
  recordResult,
  writeReport,
  printSummary,
};
