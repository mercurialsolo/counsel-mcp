import { z } from "zod";
import { apiClient } from "../client.js";

export const TOOLS = {
  consult_advisor: {
    name: "consult_advisor",
    description: "Start an interactive advisor session to brainstorm or scope a problem.",
    schema: {
      question: z.string().describe("The initial topic or question."),
    },
    handler: async (args: { question: string }) => {
      const response = await apiClient.post("/advisor/start", { question: args.question });
      return {
        content: [{ 
          type: "text" as const, 
          text: `Advisor session started.\nSession ID: ${response.data.session_id}\n\nAdvisor: ${response.data.initial_message}` 
        }]
      };
    }
  },
  
  // Potential future tool: respond_to_advisor (for multi-turn via tool)
  // For now, simple start is enough as per spec.
};
