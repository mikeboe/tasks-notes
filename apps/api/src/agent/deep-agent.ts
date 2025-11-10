import { createDeepAgent } from "deepagents";
import { pdfScraperTool, webScraperToolFirecrawl } from "./tools";
import { useLlm } from "./llm";

const prompt = `You are a helpful assistant that can use tools to scrape data from websites and PDF documents. Use the provided tools to fetch and extract the required information based on user requests. Always ensure to handle errors gracefully and provide informative feedback if something goes wrong. You can answer without tools if you have sufficient information.`;

export const agent = createDeepAgent({
  // @ts-expect-error incomplete types
  tools: [pdfScraperTool, webScraperToolFirecrawl],
  model: "gpt-4.1",
  systemPrompt: prompt,
});