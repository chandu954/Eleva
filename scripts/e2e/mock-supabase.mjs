import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const port = 54329;
const user = {
  id: 'd8f17a9b-caa8-4ee6-b70f-c574783a3c13',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'offline-test@example.com',
  email_confirmed_at: '2025-01-01T00:00:00.000Z',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { first_name: 'Offline' },
  created_at: '2025-01-01T00:00:00.000Z',
};
const rows = new Map([
  ['profiles', [{
    id: user.id,
    user_id: user.id,
    first_name: 'Offline',
    last_name: 'Tester',
    email: user.email,
    phone_number: null,
    location: null,
    website: null,
    linkedin_url: null,
    github_url: null,
    work_experience: [],
    education: [],
    skills: [],
    projects: [],
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  }]],
]);

const session = {
  access_token: [
    'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0',
    Buffer.from(JSON.stringify({ sub: user.id, aud: 'authenticated', role: 'authenticated', exp: 4_102_444_800 })).toString('base64url'),
    'offline-e2e-signature',
  ].join('.'),
  token_type: 'bearer',
  expires_in: 3_600,
  expires_at: Math.floor(Date.now() / 1_000) + 3_600,
  refresh_token: 'offline-e2e-refresh-token',
  user,
};

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return null;
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function sendJson(response, status, body, headers = {}) {
  response.writeHead(status, {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info, x-supabase-api-version, prefer',
    'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'access-control-expose-headers': 'content-range, content-type',
    'content-type': 'application/json; charset=utf-8',
    ...headers,
  });
  response.end(body === undefined ? '' : JSON.stringify(body));
}

function matchingRows(table, query) {
  return (rows.get(table) ?? []).filter((row) => {
    for (const [key, value] of query.entries()) {
      if (!value.startsWith('eq.')) continue;
      const expected = decodeURIComponent(value.slice(3));
      if (String(row[key] ?? '') !== expected) return false;
    }
    return true;
  });
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);
  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info, x-supabase-api-version, prefer',
      'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    });
    response.end();
    return;
  }

  if (url.pathname === '/health') {
    sendJson(response, 200, { status: 'ok' });
    return;
  }

  if (url.pathname === '/auth/v1/token' && request.method === 'POST') {
    await readJson(request);
    sendJson(response, 200, session);
    return;
  }
  if (url.pathname === '/auth/v1/user' && request.method === 'GET') {
    if (request.headers.authorization === `Bearer ${session.access_token}`) {
      sendJson(response, 200, user);
    } else {
      sendJson(response, 401, { code: 'bad_jwt', message: 'Invalid JWT' });
    }
    return;
  }
  if (url.pathname === '/auth/v1/logout' && request.method === 'POST') {
    sendJson(response, 204);
    return;
  }

  if (url.pathname.startsWith('/rest/v1/')) {
    const table = decodeURIComponent(url.pathname.slice('/rest/v1/'.length));
    const tableRows = rows.get(table) ?? [];
    const selected = matchingRows(table, url.searchParams);

    if (request.method === 'GET' || request.method === 'HEAD') {
      const count = selected.length;
      const contentRange = count ? `0-${count - 1}/${count}` : '*/0';
      if (request.method === 'HEAD') {
        response.writeHead(200, { 'content-range': contentRange });
        response.end();
        return;
      }

      if (request.headers.accept?.includes('vnd.pgrst.object+json')) {
        if (selected.length !== 1) {
          sendJson(response, 406, {
            code: 'PGRST116',
            details: `The result contains ${selected.length} rows`,
            hint: null,
            message: 'JSON object requested, multiple (or no) rows returned',
          });
          return;
        }
        sendJson(response, 200, selected[0], { 'content-range': contentRange });
        return;
      }
      sendJson(response, 200, selected, { 'content-range': contentRange });
      return;
    }

    if (request.method === 'POST') {
      const payload = await readJson(request);
      const inserts = Array.isArray(payload) ? payload : [payload ?? {}];
      const created = inserts.map((item) => ({
        id: item.id ?? randomUUID(),
        created_at: item.created_at ?? new Date().toISOString(),
        updated_at: item.updated_at ?? new Date().toISOString(),
        ...item,
      }));
      rows.set(table, [...tableRows, ...created]);
      if (request.headers.prefer?.includes('return=minimal')) {
        response.writeHead(201);
        response.end();
      } else {
        const singular = request.headers.accept?.includes('vnd.pgrst.object+json');
        sendJson(response, 201, singular ? created[0] : Array.isArray(payload) ? created : created[0]);
      }
      return;
    }

    if (request.method === 'PATCH') {
      const patch = (await readJson(request)) ?? {};
      const selectedIds = new Set(selected.map((row) => row.id));
      const updated = tableRows.map((row) => selectedIds.has(row.id) ? { ...row, ...patch } : row);
      rows.set(table, updated);
      sendJson(response, 200, updated.filter((row) => selectedIds.has(row.id)));
      return;
    }

    if (request.method === 'DELETE') {
      const selectedIds = new Set(selected.map((row) => row.id));
      rows.set(table, tableRows.filter((row) => !selectedIds.has(row.id)));
      response.writeHead(204);
      response.end();
      return;
    }
  }

  sendJson(response, 404, { message: `Mock Supabase route not implemented: ${request.method} ${url.pathname}` });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Offline E2E Supabase mock listening on http://127.0.0.1:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
