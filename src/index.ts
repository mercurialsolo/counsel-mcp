import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { config } from "./config.js";
import { TOOLS as DEBATE_TOOLS } from "./tools/debates.js";
import { TOOLS as ADVISOR_TOOLS } from "./tools/advisor.js"; // Corrected import path based on context
import { ProxyOAuthServerProvider } from "@modelcontextprotocol/sdk/server/auth/providers/proxyProvider.js";
import { z } from "zod";

// Config schema for Smithery (optional but good practice)
export const configSchema = z.object({
  counselApiKey: z.string().optional().describe("API Key for Counsel (optional if using OAuth)"),
});

// OAuth Provider Export for Smithery
const counselApiUrl = config.COUNSEL_API_URL;
export const oauth = new ProxyOAuthServerProvider({
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

/**
 * Smithery entry point
 */
export default function createServer(args: { config?: { counselApiKey?: string }, auth?: any }) {
  // If config is provided (by Smithery), set the env var for compatibility
  if (args?.config?.counselApiKey) {
    process.env.COUNSEL_API_KEY = args.config.counselApiKey;
  }
  
  // Create server instance
  const server = new McpServer(
    {
      name: "counsel-mcp",
      version: "0.2.6",
    },
    {
      instructions: [
        "Counsel provides strategic analysis through multi-perspective deliberation.\n",
        "\n",
        "CRITICAL WORKFLOW:\n",
        "1. Use 'sharpen_question' for vague/broad questions BEFORE starting analysis\n",
        "2. Call 'start_consultation' (returns immediately with debate_id)\n",
        "3. Poll 'get_consultation_status' every 5-10s (analyses take 2-15 min)\n",
        "4. When status='completed', call 'get_consultation_report'\n",
        "\n",
        "MODE SELECTION:\n",
        "- 'quick': 30s pros/cons (no polling needed, returns immediately)\n",
        "- 'standard': 2-5min full debate (requires polling)\n",
        "- 'deep': 5-15min with web research (requires polling)\n",
        "- 'research': evidence gathering only (no debate)\n",
        "\n",
        "PHASE CONSTRAINTS:\n",
        "- Debates progress through phases: diverge → attack → crux → integrate\n",
        "- 'get_consultation_status' shows current phase and progress\n",
        "- Use 'list_consultations' to see past analyses\n",
        "\n",
        "SUPPORT TOOLS:\n",
        "- 'sharpen_question': Refine vague questions before starting\n",
        "- 'consult_advisor': Interactive brainstorming and problem scoping"
      ].join(""),
    }
  );

  // Register all tools
  for (const tool of Object.values(DEBATE_TOOLS)) {
    server.tool(tool.name, tool.schema, tool.handler);
  }
  // @ts-ignore
  for (const tool of Object.values(ADVISOR_TOOLS)) {
    server.tool(tool.name, tool.schema, tool.handler);
  }

  return server.server;
}

// Sandbox server for Smithery scanning
export function createSandboxServer() {
  return createServer({ config: { counselApiKey: "test-key" } });
}


