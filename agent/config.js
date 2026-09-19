'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env') });

function env(name, fallback) {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

function toBool(value, fallback = false) {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

const config = {
  portalUrl: env('PORTAL_URL', 'http://localhost:3000'),
  username: env('PORTAL_USERNAME', 'community.user@example.com'),
  password: env('PORTAL_PASSWORD', 'ChangeMe123!'),
  headless: toBool(env('HEADLESS', 'true'), true),
  slowMo: Number(env('SLOW_MO', '0')),
  timeoutMs: Number(env('TIMEOUT_MS', '30000')),
  screenshotOnFailure: toBool(env('SCREENSHOT_ON_FAILURE', 'true'), true),
  artifactsDir: path.resolve(process.cwd(), env('ARTIFACTS_DIR', 'artifacts/test-runs')),
  selectors: {
    username: env(
      'LOGIN_USERNAME_SELECTOR',
      'input[name="username"], #username, input[type="email"], input[autocomplete="username"]'
    ),
    password: env(
      'LOGIN_PASSWORD_SELECTOR',
      'input[name="pw"], #password, input[type="password"], input[autocomplete="current-password"]'
    ),
    submit: env(
      'LOGIN_SUBMIT_SELECTOR',
      'button[type="submit"], #Login, input[type="submit"]'
    ),
  },
};

module.exports = { config };
