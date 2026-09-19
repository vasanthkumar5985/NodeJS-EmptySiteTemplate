'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.MOCK_PORTAL_PORT || 3000);
const VALID_USER = process.env.PORTAL_USERNAME || 'community.user@example.com';
const VALID_PASS = process.env.PORTAL_PASSWORD || 'ChangeMe123!';

const sessions = new Set();
const cases = [];

const knowledge = [
  {
    id: 1,
    title: 'Reset your community password',
    body: 'Use Forgot Password on the login page, then check your email.',
  },
  {
    id: 2,
    title: 'How to open a support case',
    body: 'Go to Cases → New Case, enter a subject and description, then submit.',
  },
  {
    id: 3,
    title: 'Update account profile',
    body: 'Open My Account to review contact details and preferences.',
  },
];

function send(res, status, body, headers = {}) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type':
      typeof body === 'string' ? 'text/html; charset=utf-8' : 'application/json',
    ...headers,
  });
  res.end(payload);
}

function parseCookies(req) {
  const raw = req.headers.cookie || '';
  return Object.fromEntries(
    raw
      .split(';')
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const i = p.indexOf('=');
        return [p.slice(0, i), decodeURIComponent(p.slice(i + 1))];
      })
  );
}

function isAuthed(req) {
  const cookies = parseCookies(req);
  return Boolean(cookies.sid && sessions.has(cookies.sid));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) reject(new Error('Body too large'));
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function layout({ title, authed, content }) {
  const nav = authed
    ? `
      <a href="/">Home</a>
      <a href="/cases" data-testid="nav-cases">Cases</a>
      <a href="/knowledge" data-testid="nav-knowledge">Knowledge</a>
      <a href="/account" data-testid="nav-my-account">My Account</a>
      <a href="/logout" data-testid="nav-logout">Log Out</a>`
    : `
      <a href="/">Home</a>
      <a href="/login" data-testid="nav-login">Log In</a>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <link rel="stylesheet" href="/styles.css" />
</head>
<body>
  <header class="top">
    <div class="brand">Acme Customer Community</div>
    <nav>${nav}</nav>
  </header>
  <main>
    ${content}
  </main>
</body>
</html>`;
}

async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const authed = isAuthed(req);

  if (url.pathname === '/styles.css') {
    return send(res, 200, fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8'), {
      'Content-Type': 'text/css; charset=utf-8',
    });
  }

  if (url.pathname === '/' && req.method === 'GET') {
    if (!authed) {
      return send(
        res,
        200,
        layout({
          title: 'Acme Customer Community',
          authed,
          content: `
            <section class="hero" data-testid="public-home">
              <h1>Welcome to the Acme Customer Community</h1>
              <p>Get support, open cases, and browse knowledge articles.</p>
              <p><a class="btn" href="/login" data-testid="nav-login">Log In</a></p>
            </section>`,
        })
      );
    }

    return send(
      res,
      200,
      layout({
        title: 'Home | Acme Customer Community',
        authed,
        content: `
          <section data-testid="portal-home">
            <h1>Welcome back</h1>
            <p>Use Cases for support requests or Knowledge for self-service help.</p>
            <ul class="cards">
              <li><a href="/cases">Open or track cases</a></li>
              <li><a href="/knowledge">Search knowledge</a></li>
              <li><a href="/account">My Account</a></li>
            </ul>
          </section>`,
      })
    );
  }

  if (url.pathname === '/login' && req.method === 'GET') {
    return send(
      res,
      200,
      layout({
        title: 'Log In | Acme Customer Community',
        authed: false,
        content: `
          <section class="auth">
            <h1>Log In</h1>
            <form method="POST" action="/login" data-testid="login-form">
              <label>Username
                <input id="username" name="username" type="email" autocomplete="username" required />
              </label>
              <label>Password
                <input id="password" name="pw" type="password" autocomplete="current-password" required />
              </label>
              <button type="submit" id="Login">Log In</button>
            </form>
            ${
              url.searchParams.get('error')
                ? '<p class="loginError" data-testid="login-error" id="error">Please check your username and password.</p>'
                : ''
            }
          </section>`,
      })
    );
  }

  if (url.pathname === '/login' && req.method === 'POST') {
    const raw = await readBody(req);
    const params = new URLSearchParams(raw);
    const username = params.get('username') || '';
    const password = params.get('pw') || '';
    if (username === VALID_USER && password === VALID_PASS) {
      const sid = `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      sessions.add(sid);
      res.writeHead(302, {
        Location: '/',
        'Set-Cookie': `sid=${encodeURIComponent(sid)}; Path=/; HttpOnly`,
      });
      return res.end();
    }
    res.writeHead(302, { Location: '/login?error=1' });
    return res.end();
  }

  if (url.pathname === '/logout') {
    const cookies = parseCookies(req);
    if (cookies.sid) sessions.delete(cookies.sid);
    res.writeHead(302, {
      Location: '/',
      'Set-Cookie': 'sid=; Path=/; Max-Age=0',
    });
    return res.end();
  }

  if (!authed && ['/cases', '/knowledge', '/account'].includes(url.pathname)) {
    res.writeHead(302, { Location: '/login' });
    return res.end();
  }

  if (url.pathname === '/cases' && req.method === 'GET') {
    const created = url.searchParams.get('created');
    const list = cases
      .map(
        (c) =>
          `<li data-testid="case-item"><strong>${escapeHtml(c.subject)}</strong><div>${escapeHtml(c.description)}</div></li>`
      )
      .join('') || '<li>No cases yet.</li>';

    return send(
      res,
      200,
      layout({
        title: 'Cases | Acme Customer Community',
        authed,
        content: `
          <section>
            <h1>Cases</h1>
            ${
              created
                ? '<p data-testid="case-success">Case created successfully.</p>'
                : ''
            }
            <p><a class="btn" href="/cases/new" data-testid="new-case">New Case</a></p>
            <ul>${list}</ul>
          </section>`,
      })
    );
  }

  if (url.pathname === '/cases/new' && req.method === 'GET') {
    return send(
      res,
      200,
      layout({
        title: 'New Case | Acme Customer Community',
        authed,
        content: `
          <section>
            <h1>New Case</h1>
            <form method="POST" action="/cases" data-testid="case-form">
              <label>Subject
                <input id="subject" name="subject" data-testid="case-subject" required />
              </label>
              <label>Description
                <textarea id="description" name="description" data-testid="case-description" required></textarea>
              </label>
              <button type="submit" data-testid="case-submit">Submit</button>
            </form>
          </section>`,
      })
    );
  }

  if (url.pathname === '/cases' && req.method === 'POST') {
    const raw = await readBody(req);
    const params = new URLSearchParams(raw);
    cases.unshift({
      id: cases.length + 1,
      subject: params.get('subject') || 'Untitled',
      description: params.get('description') || '',
      createdAt: new Date().toISOString(),
    });
    res.writeHead(302, { Location: '/cases?created=1' });
    return res.end();
  }

  if (url.pathname === '/knowledge' && req.method === 'GET') {
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();
    const results = q
      ? knowledge.filter(
          (k) =>
            k.title.toLowerCase().includes(q) ||
            k.body.toLowerCase().includes(q)
        )
      : knowledge;
    const items = results
      .map(
        (k) =>
          `<article data-testid="knowledge-item"><h2>${escapeHtml(k.title)}</h2><p>${escapeHtml(k.body)}</p></article>`
      )
      .join('') || '<p>No results.</p>';

    return send(
      res,
      200,
      layout({
        title: 'Knowledge | Acme Customer Community',
        authed,
        content: `
          <section>
            <h1>Knowledge</h1>
            <form method="GET" action="/knowledge">
              <input type="search" name="q" placeholder="Search articles" value="${escapeHtml(url.searchParams.get('q') || '')}" data-testid="knowledge-search" />
            </form>
            <div data-testid="knowledge-results">${items}</div>
          </section>`,
      })
    );
  }

  if (url.pathname === '/account' && req.method === 'GET') {
    return send(
      res,
      200,
      layout({
        title: 'My Account | Acme Customer Community',
        authed,
        content: `
          <section>
            <h1>My Account</h1>
            <p>Signed in as ${escapeHtml(VALID_USER)}</p>
          </section>`,
      })
    );
  }

  send(res, 404, layout({ title: 'Not Found', authed, content: '<h1>Not found</h1>' }));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

http.createServer((req, res) => {
  handler(req, res).catch((err) => {
    console.error(err);
    send(res, 500, 'Internal Server Error');
  });
}).listen(PORT, () => {
  console.log(`Mock Salesforce community portal listening on http://localhost:${PORT}`);
  console.log(`Login with ${VALID_USER} / ${VALID_PASS}`);
});
