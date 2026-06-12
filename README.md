# RapideTicket MCP Server

MCP server for Claude, Cursor, Codex, and other MCP-compatible clients.

The package is distributed as an npm CLI:

```sh
npx -y mcp-rapideticket --stdio
```

The RapideTicket API URL is built in and defaults to:

```txt
https://rapideticket.com
```

You only need to provide a RapideTicket MCP token.

## Cursor / Claude / Codex stdio configuration

```json
{
  "mcpServers": {
    "rapideticket": {
      "command": "npx",
      "args": ["-y", "mcp-rapideticket", "--stdio"],
      "env": {
        "RAPIDETICKET_API_TOKEN": "<YOUR_MCP_TOKEN>",
        "RAPIDETICKET_DEFAULT_PROJECT_ID": "<optional project uuid or client key>"
      }
    }
  }
}
```

Create the MCP token from the dashboard in `Project settings > MCP`.
The token is shown only once, stored hashed in the API database, and forwarded
to the existing RapideTicket API as a Bearer token.

## Local development

```sh
node ./bin/rapideticket-mcp.js --stdio
```

HTTP JSON-RPC mode is also available for local experiments:

```sh
node ./bin/rapideticket-mcp.js
curl http://localhost:8090/health
```

## Tools

- `rapideticket_list_projects`
- `rapideticket_list_tickets`
- `rapideticket_list_prompts`
- `rapideticket_get_prompt`
- `rapideticket_create_prompt_branch`
- `rapideticket_list_agents`
- `rapideticket_list_active_skills`
- `rapideticket_list_sprints`
- `rapideticket_list_sprint_tickets`
- `rapideticket_list_backlog_tickets`
- `rapideticket_list_specifications`
- `rapideticket_search_specifications`
- `rapideticket_get_specification`
- `rapideticket_get_ticket`
- `rapideticket_create_ticket_branch`
- `rapideticket_create_ticket`
- `rapideticket_update_ticket`
- `rapideticket_move_ticket`
- `rapideticket_add_comment`

### Specifications

Use the specification tools to let an MCP client inspect the collaborative
documentation attached to a project:

```json
{
  "name": "rapideticket_search_specifications",
  "arguments": {
    "projectId": "DEMO",
    "q": "checkout flow",
    "limit": 5
  }
}
```

`rapideticket_list_specifications` returns the page tree metadata and a compact
plain-text extraction by default. Pass `includeBody: true` when the client needs
the raw editor JSON. `rapideticket_get_specification` returns one full page.

### Agents and skills

`rapideticket_list_agents` returns the AI agents configured for the project and
their attached, currently enabled skills. `rapideticket_list_active_skills` returns
only project skills currently enabled, including their Markdown instructions so
an MCP client can use them as operational context.

### Git branches and live connection

The branch tools create the planned branch on the default GitHub or GitLab
destination configured for the project. Prompt branches use the stable
`prompt/<prompt-key>` format. Repeated calls are idempotent and return the
branch already attached to the ticket or prompt.

Once the MCP handshake succeeds, the server sends a heartbeat every 15 seconds.
The project MCP settings page displays the corresponding token as connected in
near real time and marks it offline when heartbeats stop.

## Publish

```sh
npm login
npm publish --access public
```
