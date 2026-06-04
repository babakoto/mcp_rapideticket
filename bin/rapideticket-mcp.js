#!/usr/bin/env node

import { createServer } from 'node:http';
import { argv, env, exit, stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline';

const protocolVersion = '2024-11-05';
const serverVersion = '0.1.0';
const defaultApiUrl = 'https://rapideticket.com';

function cleanBaseUrl(value) {
  return String(value || defaultApiUrl).replace(/\/+$/, '');
}

const config = {
  apiUrl: cleanBaseUrl(env.RAPIDETICKET_API_URL),
  apiToken: String(env.RAPIDETICKET_API_TOKEN || '').trim(),
  defaultProjectId: String(env.RAPIDETICKET_DEFAULT_PROJECT_ID || '').trim(),
  httpAddr: String(env.MCP_HTTP_ADDR || ':8090').trim(),
};

function objectSchema(properties = {}, required = []) {
  const schema = { type: 'object', properties };
  if (required.length > 0) schema.required = required;
  return schema;
}

function tools() {
  const projectProp = {
    type: 'string',
    description: 'Project UUID or RapideTicket client key. Defaults to RAPIDETICKET_DEFAULT_PROJECT_ID.',
  };
  return [
    {
      name: 'rapideticket_list_projects',
      description: 'List RapideTicket projects accessible by the configured token.',
      inputSchema: objectSchema(),
    },
    {
      name: 'rapideticket_list_tickets',
      description: 'List tickets for a project.',
      inputSchema: objectSchema({
        projectId: projectProp,
        q: { type: 'string', description: 'Optional search query.' },
        limit: { type: 'number', description: 'Maximum number of tickets.' },
      }),
    },
    {
      name: 'rapideticket_list_sprints',
      description: 'List project sprints, including lifecycle fields such as startedAt and finishedAt.',
      inputSchema: objectSchema({ projectId: projectProp }),
    },
    {
      name: 'rapideticket_list_sprint_tickets',
      description: 'List tickets currently assigned to a sprint.',
      inputSchema: objectSchema(
        {
          projectId: projectProp,
          sprintId: { type: 'string', description: 'Sprint id.' },
          q: { type: 'string', description: 'Optional search query.' },
          limit: { type: 'number', description: 'Maximum number of tickets after filtering.' },
        },
        ['sprintId'],
      ),
    },
    {
      name: 'rapideticket_list_backlog_tickets',
      description: 'List tickets currently in the project backlog, meaning tickets without a sprint.',
      inputSchema: objectSchema({
        projectId: projectProp,
        q: { type: 'string', description: 'Optional search query.' },
        limit: { type: 'number', description: 'Maximum number of tickets after filtering.' },
      }),
    },
    {
      name: 'rapideticket_get_ticket',
      description: 'Get a ticket detail.',
      inputSchema: objectSchema(
        {
          projectId: projectProp,
          issueId: { type: 'string' },
        },
        ['issueId'],
      ),
    },
    {
      name: 'rapideticket_create_ticket',
      description: 'Create a ticket in RapideTicket.',
      inputSchema: objectSchema(
        {
          projectId: projectProp,
          title: { type: 'string', maxLength: 255 },
          description: { type: 'string', maxLength: 50000 },
          priority: { type: 'string' },
          ticketType: { type: 'string' },
          boardColumn: { type: 'string' },
          mvpId: { type: 'string', description: 'Sprint id. Empty means backlog/default behavior.' },
          clientPlatforms: { type: 'string', description: 'CSV: WEB,IOS,ANDROID,BACKEND' },
          figmaUrl: { type: 'string' },
        },
        ['title'],
      ),
    },
    {
      name: 'rapideticket_update_ticket',
      description:
        'Update ticket fields such as title, description, priority, board column, assignee, progress or Figma URL.',
      inputSchema: objectSchema(
        {
          projectId: projectProp,
          issueId: { type: 'string' },
          title: { type: 'string', maxLength: 255 },
          description: { type: 'string', maxLength: 50000 },
          priority: { type: 'string' },
          boardColumn: { type: 'string' },
          assigneeUserId: { type: 'string' },
          progressPercent: { type: 'number' },
          estimatedTimeValue: { type: 'number' },
          estimatedTimeUnit: { type: 'string' },
          actualTimeValue: { type: 'number' },
          actualTimeUnit: { type: 'string' },
          mvpId: { type: 'string' },
          figmaUrl: { type: 'string' },
          clientPlatforms: { type: 'string' },
        },
        ['issueId'],
      ),
    },
    {
      name: 'rapideticket_move_ticket',
      description: 'Move a ticket to a sprint or back to backlog.',
      inputSchema: objectSchema(
        {
          projectId: projectProp,
          issueId: { type: 'string' },
          mvpId: { type: 'string', description: 'Sprint id. Use empty string to move to backlog.' },
        },
        ['issueId'],
      ),
    },
    {
      name: 'rapideticket_add_comment',
      description: 'Add a comment to a ticket.',
      inputSchema: objectSchema(
        {
          projectId: projectProp,
          issueId: { type: 'string' },
          body: { type: 'string', maxLength: 10000 },
        },
        ['issueId', 'body'],
      ),
    },
  ];
}

function rpcResult(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function rpcError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

function toolTextResult(text, isError = false) {
  return { content: [{ type: 'text', text }], isError };
}

function toolJsonResult(value) {
  return toolTextResult(JSON.stringify(value, null, 2));
}

function stringArg(args, key) {
  const value = args?.[key];
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function numberArg(args, key) {
  const value = args?.[key];
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function projectId(args) {
  const id = stringArg(args, 'projectId') || config.defaultProjectId;
  if (!id) throw new Error('projectId is required or RAPIDETICKET_DEFAULT_PROJECT_ID must be set');
  return id;
}

function projectAndIssue(args) {
  const pid = projectId(args);
  const issueId = stringArg(args, 'issueId');
  if (!issueId) throw new Error('issueId is required');
  return { projectId: pid, issueId };
}

function issueSprintId(issue) {
  if (typeof issue?.mvpId === 'string') return issue.mvpId.trim();
  if (typeof issue?.mvp?.id === 'string') return issue.mvp.id.trim();
  return '';
}

function pathFor(projectIdValue, suffix = '') {
  return `/api/v1/projects/${encodeURIComponent(projectIdValue)}${suffix}`;
}

async function apiRaw(method, path, { body, contentType } = {}) {
  if (!config.apiToken) throw new Error('RAPIDETICKET_API_TOKEN is required');
  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${config.apiToken}`,
  };
  if (contentType) headers['Content-Type'] = contentType;
  const response = await fetch(`${config.apiUrl}${path}`, { method, headers, body });
  const text = await response.text();
  let decoded = null;
  if (text) {
    try {
      decoded = JSON.parse(text);
    } catch {
      decoded = null;
    }
  }
  if (!response.ok) {
    const message = decoded?.message || text.trim() || response.statusText;
    throw new Error(`RapideTicket API ${response.status}: ${message}`);
  }
  return decoded ?? { status: response.status };
}

function apiJson(method, path, body) {
  return apiRaw(method, path, {
    body: body === undefined || body === null ? undefined : JSON.stringify(body),
    contentType: body === undefined || body === null ? undefined : 'application/json',
  });
}

async function listTickets(projectIdValue, args = {}) {
  const query = new URLSearchParams();
  const q = stringArg(args, 'q');
  const limit = numberArg(args, 'limit');
  if (q) query.set('q', q);
  if (limit && limit > 0) query.set('limit', String(Math.trunc(limit)));
  const encoded = query.toString();
  return apiJson('GET', `${pathFor(projectIdValue, '/issues')}${encoded ? `?${encoded}` : ''}`);
}

async function listFilteredTickets(projectIdValue, args, keep) {
  const items = await listTickets(projectIdValue, { q: stringArg(args, 'q') });
  if (!Array.isArray(items)) return items;
  const limit = numberArg(args, 'limit');
  const out = [];
  for (const item of items) {
    if (!keep(item)) continue;
    out.push(item);
    if (limit && limit > 0 && out.length >= limit) break;
  }
  return out;
}

async function createTicket(projectIdValue, args) {
  const form = new FormData();
  for (const key of [
    'title',
    'description',
    'priority',
    'ticketType',
    'boardColumn',
    'mvpId',
    'clientPlatforms',
    'figmaUrl',
  ]) {
    const value = stringArg(args, key);
    if (value) form.set(key, value);
  }
  return apiRaw('POST', pathFor(projectIdValue, '/issues'), { body: form });
}

async function callTool(name, args = {}) {
  switch (name) {
    case 'rapideticket_list_projects':
      return apiJson('GET', '/api/v1/projects');
    case 'rapideticket_list_tickets':
      return listTickets(projectId(args), args);
    case 'rapideticket_list_sprints':
      return apiJson('GET', pathFor(projectId(args), '/mvps'));
    case 'rapideticket_list_sprint_tickets': {
      const pid = projectId(args);
      const sprintId = stringArg(args, 'sprintId');
      if (!sprintId) throw new Error('sprintId is required');
      return listFilteredTickets(pid, args, (issue) => issueSprintId(issue) === sprintId);
    }
    case 'rapideticket_list_backlog_tickets':
      return listFilteredTickets(projectId(args), args, (issue) => issueSprintId(issue) === '');
    case 'rapideticket_get_ticket': {
      const ids = projectAndIssue(args);
      return apiJson('GET', pathFor(ids.projectId, `/issues/${encodeURIComponent(ids.issueId)}`));
    }
    case 'rapideticket_create_ticket': {
      const pid = projectId(args);
      if (!stringArg(args, 'title')) throw new Error('title is required');
      return createTicket(pid, args);
    }
    case 'rapideticket_update_ticket': {
      const ids = projectAndIssue(args);
      const body = {};
      for (const key of [
        'title',
        'description',
        'priority',
        'boardColumn',
        'assigneeUserId',
        'progressPercent',
        'estimatedTimeValue',
        'estimatedTimeUnit',
        'actualTimeValue',
        'actualTimeUnit',
        'mvpId',
        'figmaUrl',
        'clientPlatforms',
      ]) {
        if (Object.hasOwn(args, key)) body[key] = args[key];
      }
      if (Object.keys(body).length === 0) throw new Error('provide at least one field to update');
      return apiJson('PATCH', pathFor(ids.projectId, `/issues/${encodeURIComponent(ids.issueId)}`), body);
    }
    case 'rapideticket_move_ticket': {
      const ids = projectAndIssue(args);
      return apiJson('PATCH', pathFor(ids.projectId, `/issues/${encodeURIComponent(ids.issueId)}`), {
        mvpId: stringArg(args, 'mvpId'),
      });
    }
    case 'rapideticket_add_comment': {
      const ids = projectAndIssue(args);
      const body = stringArg(args, 'body');
      if (!body) throw new Error('body is required');
      return apiJson('POST', pathFor(ids.projectId, `/issues/${encodeURIComponent(ids.issueId)}/comments`), {
        body,
      });
    }
    default:
      throw new Error(`unknown tool "${name}"`);
  }
}

async function handle(request) {
  if (!request?.id && request?.method === 'notifications/initialized') return null;
  const id = request?.id;
  try {
    switch (request?.method) {
      case 'initialize':
        return rpcResult(id, {
          protocolVersion,
          capabilities: { tools: {} },
          serverInfo: { name: '@rapideticket/mcp-server', version: serverVersion },
        });
      case 'tools/list':
        return rpcResult(id, { tools: tools() });
      case 'tools/call': {
        const params = request.params || {};
        const result = await callTool(params.name, params.arguments || {});
        return rpcResult(id, toolJsonResult(result));
      }
      default:
        return rpcError(id, -32601, 'Method not found');
    }
  } catch (error) {
    if (request?.method === 'tools/call') {
      return rpcResult(id, toolTextResult(error instanceof Error ? error.message : String(error), true));
    }
    return rpcError(id, -32603, error instanceof Error ? error.message : String(error));
  }
}

async function serveStdio() {
  const rl = createInterface({ input: stdin, crlfDelay: Infinity });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let request;
    try {
      request = JSON.parse(trimmed);
    } catch {
      stdout.write(`${JSON.stringify(rpcError(null, -32700, 'Parse error'))}\n`);
      continue;
    }
    const response = await handle(request);
    if (response) stdout.write(`${JSON.stringify(response)}\n`);
  }
}

function parseHttpAddr(raw) {
  if (raw.startsWith(':')) return { host: '0.0.0.0', port: Number(raw.slice(1)) };
  const [host, port] = raw.split(':');
  return { host: host || '0.0.0.0', port: Number(port || 8090) };
}

function serveHttp() {
  const { host, port } = parseHttpAddr(config.httpAddr);
  const server = createServer(async (request, response) => {
    if (request.url === '/health') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ status: 'ok' }));
      return;
    }
    if (request.url !== '/mcp' || request.method !== 'POST') {
      response.writeHead(405, { 'content-type': 'text/plain' });
      response.end('method not allowed');
      return;
    }
    let raw = '';
    request.setEncoding('utf8');
    for await (const chunk of request) raw += chunk;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify(rpcError(null, -32700, 'Parse error')));
      return;
    }
    const result = await handle(parsed);
    if (!result) {
      response.writeHead(204);
      response.end();
      return;
    }
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify(result));
  });
  server.listen(port, host, () => {
    console.error(`RapideTicket MCP server listening on ${host}:${port}`);
  });
}

if (argv.includes('--help') || argv.includes('-h')) {
  console.log(`Usage: rapideticket-mcp [--stdio]

Environment:
  RAPIDETICKET_API_TOKEN              Required MCP token from RapideTicket
  RAPIDETICKET_DEFAULT_PROJECT_ID     Optional default project UUID or client key
  RAPIDETICKET_API_URL                Optional API URL, defaults to ${defaultApiUrl}
  MCP_HTTP_ADDR                       Optional HTTP addr, defaults to :8090
`);
  exit(0);
}

if (argv.includes('--stdio') || env.MCP_TRANSPORT === 'stdio') {
  await serveStdio();
} else {
  serveHttp();
}
