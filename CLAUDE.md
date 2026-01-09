# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
npm run build    # Compile TypeScript to dist/ and make executable
npm run dev      # Watch mode for TypeScript compilation
npm run start    # Run the MCP server (HTTP mode on port 3000)
```

**CLI Options:**
```bash
npx counsel-mcp start --port 8080 --host 0.0.0.0
```

## Architecture

This is an MCP (Model Context Protocol) server that acts as an open-source gateway to the Counsel API. It uses HTTP transport with native MCP OAuth support, allowing MCP clients (Claude Desktop, Cursor, VSCode, etc.) to handle authentication automatically.

### How It Works

1. **MCP Client** adds this server to their configuration
2. **OAuth Flow** is handled natively by the MCP client via standard endpoints
3. **Authentication** proxies to Counsel API (`counsel.getmason.dev`)
4. **Tools** execute against Counsel API using the authenticated user's token

### Core Components

- **src/index.ts** - Express HTTP server with MCP SDK integration:
  - `ProxyOAuthServerProvider` - Proxies OAuth to Counsel API
  - `mcpAuthRouter` - Exposes `/authorize`, `/token`, `/register`, `/.well-known/*`
  - `requireBearerAuth` - Protects `/mcp` endpoint
  - `StreamableHTTPServerTransport` - MCP protocol over HTTP/SSE

- **src/client.ts** - Axios client with AsyncLocalStorage for request-scoped auth tokens

- **src/config.ts** - Zod-validated configuration (primarily `COUNSEL_API_URL`)

### OAuth Endpoints

The server exposes standard OAuth 2.0 endpoints that proxy to Counsel API:
- `GET /.well-known/oauth-authorization-server` - OAuth metadata
- `GET /authorize` - Authorization endpoint (redirects to Counsel)
- `POST /token` - Token exchange (proxies to Counsel)
- `POST /register` - Dynamic client registration (proxies to Counsel)

### Tool System

Tools in `src/tools/` export a `TOOLS` object with:
- `name`, `description`, `schema` (Zod), `handler`

**Current tools:**
- `debates.ts` - `start_consultation`, `get_consultation_status`, `get_consultation_report`, `list_consultations`, `sharpen_question`
- `advisor.ts` - `consult_advisor`

### Adding New Tools

1. Create/edit file in `src/tools/`
2. Export `TOOLS` object following existing pattern
3. Import and register in `src/index.ts`

## Client Configuration Example

For MCP clients that support HTTP transport with OAuth:

```json
{
  "mcpServers": {
    "counsel": {
      "url": "http://localhost:3000/mcp",
      "transport": "http"
    }
  }
}
```

## Key Patterns

- ES modules with `.js` extension in imports
- AsyncLocalStorage passes auth token from HTTP request to tool handlers
- OAuth is fully proxied to Counsel API - no local token storage
