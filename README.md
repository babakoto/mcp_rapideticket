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

## Optional environment variables

```sh
RAPIDETICKET_API_TOKEN=<project MCP token>
RAPIDETICKET_DEFAULT_PROJECT_ID=<optional project uuid or client key>
RAPIDETICKET_API_URL=https://rapideticket.com
MCP_HTTP_ADDR=:8090
```

`RAPIDETICKET_API_URL` is optional. Use it only for local development or staging.

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
- `rapideticket_get_ticket`
- `rapideticket_create_ticket`
- `rapideticket_update_ticket`
- `rapideticket_move_ticket`
- `rapideticket_add_comment`

## Publish

```sh
npm login
npm publish --access public
```
