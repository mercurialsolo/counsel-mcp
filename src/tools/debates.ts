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
      counsel_id: z.string().optional().describe("Optional counsel/persona configuration ID to use."),
      debate_mode: z.enum(["fast", "standard", "deep"]).optional().describe("Optional debate mode override (fast/standard/deep) to tune speed vs rigor."),
      max_budget_cents: z.number().int().optional().describe("Optional soft budget cap in cents for the debate."),
      stakeholders: z.array(z.string()).optional().describe("Key stakeholders to consider."),
      // MSKS: Multi-Source Knowledge Synthesis parameters
      deep_research: z.boolean().default(false).describe("Use multi-provider AI research (MSKS). Queries providers in parallel and synthesizes findings."),
      research_depth: z.enum(["quick", "standard", "deep"]).default("standard").describe("Depth for research: 'quick' (3 standard), 'standard' (6 standard), 'deep' (4 dedicated deep research providers)."),
      research_providers: z.array(z.string()).optional().describe("Specific providers (any combination). Standard: chatgpt, gemini, claude, grok, kimi, deepseek. Deep: openai_deep_research, perplexity_sonar, gemini_deep_research, parallel_deep_research."),
      enable_dynamic_evidence: z.boolean().default(false).describe("Use dynamic evidence management with phase-specific compression. Optimizes context for each debate phase."),
      // MCDA: Multi-Criteria Decision Analysis parameters
      enable_mcda: z.boolean().optional().describe("Enable multi-criteria decision analysis (MCDA) scoring. Requires criteria_weights to be set."),
      criteria_weights: z.record(z.string(), z.number()).optional().describe("Dict of criterion_name -> weight (0-1), e.g. {'reliability': 0.3, 'cost': 0.25}. Weights should sum to 1."),
      stake_level: z.enum(["fast", "standard", "high"]).optional().describe("Enforcement level: 'fast' (minimal checks), 'standard' (normal validation), 'high' (strict evidence requirements)."),
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
      counsel_id?: string,
      debate_mode?: string,
      max_budget_cents?: number,
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
        counsel_id: args.counsel_id,
        debate_mode: args.debate_mode,
        max_budget_cents: args.max_budget_cents,
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
    description: `Intervene in or modify a running consultation. Use to pause, resume, abort, steer, or add sources to an ongoing analysis.

PHASE CONSTRAINTS (actions are only valid during specific phases):
- 'pause': Valid during active debate (diverge, attack, crux, integrate)
- 'resume': Valid only when paused
- 'abort': Valid during any running or paused debate
- 'steer': Valid during active debate or when paused
- 'modify_tensions': Valid ONLY during crux phase (after tensions identified)
- 'add_sources': Valid during active debate or when paused`,
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
    description: `Run standalone research across multiple AI providers WITHOUT a debate.

Available providers (any combination allowed):
- Standard: chatgpt, gemini, claude, grok, kimi, deepseek
- Deep research: openai_deep_research, perplexity_sonar, gemini_deep_research, parallel_deep_research

Depth controls auto-selection when providers not specified:
- 'quick': chatgpt, gemini, grok (~30s)
- 'standard': all 6 standard providers (~2-5 min)
- 'deep': all 4 deep research providers (~10-60 min)

Multi-agent features (Anthropic research patterns):
- use_planner: Query decomposition into focused sub-questions with facet-aware synthesis
- verify_citations: Post-research citation quality verification
- evaluate_quality: Quality assessment with gap detection and follow-up recommendations
- judge_quality: LLM-as-judge evaluation with 5-dimensional scoring`,
    schema: {
      query: z.string().min(10).describe("Research question or topic to investigate."),
      context: z.string().optional().describe("Additional context to guide the research."),
      depth: z.enum(["quick", "standard", "deep"]).default("standard").describe("Research depth - controls auto-selection: 'quick' (~30s), 'standard' (~2-5min), 'deep' (~10-60min with deep research providers)."),
      providers: z.array(z.string()).optional().describe("Specific providers (any combination). Standard: chatgpt, gemini, claude, grok, kimi, deepseek. Deep: openai_deep_research, perplexity_sonar, gemini_deep_research, parallel_deep_research."),
      timeout: z.number().optional().describe("Timeout in seconds. Deep providers default to 3600 (1 hour)."),
      // Multi-agent research features (Anthropic patterns)
      use_planner: z.boolean().default(false).describe("Enable query decomposition using Claude Opus. Breaks complex queries into focused sub-questions with facet-aware synthesis."),
      verify_citations: z.boolean().default(false).describe("Enable citation verification post-research. Checks that findings have proper source attribution."),
      evaluate_quality: z.boolean().default(false).describe("Enable quality evaluation with gap detection. Provides follow-up query recommendations for uncovered aspects."),
      judge_quality: z.boolean().default(false).describe("Enable LLM-as-judge evaluation with 5-dimensional scoring: factual accuracy, citation accuracy, completeness, source quality, synthesis quality.")
    },
    handler: async (args: {
      query: string,
      context?: string,
      depth?: string,
      providers?: string[],
      timeout?: number,
      use_planner?: boolean,
      verify_citations?: boolean,
      evaluate_quality?: boolean,
      judge_quality?: boolean
    }) => {
      const response = await apiClient.post("/research/deep", {
        query: args.query,
        context: args.context,
        depth: args.depth || "standard",
        providers: args.providers,
        timeout: args.timeout,
        use_planner: args.use_planner,
        verify_citations: args.verify_citations,
        evaluate_quality: args.evaluate_quality,
        judge_quality: args.judge_quality
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
        // Multi-agent evaluation results
        data.citation_verification ? `\n## Citation Verification\n- Verified: ${data.citation_verification.findings_verified}\n- Flagged: ${data.citation_verification.findings_flagged}\n- Unsupported: ${data.citation_verification.findings_unsupported}\n- Overall quality: ${(data.citation_verification.overall_citation_quality * 100).toFixed(0)}%` : null,
        data.quality_evaluation ? `\n## Quality Evaluation\n- Completeness: ${(data.quality_evaluation.completeness_score * 100).toFixed(0)}%\n- Source diversity: ${(data.quality_evaluation.source_diversity_score * 100).toFixed(0)}%\n- Recency: ${(data.quality_evaluation.recency_score * 100).toFixed(0)}%\n- Depth: ${(data.quality_evaluation.depth_score * 100).toFixed(0)}%\n- Overall: ${(data.quality_evaluation.overall_quality_score * 100).toFixed(0)}%${data.quality_evaluation.coverage_gaps?.length ? `\n- Gaps: ${data.quality_evaluation.coverage_gaps.join(", ")}` : ""}` : null,
        data.judgment ? `\n## LLM-as-Judge Evaluation\n- Factual accuracy: ${(data.judgment.factual_accuracy * 100).toFixed(0)}%\n- Citation accuracy: ${(data.judgment.citation_accuracy * 100).toFixed(0)}%\n- Completeness: ${(data.judgment.completeness * 100).toFixed(0)}%\n- Source quality: ${(data.judgment.source_quality * 100).toFixed(0)}%\n- Synthesis quality: ${(data.judgment.synthesis_quality * 100).toFixed(0)}%\n- Overall: ${(data.judgment.overall_score * 100).toFixed(0)}%${data.judgment.feedback ? `\n- Feedback: ${data.judgment.feedback}` : ""}` : null
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
  },

  retrieve_research_artifact: {
    name: "retrieve_research_artifact",
    description: `Retrieve full research artifact from storage.

Enables on-demand retrieval during synthesis or crux phases.
When evidence has been compressed to fit in context, this tool
allows retrieving the full original research results.

USE THIS WHEN:
- You need more detail than the compressed evidence provides
- You want to see all findings from a research run
- You need to verify sources referenced in the summary`,
    schema: {
      artifact_ref_id: z.string().describe("Artifact reference ID (e.g., 'art_abc123')"),
      include_full_text: z.boolean().default(false).describe("Include full source text (increases size)")
    },
    handler: async (args: { artifact_ref_id: string, include_full_text?: boolean }) => {
      try {
        const response = await apiClient.get(`/research/artifacts/${args.artifact_ref_id}`, {
          params: { include_full_text: args.include_full_text }
        });
        const data = response.data;
        const summary = [
          `Artifact: ${data.ref_id}`,
          `Provider: ${data.provider_id}`,
          `Query: ${data.query}`,
          `\n## Findings (${data.findings_count || data.findings?.length || 0})`,
          ...(data.findings?.slice(0, 10).map((f: any) => `- [${f.confidence?.toFixed(2)}] ${f.claim}`) || []),
          data.findings?.length > 10 ? `... and ${data.findings.length - 10} more` : null,
          `\n## Sources (${data.sources_count || data.sources?.length || 0})`,
          ...(data.sources?.slice(0, 5).map((s: any) => `- ${s.title}: ${s.text?.substring(0, 100)}...`) || []),
          data.sources?.length > 5 ? `... and ${data.sources.length - 5} more` : null,
          data.summary ? `\n## Summary\n${data.summary}` : null
        ].filter(Boolean).join("\n");
        return {
          content: [{ type: "text" as const, text: summary }]
        };
      } catch (err: any) {
        if (err.response?.status === 404) {
          return {
            content: [{ type: "text" as const, text: `Artifact not found: ${args.artifact_ref_id}. The artifact may have expired or the ID is incorrect.` }]
          };
        }
        throw err;
      }
    }
  },

  list_research_artifacts: {
    name: "list_research_artifacts",
    description: `List stored research artifacts.

Returns summaries of available artifacts that can be retrieved
using retrieve_research_artifact.

USE THIS WHEN:
- You need to find artifacts from previous research runs
- You want to see what research data is available for retrieval`,
    schema: {
      limit: z.number().optional().default(20).describe("Maximum number of artifacts to return")
    },
    handler: async (args: { limit?: number }) => {
      const response = await apiClient.get("/research/artifacts", {
        params: { limit: args.limit || 20 }
      });
      const artifacts = response.data.artifacts || response.data.items || response.data || [];
      if (artifacts.length === 0) {
        return {
          content: [{ type: "text" as const, text: "No research artifacts found." }]
        };
      }
      const summary = artifacts.map((a: any) =>
        `- [${a.ref_id}] ${a.provider_id}: "${a.query?.substring(0, 50)}..." (${a.findings_count || 0} findings, ${a.sources_count || 0} sources)`
      ).join("\n");
      return {
        content: [{ type: "text" as const, text: `Research Artifacts (${artifacts.length}):\n${summary}` }]
      };
    }
  },

  score_evidence_pack: {
    name: "score_evidence_pack",
    description: "Score evidence coverage and credibility before running analysis.",
    schema: {
      question: z.string().optional().describe("Strategic question to score evidence against"),
      sources: z.array(z.object({
        title: z.string().optional(),
        content: z.string().optional(),
        url: z.string().optional(),
        type: z.string().optional()
      })).optional().describe("Evidence sources with title/content/metadata")
    },
    handler: async (args: { question?: string, sources?: Array<{ title?: string, content?: string, url?: string, type?: string }> }) => {
      const response = await apiClient.post("/evidence/score", {
        question: args.question,
        sources: args.sources
      });
      const data = response.data;
      const summary = [
        `## Evidence Score`,
        `Overall: ${(data.overall_score * 100).toFixed(0)}%`,
        data.coverage_score !== undefined ? `Coverage: ${(data.coverage_score * 100).toFixed(0)}%` : null,
        data.credibility_score !== undefined ? `Credibility: ${(data.credibility_score * 100).toFixed(0)}%` : null,
        data.relevance_score !== undefined ? `Relevance: ${(data.relevance_score * 100).toFixed(0)}%` : null,
        data.gaps?.length ? `\n## Gaps Identified\n${data.gaps.map((g: string) => `- ${g}`).join("\n")}` : null,
        data.recommendations?.length ? `\n## Recommendations\n${data.recommendations.map((r: string) => `- ${r}`).join("\n")}` : null
      ].filter(Boolean).join("\n");
      return {
        content: [{ type: "text" as const, text: summary }]
      };
    }
  },

  list_decision_templates: {
    name: "list_decision_templates",
    description: "List decision templates available for the workspace.",
    schema: {
      include_public: z.boolean().optional().default(true).describe("Include public templates"),
      limit: z.number().optional().default(50).describe("Max templates to return"),
      offset: z.number().optional().default(0).describe("Pagination offset")
    },
    handler: async (args: { include_public?: boolean, limit?: number, offset?: number }) => {
      const response = await apiClient.get("/templates", {
        params: {
          include_public: args.include_public ?? true,
          limit: args.limit || 50,
          offset: args.offset || 0
        }
      });
      const templates = response.data.templates || response.data.items || response.data || [];
      if (templates.length === 0) {
        return {
          content: [{ type: "text" as const, text: "No decision templates found." }]
        };
      }
      const summary = templates.map((t: any) => {
        const vars = t.variables?.length ? ` (vars: ${t.variables.map((v: any) => v.name || v).join(", ")})` : "";
        return `- [${t.id}] **${t.name}**${vars}\n  ${t.description || "No description"}`;
      }).join("\n");
      return {
        content: [{ type: "text" as const, text: `## Decision Templates (${templates.length})\n\n${summary}` }]
      };
    }
  },

  use_decision_template: {
    name: "use_decision_template",
    description: "Instantiate a decision template with user-provided variables.",
    schema: {
      template_id: z.string().describe("Decision template ID to instantiate"),
      variables: z.record(z.string(), z.any()).optional().describe("Variable values for template placeholders")
    },
    handler: async (args: { template_id: string, variables?: Record<string, any> }) => {
      const response = await apiClient.post(`/templates/${args.template_id}/use`, {
        variables: args.variables || {}
      });
      const data = response.data;
      const summary = [
        `## Template Instantiated`,
        `\n### Question`,
        data.question || data.instantiated_question,
        data.suggested_mode ? `\n### Suggested Mode: ${data.suggested_mode}` : null,
        data.suggested_stakeholders?.length ? `\n### Suggested Stakeholders\n${data.suggested_stakeholders.map((s: string) => `- ${s}`).join("\n")}` : null,
        data.suggested_guidance ? `\n### Suggested Guidance\n${data.suggested_guidance}` : null,
        `\n---\n_Use this question with start_consultation to begin analysis._`
      ].filter(Boolean).join("\n");
      return {
        content: [{ type: "text" as const, text: summary }]
      };
    }
  }
};
