#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Command } from "commander";
import { config } from "./config.js";
import { TOOLS as DEBATE_TOOLS } from "./tools/debates.js";
import { TOOLS as ADVISOR_TOOLS } from "./tools/advisor.js";

const program = new Command();

program
  .name("counsel-mcp")
  .description("Counsel MCP Server")
  .version("0.1.1");

program.command("start")
  .description("Start the MCP server (stdio mode)")
  .action(async () => {
    // Create MCP server
    const server = new McpServer({
      name: "counsel-mcp",
      version: "0.1.0",
    });

    // Register all tools
    for (const tool of Object.values(DEBATE_TOOLS)) {
      server.tool(tool.name, tool.schema, tool.handler);
    }
    for (const tool of Object.values(ADVISOR_TOOLS)) {
      server.tool(tool.name, tool.schema, tool.handler);
    }

    // Connect via stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    // Log to stderr (stdout is used for MCP protocol)
    console.error(`Counsel MCP Server started (stdio mode)`);
    console.error(`Upstream API: ${config.COUNSEL_API_URL}`);
  });

// Default command is start
if (process.argv.length === 2) {
  process.argv.push("start");
}

program.parse(process.argv);
