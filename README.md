# RapideTicket MCP Server

MCP server for Claude, Cursor, Codex, and other MCP-compatible clients.

The package is distributed as an npm CLI:

```sh
npx -y @rapideticket/mcp-server --stdio
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
      "args": ["-y", "@rapideticket/mcp-server", "--stdio"],
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
- `rapideticket_list_sprints`
- `rapideticket_list_sprint_tickets`
- `rapideticket_list_backlog_tickets`
- `rapideticket_list_specifications`
- `rapideticket_search_specifications`
- `rapideticket_get_specification`
- `rapideticket_get_ticket`
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

## Publish

```sh
npm login
npm publish --access public
```
