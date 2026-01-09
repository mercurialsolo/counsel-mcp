import { TOOLS as DEBATE_TOOLS } from "../src/tools/debates";
import { TOOLS as ADVISOR_TOOLS } from "../src/tools/advisor";
import { z } from "zod";

async function verify() {
  console.log("Verifying Debate Tools...");
  for (const [key, tool] of Object.entries(DEBATE_TOOLS)) {
    console.log(`- ${tool.name}: ${tool.description}`);
    if (!tool.schema) throw new Error(`Tool ${key} missing schema`);
    if (!tool.handler) throw new Error(`Tool ${key} missing handler`);
  }

  console.log("Verifying Advisor Tools...");
  for (const [key, tool] of Object.entries(ADVISOR_TOOLS)) {
    console.log(`- ${tool.name}: ${tool.description}`);
  }
  
  console.log("Verification Successful!");
}

verify().catch(console.error);
