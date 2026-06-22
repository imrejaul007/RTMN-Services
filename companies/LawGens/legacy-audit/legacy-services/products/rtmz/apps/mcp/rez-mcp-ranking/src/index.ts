import { logger } from './utils/logger.js';
import { tools, toolHandlers } from './tools.js';
import 'dotenv/config';

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Environment configuration
const RANKING_SERVICE_URL = process.env.RANKING_SERVICE_URL || 'http://localhost:5006';
const USE_REAL_API = process.env.USE_REAL_RANKING === 'true';

// Create MCP server
const server = new Server(
  {
    name: "rez-ranking",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = tools.find((t) => t.name === request.params.name);
  if (!tool) {
    return {
      content: [{ type: "text", text: `Error: Unknown tool ${request.params.name}` }],
      isError: true,
    };
  }

  const handler = toolHandlers[request.params.name];
  if (!handler) {
    return {
      content: [{ type: "text", text: `Error: No handler for tool ${request.params.name}` }],
      isError: true,
    };
  }

  try {
    const result = await handler(request.params.arguments as Record<string, unknown> | undefined);
    return result;
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : "Unknown error"}` }],
      isError: true,
    };
  }
});

// Start server
async function main() {
  logger.info("REZ Ranking Service MCP Server running on stdio");
  logger.info(`Ranking Service URL: ${RANKING_SERVICE_URL}`);
  logger.info(`Real API: ${USE_REAL_API ? 'ENABLED' : 'DISABLED (set USE_REAL_RANKING=true to enable)'}`);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
