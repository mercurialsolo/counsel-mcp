#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Command } from "commander";
import { randomUUID } from "crypto";
import { config } from "./config.js";
import { TOOLS as DEBATE_TOOLS } from "./tools/debates.js";
import { TOOLS as ADVISOR_TOOLS } from "./tools/advisor.js";

const program = new Command();

program
  .name("counsel-mcp")
  .description("Counsel MCP Server")
  .version("0.1.3");

/**
 * Create and configure the MCP server with all tools
 */
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "counsel-mcp",
    version: "0.1.3",
  });

  // Register all tools
  for (const tool of Object.values(DEBATE_TOOLS)) {
    server.tool(tool.name, tool.schema, tool.handler);
  }
  for (const tool of Object.values(ADVISOR_TOOLS)) {
    server.tool(tool.name, tool.schema, tool.handler);
  }

  return server;
}

// STDIO mode (default) - for Claude Desktop, Cursor, MCPJam, etc.
program.command("start")
  .description("Start the MCP server in stdio mode (default)")
  .action(async () => {
    const server = createMcpServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error(`Counsel MCP Server started (stdio mode)`);
    console.error(`Upstream API: ${config.COUNSEL_API_URL}`);
    console.error(`Auth: Set COUNSEL_API_KEY environment variable`);
  });

// HTTP mode - for clients that support OAuth
program.command("http")
  .description("Start the MCP server in HTTP mode with OAuth support")
  .option("-p, --port <port>", "Port to listen on", "3000")
  .option("--host <host>", "Host to bind to", "localhost")
  .action(async (options) => {
    const express = (await import("express")).default;
    const { ProxyOAuthServerProvider } = await import("@modelcontextprotocol/sdk/server/auth/providers/proxyProvider.js");
    const { mcpAuthRouter } = await import("@modelcontextprotocol/sdk/server/auth/router.js");
    const { requireBearerAuth } = await import("@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js");

    const port = parseInt(options.port, 10);
    const host = options.host;
    const baseUrl = new URL(`http://${host}:${port}`);
    const counselApiUrl = config.COUNSEL_API_URL;

    // Create OAuth provider that proxies to Counsel API
    const oauthProvider = new ProxyOAuthServerProvider({
      endpoints: {
        authorizationUrl: `${counselApiUrl}/oauth/authorize`,
        tokenUrl: `${counselApiUrl}/oauth/token`,
        registrationUrl: `${counselApiUrl}/oauth/register`,
      },
      verifyAccessToken: async (token: string) => {
        return {
          token,
          clientId: "counsel-mcp-client",
          scopes: ["counsel:read", "counsel:write"],
          expiresAt: Math.floor(Date.now() / 1000) + 3600,
        };
      },
      getClient: async (clientId: string) => {
        return {
          client_id: clientId,
          redirect_uris: [],
          grant_types: ["authorization_code", "refresh_token"],
          response_types: ["code"],
          token_endpoint_auth_method: "client_secret_post",
        };
      },
    });

    const app = express();
    app.use(express.json());

    // OAuth routes
    app.use(mcpAuthRouter({
      provider: oauthProvider,
      issuerUrl: baseUrl,
      baseUrl: baseUrl,
      scopesSupported: ["counsel:read", "counsel:write"],
      serviceDocumentationUrl: new URL("https://counsel.getmason.dev/docs"),
    }));

    const mcpServer = createMcpServer();
    const transports = new Map<string, StreamableHTTPServerTransport>();

    // Protected MCP endpoint
    const mcpHandler = express.Router();
    mcpHandler.use(requireBearerAuth({
      verifier: oauthProvider,
      requiredScopes: ["counsel:read"],
    }));

    mcpHandler.all("/", async (req, res) => {
      const sessionId = req.headers["mcp-session-id"] as string || randomUUID();
      const authToken = req.headers.authorization?.replace(/^Bearer\s+/i, "");

      let transport = transports.get(sessionId);
      if (!transport) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => sessionId,
        });
        transports.set(sessionId, transport);
        await mcpServer.connect(transport);
        transport.onclose = () => transports.delete(sessionId);
      }

      const { runWithToken } = await import("./context.js");
      
      if (authToken) {
        await runWithToken(authToken, async () => {
          await transport!.handleRequest(req, res);
        });
      } else {
        await transport.handleRequest(req, res);
      }
    });

    app.use("/mcp", mcpHandler);

    app.get("/health", (_req, res) => {
      res.json({ status: "ok", version: "0.1.3" });
    });

    app.listen(port, host, () => {
      console.log(`Counsel MCP Server running at ${baseUrl.href}`);
      console.log(`MCP endpoint: ${baseUrl.href}mcp`);
      console.log(`OAuth metadata: ${baseUrl.href}.well-known/oauth-authorization-server`);
      console.log(`\nUpstream API: ${counselApiUrl}`);
    });
  });

// Default to stdio mode
if (process.argv.length === 2) {
  process.argv.push("start");
}

program.parse(process.argv);
