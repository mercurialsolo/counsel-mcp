# Counsel MCP Server

An open-source [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that connects AI agents to the [Counsel](https://counsel.getmason.dev) API for strategic reasoning and advisor sessions.

## Features

- **Strategic Reasoning** - Access Counsel's debate and multi-perspective reasoning engines
- **Advisor Sessions** - Run interactive intake and profile tuning sessions
- **Native OAuth** - Standard MCP OAuth 2.0 authentication handled automatically by clients
- **HTTP Transport** - Works with any MCP client supporting HTTP/SSE transport

## Quick Start

### Option 1: Run with npx

```bash
npx counsel-mcp-server start
```

The server runs at `http://localhost:3000` by default.

### Option 2: Install globally

```bash
npm install -g counsel-mcp-server
counsel-mcp start
```

### CLI Options

```bash
counsel-mcp start --port 8080 --host 0.0.0.0
```

## Client Configuration

### Claude Desktop / Claude Code

Add to your MCP configuration:

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

### Cursor / VSCode / Other MCP Clients

Configure the HTTP endpoint `http://localhost:3000/mcp` in your client's MCP settings. The client will automatically discover OAuth endpoints via `/.well-known/oauth-authorization-server`.

## Authentication

Authentication is handled automatically by MCP clients through standard OAuth 2.0:

1. Client discovers OAuth metadata at `/.well-known/oauth-authorization-server`
2. Client initiates OAuth flow via `/authorize`
3. User authenticates with their Counsel account
4. Client receives tokens and includes them in MCP requests

No manual login step required - your MCP client handles everything.

## Available Tools

| Tool | Description |
|------|-------------|
| `start_consultation` | Start a new strategic consultation/debate |
| `get_consultation_status` | Check the status of a running consultation |
| `get_consultation_report` | Retrieve the final report from a consultation |
| `list_consultations` | List all consultations |
| `sharpen_question` | Refine and improve a question before consultation |
| `consult_advisor` | Start an interactive advisor session |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `COUNSEL_API_URL` | `https://counsel.getmason.dev` | Counsel API base URL |

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
git clone https://github.com/getmason-io/counsel-mcp-server.git
cd counsel-mcp-server
npm install
```

### Build

```bash
npm run build
```

### Run in Development

```bash
npm run dev      # Watch mode for TypeScript
npm run start    # Run the server
```

### Project Structure

```
src/
├── index.ts      # HTTP server, OAuth proxy, MCP transport
├── client.ts     # Axios client with request-scoped auth
├── config.ts     # Environment configuration
└── tools/
    ├── debates.ts   # Consultation/debate tools
    └── advisor.ts   # Advisor session tools
```

## Contributing

We welcome contributions! Please follow these guidelines:

### Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

### Code Style

- TypeScript strict mode
- ES modules (use `.js` extension in imports)
- Follow existing patterns in the codebase

### Adding New Tools

1. Create or edit a file in `src/tools/`
2. Export a `TOOLS` object:

```typescript
export const TOOLS = {
  my_tool: {
    name: "my_tool",
    description: "What this tool does",
    schema: {
      param: z.string().describe("Parameter description"),
    },
    handler: async (args: { param: string }) => {
      // Implementation
      return {
        content: [{ type: "text" as const, text: "Result" }]
      };
    }
  }
};
```

3. Import and register in `src/index.ts`

### Pull Request Guidelines

- Include tests for new functionality
- Update documentation as needed
- Keep changes focused and atomic
- Write clear commit messages

## Testing

```bash
npm test           # Run all tests
npm run test:watch # Watch mode
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Links

- [Counsel](https://counsel.getmason.dev) - Strategic reasoning platform
- [MCP Specification](https://modelcontextprotocol.io) - Model Context Protocol docs
- [Report Issues](https://github.com/getmason-io/counsel-mcp-server/issues)
