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
      mode: z.enum(["quick", "standard", "deep", "research"]).default("standard").describe("Analysis depth: 'quick' (30s pros/cons), 'standard' (full debate), 'deep' (with research), 'research' (evidence only)."),
      stakeholders: z.array(z.string()).optional().describe("Key stakeholders to consider."),
      // MSKS: Multi-Source Knowledge Synthesis parameters
      deep_research: z.boolean().default(false).describe("Use multi-provider AI research (MSKS). Queries ChatGPT, Gemini, Claude, Grok, Kimi, DeepSeek in parallel and synthesizes findings."),
      research_depth: z.enum(["quick", "standard", "deep"]).default("standard").describe("Depth for multi-provider research: 'quick', 'standard', or 'deep'."),
      research_providers: z.array(z.string()).optional().describe("Specific providers for deep research. Options: chatgpt, gemini, claude, grok, kimi, deepseek. Invalid names are skipped gracefully."),
      enable_dynamic_evidence: z.boolean().default(false).describe("Use dynamic evidence management with phase-specific compression. Optimizes context for each debate phase."),
      // MCDA: Multi-Criteria Decision Analysis parameters
      enable_mcda: z.boolean().default(false).describe("Enable multi-criteria decision analysis (MCDA) scoring. Requires criteria_weights to be set."),
      criteria_weights: z.record(z.string(), z.number()).optional().describe("Dict of criterion_name -> weight (0-1), e.g. {'reliability': 0.3, 'cost': 0.25}. Weights should sum to 1."),
      stake_level: z.enum(["fast", "standard", "high"]).default("standard").describe("Enforcement level: 'fast' (minimal checks), 'standard' (normal validation), 'high' (strict evidence requirements)."),
      evidence_policy: z.object({
        freshness_days_max: z.number().optional(),
        min_coverage_ratio: z.number().optional(),
        min_primary_sources: z.number().optional()
      }).optional().describe("Optional evidence policy. Keys: freshness_days_max, min_coverage_ratio, min_primary_sources."),
    },
    handler: async (args: {
      question: string,
      context?: string,
      mode?: string,
      stakeholders?: string[],
      deep_research?: boolean,
      research_depth?: string,
      research_providers?: string[],
      enable_dynamic_evidence?: boolean,
      enable_mcda?: boolean,
      criteria_weights?: Record<string, number>,
      stake_level?: string,
      evidence_policy?: { freshness_days_max?: number, min_coverage_ratio?: number, min_primary_sources?: number }
    }) => {
      const response = await apiClient.post("/debates", {
        question: args.question,
        context: args.context,
        config: { mode: args.mode },
        stakeholders: args.stakeholders,
        // MSKS parameters
        deep_research: args.deep_research,
        research_depth: args.research_depth,
        research_providers: args.research_providers,
        enable_dynamic_evidence: args.enable_dynamic_evidence,
        // MCDA parameters
        enable_mcda: args.enable_mcda,
        criteria_weights: args.criteria_weights,
        stake_level: args.stake_level,
        evidence_policy: args.evidence_policy
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
  },

  manage_consultation: {
    name: "manage_consultation",
    description: "Intervene in or modify a running consultation. Use to pause, resume, abort, steer, or add sources to an ongoing analysis.",
    schema: {
      analysis_id: z.string().describe("The ID of the consultation to manage."),
      action: z.enum(["pause", "resume", "abort", "steer", "modify_tensions", "add_sources"]).describe("The intervention action to perform."),
      payload: z.union([z.string(), z.record(z.string(), z.any()), z.array(z.any())]).optional().describe("Data for the action: string guidance for 'steer', source list for 'add_sources', optional reason for 'pause'/'abort'.")
    },
    handler: async (args: { analysis_id: string, action: string, payload?: string | Record<string, any> | any[] }) => {
      const response = await apiClient.post(`/debates/${args.analysis_id}/intervention`, {
        action: args.action,
        payload: args.payload
      });
      return {
        content: [{ type: "text" as const, text: `Action '${args.action}' applied successfully.\n${JSON.stringify(response.data, null, 2)}` }]
      };
    }
  },

  verify_claim: {
    name: "verify_claim",
    description: "Fact-check a specific statement or claim. Returns verdict (Supported/Refuted/Ambiguous) and evidence trace.",
    schema: {
      claim: z.string().describe("The specific statement or claim to fact-check."),
      context: z.string().optional().describe("The surrounding text/context where the claim appears."),
      user_sources: z.array(z.object({
        url: z.string().optional(),
        title: z.string().optional(),
        content: z.string().optional()
      })).optional().describe("Optional list of sources to check the claim against.")
    },
    handler: async (args: { claim: string, context?: string, user_sources?: Array<{ url?: string, title?: string, content?: string }> }) => {
      const response = await apiClient.post("/enhance/verify", {
        claim: args.claim,
        context: args.context,
        user_sources: args.user_sources
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(response.data, null, 2) }]
      };
    }
  },

  get_pricing: {
    name: "get_pricing",
    description: "Get current pricing, token costs per model, and user balance information.",
    schema: {},
    handler: async () => {
      const response = await apiClient.get("/billing/pricing");
      return {
        content: [{ type: "text" as const, text: JSON.stringify(response.data, null, 2) }]
      };
    }
  },

  list_research_providers: {
    name: "list_research_providers",
    description: "List available deep research providers with their capabilities. Shows which AI models can be used for multi-provider research (MSKS).",
    schema: {},
    handler: async () => {
      const response = await apiClient.get("/research/providers");
      const providers = response.data.providers || [];
      const available = providers.filter((p: any) => p.available);
      const summary = providers.map((p: any) =>
        `- ${p.id}: ${p.name} ${p.available ? '✓' : '✗'}\n  ${p.description}`
      ).join("\n");
      return {
        content: [{
          type: "text" as const,
          text: `Available: ${available.length}/${providers.length} providers\n\n${summary}`
        }]
      };
    }
  },

  run_deep_research: {
    name: "run_deep_research",
    description: "Run standalone deep research across multiple AI providers WITHOUT a debate. Queries providers in parallel and synthesizes findings.",
    schema: {
      query: z.string().min(10).describe("Research question or topic to investigate."),
      context: z.string().optional().describe("Additional context to guide the research."),
      depth: z.enum(["quick", "standard", "deep"]).default("standard").describe("Research depth: 'quick' (fast scan), 'standard' (balanced), 'deep' (comprehensive)."),
      providers: z.array(z.string()).optional().describe("Specific providers to use: chatgpt, gemini, claude, grok, kimi, deepseek. Invalid names are skipped gracefully.")
    },
    handler: async (args: { query: string, context?: string, depth?: string, providers?: string[] }) => {
      const response = await apiClient.post("/research/deep", {
        query: args.query,
        context: args.context,
        depth: args.depth || "standard",
        providers: args.providers
      });
      const data = response.data;
      const summary = [
        `Research ID: ${data.research_id}`,
        `Providers used: ${data.providers_used?.join(", ") || "none"}`,
        data.providers_skipped?.length ? `Providers skipped: ${data.providers_skipped.map((s: any) => `${s.provider_id} (${s.reason})`).join(", ")}` : null,
        `\n## Executive Summary\n${data.executive_summary || "N/A"}`,
        `\n## Key Insights\n${data.key_insights?.map((i: string) => `- ${i}`).join("\n") || "N/A"}`,
        `\n## Findings (${data.findings?.length || 0})`,
        ...(data.findings?.slice(0, 5).map((f: any) => `- [${f.confidence?.toFixed(2)}] ${f.claim}`) || []),
        data.findings?.length > 5 ? `... and ${data.findings.length - 5} more` : null,
        `\n## Sources (${data.sources?.length || 0})`,
        ...(data.sources?.slice(0, 5).map((s: any) => `- ${s.title}`) || []),
        data.sources?.length > 5 ? `... and ${data.sources.length - 5} more` : null,
      ].filter(Boolean).join("\n");
      return {
        content: [{ type: "text" as const, text: summary }]
      };
    }
  },

  list_resources: {
    name: "list_resources",
    description: "List available resources: past consultations, counsel configurations, advisor sessions, or templates.",
    schema: {
      type: z.enum(["consultations", "counsels", "advisor_sessions", "templates"]).describe("What to list."),
      limit: z.number().optional().default(10).describe("Maximum number of items to return."),
      offset: z.number().optional().default(0).describe("Pagination start index.")
    },
    handler: async (args: { type: string, limit?: number, offset?: number }) => {
      const endpoints: Record<string, string> = {
        consultations: "/debates",
        counsels: "/counsels",
        advisor_sessions: "/advisor/sessions",
        templates: "/templates"
      };
      const endpoint = endpoints[args.type];
      if (!endpoint) {
        return { content: [{ type: "text" as const, text: `Unknown resource type: ${args.type}` }] };
      }
      const response = await apiClient.get(endpoint, { params: { limit: args.limit, offset: args.offset } });
      const items = response.data.items || response.data;
      const summary = items.map((item: any) => {
        if (args.type === "consultations") {
          return `- [${item.id}] ${item.question} (${item.status})`;
        } else if (args.type === "counsels") {
          return `- [${item.id}] ${item.name}: ${item.description || ""}`;
        } else if (args.type === "templates") {
          return `- [${item.id}] ${item.name}: ${item.description || ""}`;
        } else {
          return `- [${item.id || item.session_id}] ${item.name || item.topic || "Session"}`;
        }
      }).join("\n");
      return {
        content: [{ type: "text" as const, text: `${args.type} (${items.length} items):\n${summary}` }]
      };
    }
  }
};
