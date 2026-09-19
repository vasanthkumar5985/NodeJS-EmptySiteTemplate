#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { Command } = require('commander');
const { runAgent } = require('./runner');
const { config } = require('./config');

const program = new Command();

program
  .name('sf-community-agent')
  .description(
    'Automation testing agent for Salesforce Experience Cloud / Community portals'
  )
  .version('1.0.0');

program
  .command('run')
  .description('Run community portal automation suites')
  .option('-s, --suite <name>', 'smoke | critical | all', 'all')
  .option('--headed', 'Run browser headed (not headless)', false)
  .action(async (opts) => {
    try {
      console.log(`Portal: ${config.portalUrl}`);
      console.log(`Suite:  ${opts.suite}`);
      const { exitCode } = await runAgent({
        suite: opts.suite,
        headed: opts.headed,
      });
      process.exit(exitCode);
    } catch (err) {
      console.error(err.message || err);
      process.exit(1);
    }
  });

program
  .command('report')
  .description('Print the latest test report path')
  .action(() => {
    const root = config.artifactsDir;
    if (!fs.existsSync(root)) {
      console.log('No reports yet. Run: npm test');
      process.exit(0);
    }
    const runs = fs
      .readdirSync(root)
      .map((name) => ({ name, full: path.join(root, name) }))
      .filter((e) => fs.statSync(e.full).isDirectory())
      .sort((a, b) => b.name.localeCompare(a.name));

    if (!runs.length) {
      console.log('No reports yet. Run: npm test');
      process.exit(0);
    }

    const latest = path.join(runs[0].full, 'report.md');
    console.log(latest);
    if (fs.existsSync(latest)) {
      console.log('\n' + fs.readFileSync(latest, 'utf8'));
    }
  });

program
  .command('plan')
  .description('Show planned community portal test coverage')
  .action(() => {
    console.log(`Target portal: ${config.portalUrl}`);
    console.log(`Community user: ${config.username}`);
    console.log('');
    console.log('Suites:');
    console.log('  smoke');
    console.log('    - portal home loads');
    console.log('    - login page is reachable');
    console.log('  critical');
    console.log('    - community user can log in');
    console.log('    - user can open Cases and create a case');
    console.log('    - user can search knowledge articles');
    console.log('    - user can log out');
    console.log('');
    console.log('Point PORTAL_URL at your Experience Cloud site to test a real org.');
    console.log('For local demo: npm run mock:portal  then  npm test');
  });

program.parseAsync(process.argv);
