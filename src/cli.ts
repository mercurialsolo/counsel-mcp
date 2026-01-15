#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Command } from "commander";
import { config } from "./config.js";
import { TOOLS as DEBATE_TOOLS } from "./tools/debates.js";
import { TOOLS as ADVISOR_TOOLS } from "./tools/advisor.js"; 
import createServer from "./index.js";

const program = new Command();

program
  .name("counsel-mcp")
  .description("Counsel MCP Server")
  .version("0.2.6");

program.command("start")
  .description("Start the MCP server in stdio mode (default)")
  .action(async () => {
    // Re-instantiate server for local use since createServer returns the internal server.
    // Or just use createServer and try to connect. 
    // The SDK server object has a connect method.
    // createServer in index.ts returns server.server (McpServer.prototype.server which is `Server` from @modelcontextprotocol/sdk/server)
    // Wait, McpServer class wraps Server. "return server.server" returns the low level Server.
    // We cannot call connect() on the low level server easily if we want to use the high level transport?
    // Actually, Server.connect(transport) exists.
    
    // We can't reuse the instance returned by createServer exactly if we need McpServer wrapper features, 
    // but createServer returns `server.server` which is the `Server` instance.
    // So:
    const server = createServer({});
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error(`Counsel MCP Server started (stdio mode)`);
    console.error(`Upstream API: ${config.COUNSEL_API_URL}`);
    console.error(`Auth: Set COUNSEL_API_KEY environment variable`);
  });

// Default to start
if (process.argv.length === 2) {
  process.argv.push("start");
}

program.parse(process.argv);
