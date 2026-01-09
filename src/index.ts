#!/usr/bin/env node
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { ProxyOAuthServerProvider } from "@modelcontextprotocol/sdk/server/auth/providers/proxyProvider.js";
import { mcpAuthRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { Command } from "commander";
import { randomUUID } from "crypto";
import { config } from "./config.js";
import { requestContext } from "./client.js";
import { TOOLS as DEBATE_TOOLS } from "./tools/debates.js";
import { TOOLS as ADVISOR_TOOLS } from "./tools/advisor.js";

const program = new Command();

program
  .name("counsel-mcp")
  .description("Counsel MCP Server - HTTP mode with OAuth")
  .version("0.1.0");

program.command("start")
  .description("Start the MCP server (HTTP mode)")
  .option("-p, --port <port>", "Port to listen on", "3000")
  .option("-h, --host <host>", "Host to bind to", "localhost")
  .action(async (options) => {
    const port = parseInt(options.port, 10);
    const host = options.host;
    const baseUrl = new URL(`http://${host}:${port}`);

    // Use Counsel API as the upstream OAuth server
    const counselApiUrl = config.COUNSEL_API_URL;

    // Create OAuth provider that proxies to Counsel API
    const oauthProvider = new ProxyOAuthServerProvider({
      endpoints: {
        authorizationUrl: `${counselApiUrl}/oauth/authorize`,
        tokenUrl: `${counselApiUrl}/oauth/token`,
        registrationUrl: `${counselApiUrl}/oauth/register`,
        revocationUrl: `${counselApiUrl}/oauth/revoke`,
      },
      // Verify access tokens by calling Counsel API
      verifyAccessToken: async (token: string) => {
        // For now, we trust the token and extract info from it
        // In production, you might want to call an introspection endpoint
        // or validate the token format
        return {
          token,
          clientId: "counsel-mcp-client",
          scopes: ["counsel:read", "counsel:write"],
          expiresAt: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        };
      },
      // Get client info - for proxy mode, we delegate to upstream
      getClient: async (clientId: string) => {
        // Return minimal client info - actual validation happens at Counsel API
        return {
          client_id: clientId,
          redirect_uris: [],
          grant_types: ["authorization_code", "refresh_token"],
          response_types: ["code"],
          token_endpoint_auth_method: "client_secret_post",
        };
      },
    });

    // Create Express app
    const app = express();
    app.use(express.json());

    // Mount OAuth routes at root (handles /authorize, /token, /register, /.well-known/*)
    app.use(mcpAuthRouter({
      provider: oauthProvider,
      issuerUrl: baseUrl,
      baseUrl: baseUrl,
      scopesSupported: ["counsel:read", "counsel:write"],
      serviceDocumentationUrl: new URL("https://counsel.getmason.dev/docs"),
    }));

    // Create MCP server
    const mcpServer = new McpServer({
      name: "counsel-mcp",
      version: "0.1.0",
    });

    // Register all tools
    for (const tool of Object.values(DEBATE_TOOLS)) {
      mcpServer.tool(tool.name, tool.schema, tool.handler);
    }
    for (const tool of Object.values(ADVISOR_TOOLS)) {
      mcpServer.tool(tool.name, tool.schema, tool.handler);
    }

    // Create transport for each session
    const transports = new Map<string, StreamableHTTPServerTransport>();

    // Protected MCP endpoint with Bearer auth
    const mcpHandler = express.Router();
    mcpHandler.use(requireBearerAuth({
      verifier: oauthProvider,
      requiredScopes: ["counsel:read"],
    }));

    // Handle MCP requests
    mcpHandler.all("/", async (req, res) => {
      // Get the auth token from the request (set by requireBearerAuth middleware)
      const authInfo = (req as any).auth;
      const token = authInfo?.token;

      // Run the request within the auth context so tools can access the token
      await requestContext.run({ token }, async () => {
        // Get or create session
        const sessionId = req.headers["mcp-session-id"] as string || randomUUID();

        let transport = transports.get(sessionId);
        if (!transport) {
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => sessionId,
          });
          transports.set(sessionId, transport);

          // Connect transport to MCP server
          await mcpServer.connect(transport);

          // Clean up on close
          transport.onclose = () => {
            transports.delete(sessionId);
          };
        }

        // Handle the request
        await transport.handleRequest(req, res);
      });
    });

    app.use("/mcp", mcpHandler);

    // Health check endpoint
    app.get("/health", (_req, res) => {
      res.json({ status: "ok", version: "0.1.0" });
    });

    // Start server
    app.listen(port, host, () => {
      console.log(`Counsel MCP Server running at ${baseUrl.href}`);
      console.log(`MCP endpoint: ${baseUrl.href}mcp`);
      console.log(`OAuth authorize: ${baseUrl.href}authorize`);
      console.log(`OAuth metadata: ${baseUrl.href}.well-known/oauth-authorization-server`);
      console.log(`\nUpstream Counsel API: ${counselApiUrl}`);
    });
  });

// Default command is start
if (process.argv.length === 2) {
  process.argv.push("start");
}

program.parse(process.argv);
