# Counsel MCP Server

[![npm version](https://img.shields.io/npm/v/counsel-mcp-server.svg)](https://www.npmjs.com/package/counsel-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/counsel-mcp-server.svg)](https://nodejs.org)

An open-source [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that connects AI agents to the [Counsel](https://counsel.getmason.dev) API for strategic reasoning and multi-perspective analysis.

## Features

- **Hosted & Self-Hosted** - Use the hosted server instantly or run your own instance
- **Strategic Reasoning** - Access Counsel's debate and multi-perspective reasoning engines
- **Advisor Sessions** - Run interactive intake and profile tuning sessions
- **Native OAuth 2.0** - Standard MCP authentication handled automatically by clients
- **Dual Transport** - STDIO for local clients, HTTP for web clients and shared servers

---

## Table of Contents

- [Quick Start (Hosted)](#quick-start-hosted)
- [Installation (Self-Hosted)](#installation-self-hosted)
  - [Claude Desktop](#claude-desktop)
  - [Claude Code (CLI)](#claude-code-cli)
  - [Cursor](#cursor)
  - [Windsurf](#windsurf)
  - [VS Code with Copilot](#vs-code-with-copilot)
  - [Other MCP Clients](#other-mcp-clients)
- [Authentication](#authentication)
- [Available Tools](#available-tools)
- [Usage Examples](#usage-examples)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

---

## Quick Start (Hosted)

Connect instantly to the hosted Counsel MCP server - no installation required:

```
http://counsel-mcp.getmason.dev/mcp
```

For MCP clients that support HTTP transport, simply add:

```json
{
  "mcpServers": {
    "counsel": {
      "url": "http://counsel-mcp.getmason.dev/mcp",
      "transport": "http"
    }
  }
}
```

OAuth authentication is handled automatically by your MCP client.

---

## Installation (Self-Hosted)

Run your own instance of the Counsel MCP server locally.

### Prerequisites

1. **Node.js 18+** installed on your system
2. A **Counsel account** at [counsel.getmason.dev](https://counsel.getmason.dev)

### Claude Desktop

Add to your `claude_desktop_config.json`:

<details>
<summary><b>macOS</b>: <code>~/Library/Application Support/Claude/claude_desktop_config.json</code></summary>

```json
{
  "mcpServers": {
    "counsel": {
      "command": "npx",
      "args": ["-y", "counsel-mcp-server", "start"]
    }
  }
}
```

</details>

<details>
<summary><b>Windows</b>: <code>%APPDATA%\Claude\claude_desktop_config.json</code></summary>

```json
{
  "mcpServers": {
    "counsel": {
      "command": "npx",
      "args": ["-y", "counsel-mcp-server", "start"]
    }
  }
}
```

</details>

### Claude Code (CLI)

```bash
claude mcp add counsel -- npx -y counsel-mcp-server start
```

Or manually add to your MCP settings:

```json
{
  "mcpServers": {
    "counsel": {
      "command": "npx",
      "args": ["-y", "counsel-mcp-server", "start"]
    }
  }
}
```

### Cursor

Add to your Cursor MCP configuration (`.cursor/mcp.json` in your project or global settings):

```json
{
  "mcpServers": {
    "counsel": {
      "command": "npx",
      "args": ["-y", "counsel-mcp-server", "start"]
    }
  }
}
```

### Windsurf

Add to your Windsurf MCP configuration:

```json
{
  "mcpServers": {
    "counsel": {
      "command": "npx",
      "args": ["-y", "counsel-mcp-server", "start"]
    }
  }
}
```

### VS Code with Copilot

Add to your VS Code settings (`settings.json`):

```json
{
  "mcp.servers": {
    "counsel": {
      "command": "npx",
      "args": ["-y", "counsel-mcp-server", "start"]
    }
  }
}
```

### Other MCP Clients

The server supports two transport modes. Choose based on your client's capabilities:

#### STDIO Mode (Default)

Most MCP clients use STDIO transport. Configure with:

```json
{
  "mcpServers": {
    "counsel": {
      "command": "npx",
      "args": ["-y", "counsel-mcp-server", "start"],
      "env": {
        "COUNSEL_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

#### HTTP Mode with OAuth

For clients that support HTTP transport with OAuth 2.0, run the server separately:

```bash
# Start the HTTP server
npx -y counsel-mcp-server http --port 3000
```

This starts an HTTP server with:
- **MCP endpoint**: `http://localhost:3000/mcp`
- **OAuth discovery**: `http://localhost:3000/.well-known/oauth-authorization-server`

Then configure your client to connect:

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

HTTP mode uses OAuth 2.0 with automatic token management - no API key required.

#### Transport Comparison

| Feature | STDIO Mode | HTTP Mode |
|---------|------------|-----------|
| **Command** | `npx -y counsel-mcp-server start` | `npx -y counsel-mcp-server http` |
| **Auth** | API key via env var | OAuth 2.0 (automatic) |
| **Setup** | Single config | Run server + configure client |
| **Best for** | Claude Desktop, Cursor, VS Code | Web clients, shared servers |

---

## Authentication

The server supports two authentication modes:

### STDIO Mode (Default)

Set the `COUNSEL_API_KEY` environment variable with your API key from [counsel.getmason.dev](https://counsel.getmason.dev):

```bash
export COUNSEL_API_KEY=your_api_key_here
```

Or add it to your MCP client configuration:
```json
{
  "mcpServers": {
    "counsel": {
      "command": "npx",
      "args": ["-y", "counsel-mcp-server", "start"],
      "env": {
        "COUNSEL_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### HTTP Mode (OAuth 2.0)

When running in HTTP mode (`npx -y counsel-mcp-server http`), authentication is handled automatically through OAuth 2.0:

1. When you first use a Counsel tool, your MCP client will prompt for authentication
2. You'll be redirected to sign in with your Counsel account
3. After authorization, tokens are managed automatically

**No manual API key required** in HTTP mode - your MCP client handles the entire OAuth flow.

### OAuth Endpoints (HTTP Mode)

The server exposes standard OAuth 2.0 endpoints:

| Endpoint | Description |
|----------|-------------|
| `/.well-known/oauth-authorization-server` | OAuth metadata discovery |
| `/authorize` | Authorization endpoint |
| `/token` | Token exchange endpoint |
| `/register` | Dynamic client registration |

---

## Available Tools

### `start_consultation`

Start a new strategic consultation (debate) to analyze a complex question with multiple perspectives.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `question` | string | Yes | The core question to analyze |
| `context` | string | No | Additional context about the situation |
| `mode` | enum | No | Depth of analysis: `quick`, `standard` (default), `deep` |
| `stakeholders` | string[] | No | Key stakeholders to consider |

**Example:**
```
Start a consultation about "Should we migrate our monolith to microservices?"
with context about our 50-person engineering team and mode set to deep
```

### `get_consultation_status`

Check the status of an ongoing consultation.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `debate_id` | string | Yes | The ID of the consultation |

### `get_consultation_report`

Retrieve the final synthesis report from a completed consultation.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `debate_id` | string | Yes | The ID of the consultation |

### `list_consultations`

List your past consultations.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | number | No | Number of results (default: 10) |

### `sharpen_question`

Refine and improve a strategic question before starting a consultation.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `question` | string | Yes | The question to refine |
| `context` | string | No | Additional context |

**Example:**
```
Sharpen this question: "Is AI good for our company?"
```

### `consult_advisor`

Start an interactive advisor session for brainstorming or scoping problems.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `question` | string | Yes | The initial topic or question |

---

## Usage Examples

### Strategic Decision Making

```
Use Counsel to analyze: "Should we expand into the European market in 2025?"

Consider these stakeholders: CEO, CFO, Head of Sales, Legal
Use deep analysis mode
```

### Question Refinement

```
Use the sharpen_question tool to improve this question:
"How do we fix our culture?"

Context: We're a 200-person startup experiencing rapid growth
```

### Checking Consultation Progress

```
Check the status of consultation abc-123-def
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `COUNSEL_API_URL` | `https://counsel.getmason.dev` | Counsel API base URL |
| `PORT` | `3000` | Server port (HTTP mode) |

### CLI Commands

```bash
# STDIO mode (default) - for most MCP clients
npx -y counsel-mcp-server start

# HTTP mode - for clients supporting OAuth
npx -y counsel-mcp-server http [options]

HTTP Options:
  -p, --port <port>  Port to listen on (default: 3000)
  --host <host>      Host to bind to (default: localhost)
```

---

## Troubleshooting

### "Tool not found" Error

Ensure the MCP server is properly configured in your client. Restart your client after adding the configuration.

### Authentication Issues

1. Check that you have a valid Counsel account
2. Try removing and re-adding the MCP server configuration
3. Clear your client's MCP cache if available

### Connection Refused

If running in HTTP mode, ensure:
- The server is running (`npx counsel-mcp-server start`)
- The port isn't blocked by a firewall
- No other process is using the same port

### Server Not Starting

```bash
# Check Node.js version (requires 18+)
node --version

# Try running directly to see errors
npx counsel-mcp-server start
```

### Debug Mode

For verbose logging, check your MCP client's logs or run the server directly in a terminal to see output.

---

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
git clone https://github.com/mercurialsolo/counsel-mcp.git
cd counsel-mcp-server
npm install
npm run build
```

### Commands

```bash
npm run build            # Compile TypeScript
npm run dev              # Watch mode
npm run start            # Run server
npm test                 # Run tests
npm run lint             # Type check
npm run security:check   # Scan staged files for secrets
npm run security:check:all  # Scan all files for secrets
```

### Security

This project includes automated secret detection:

- **Pre-commit hook**: Automatically scans staged files before each commit
- **CI integration**: Security checks run on all pull requests
- **Pattern detection**: AWS keys, GitHub tokens, API keys, private keys, etc.

See [CONTRIBUTING.md](CONTRIBUTING.md#security-checks) for details.

### Project Structure

```
src/
├── index.ts        # HTTP server, OAuth proxy, MCP transport
├── client.ts       # API client with request-scoped auth
├── config.ts       # Environment configuration
└── tools/
    ├── debates.ts  # Consultation tools
    └── advisor.ts  # Advisor session tools
```

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick Start

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes and add tests
4. Run `npm test` to ensure tests pass
5. Submit a pull request

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Links

- [Counsel Platform](https://counsel.getmason.dev) - Strategic reasoning platform
- [MCP Specification](https://modelcontextprotocol.io) - Model Context Protocol documentation
- [GitHub Issues](https://github.com/mercurialsolo/counsel-mcp/issues) - Report bugs or request features
- [GitHub Discussions](https://github.com/mercurialsolo/counsel-mcp/discussions) - Ask questions
