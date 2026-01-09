import { z } from "zod";
import { apiClient } from "../client.js";

// Tool Definitions
export const TOOLS = {
  start_consultation: {
    name: "start_consultation",
    description: "Start a new strategic consultation (debate) to analyze a complex question.",
    schema: {
      question: z.string().describe("The core question to verify or analyze."),
      context: z.string().optional().describe("Additional context about the situation."),
      mode: z.enum(["quick", "standard", "deep"]).default("standard").describe("Depth of analysis."),
      stakeholders: z.array(z.string()).optional().describe("Key stakeholders to consider."),
    },
    handler: async (args: { question: string, context?: string, mode?: string, stakeholders?: string[] }) => {
      const response = await apiClient.post("/debates", {
        question: args.question,
        context: args.context,
        config: { mode: args.mode }, // Assuming API expects config object
        stakeholders: args.stakeholders
      });
      return {
        content: [{ 
          type: "text" as const, 
          text: `Consultation started successfully.\nID: ${response.data.id}\nStatus: ${response.data.status}` 
        }]
      };
    }
  },

  get_consultation_status: {
    name: "get_consultation_status",
    description: "Check the status of an ongoing consultation.",
    schema: {
      debate_id: z.string().describe("The ID of the consultation to check."),
    },
    handler: async (args: { debate_id: string }) => {
      const response = await apiClient.get(`/debates/${args.debate_id}`);
      return {
        content: [{ 
          type: "text" as const, 
          text: JSON.stringify(response.data, null, 2) 
        }]
      };
    }
  },

  get_consultation_report: {
    name: "get_consultation_report",
    description: "Retrieve the final synthesis report of a completed consultation.",
    schema: {
      debate_id: z.string().describe("The ID of the consultation."),
    },
    handler: async (args: { debate_id: string }) => {
      try {
        const response = await apiClient.get(`/debates/${args.debate_id}/synthesis`);
        return {
          content: [{ 
            type: "text" as const, 
            text: response.data.markdown || response.data.content || JSON.stringify(response.data)
          }]
        };
      } catch (err: any) {
        if (err.response?.status === 404) {
           return {
            content: [{ type: "text" as const, text: "Report not ready or not found." }]
          };
        }
        throw err;
      }
    }
  },

  list_consultations: {
    name: "list_consultations",
    description: "List past consultations.",
    schema: {
      limit: z.number().optional().default(10),
    },
    handler: async (args: { limit: number }) => {
      const response = await apiClient.get("/debates", { params: { limit: args.limit } });
      const debates = response.data.items || response.data;
      const summary = debates.map((d: any) => `- [${d.id}] ${d.question} (${d.status})`).join("\n");
      return {
        content: [{ type: "text" as const, text: summary }]
      };
    }
  },
  
  sharpen_question: {
    name: "sharpen_question",
    description: "Refine a strategic question using the enhancement engine.",
    schema: {
      question: z.string(),
      context: z.string().optional()
    },
    handler: async (args: { question: string, context?: string }) => {
      const response = await apiClient.post("/enhance/question", args);
      return {
        content: [{ type: "text" as const, text: response.data.enhanced_question || response.data.result }]
      };
    }
  }
};
