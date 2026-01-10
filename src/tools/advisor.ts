import { z } from "zod";
import { apiClient } from "../client.js";

export const TOOLS = {
  consult_advisor: {
    name: "consult_advisor",
    description: "Interact with the AI Advisor for personalized intake, brainstorming, or problem scoping. Start a new session or continue an existing one.",
    schema: {
      message: z.string().describe("The user's message or answer to a question."),
      session_id: z.string().optional().describe("Existing session ID. If omitted, starts a new session."),
      action: z.enum(["chat", "finalize"]).default("chat").describe("'chat' to converse/reply, 'finalize' to complete intake and save profile.")
    },
    handler: async (args: { message: string, session_id?: string, action?: string }) => {
      if (!args.session_id) {
        // Start new session
        const response = await apiClient.post("/advisor/start", { question: args.message });
        return {
          content: [{
            type: "text" as const,
            text: `Advisor session started.\nSession ID: ${response.data.session_id}\n\nAdvisor: ${response.data.initial_message || response.data.message}`
          }]
        };
      } else if (args.action === "finalize") {
        // Finalize session
        const response = await apiClient.post(`/advisor/sessions/${args.session_id}/finalize`, { message: args.message });
        return {
          content: [{
            type: "text" as const,
            text: `Session finalized.\n\n${JSON.stringify(response.data, null, 2)}`
          }]
        };
      } else {
        // Continue conversation
        const response = await apiClient.post(`/advisor/sessions/${args.session_id}/message`, { message: args.message });
        return {
          content: [{
            type: "text" as const,
            text: `Advisor: ${response.data.message || response.data.response}`
          }]
        };
      }
    }
  },

  get_advisor_profile: {
    name: "get_advisor_profile",
    description: "Retrieve the learned user profile from an advisor session.",
    schema: {
      session_id: z.string().describe("The advisor session ID to retrieve the profile from.")
    },
    handler: async (args: { session_id: string }) => {
      const response = await apiClient.get(`/advisor/sessions/${args.session_id}/profile`);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(response.data, null, 2)
        }]
      };
    }
  }
};
