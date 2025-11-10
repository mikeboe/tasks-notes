import { AzureChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv"

dotenv.config();

export type LlmModelName = "o3-mini" | "gpt-4o" | "gpt-4o-mini" | "gpt-4.1" | "gpt-4.1-mini"

export const useLlm = (model: LlmModelName) => {
    switch (model) {
        case "o3-mini":
            return azureGptO3Mini;
        case "gpt-4o":
            return azureGpt4o;
        case "gpt-4o-mini":
            return azureGpt4oMini;
        case "gpt-4.1":
            return azureGpt41;
        case "gpt-4.1-mini":
            return azureGpt41Mini;

        default:
            return azureGptO3Mini;
    }
}

export const azureGptO3Mini = new AzureChatOpenAI({
    model: "o3-mini",
    azureOpenAIEndpoint: `https://swedencentral.api.cognitive.microsoft.com/`, // In Node.js defaults to process.env.AZURE_OPENAI_API_ENDPOINT
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY, // In Node.js defaults to process.env.AZURE_OPENAI_API_KEY
    // azureOpenAIApiInstanceName: process.env.AZURE_API_INSTANCE_NAME, // In Node.js defaults to process.env.AZURE_API_INSTANCE_NAME
    azureOpenAIApiDeploymentName: "o3-mini", // In Node.js defaults to process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME
    azureOpenAIApiVersion: "2025-01-01-preview", // In Node.js defaults to process.env.AZURE_OPENAI_API_VERSION
});

export const azureGpt4o = new AzureChatOpenAI({
    model: "gpt-4o",
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY, // In Node.js defaults to process.env.AZURE_AI_FOUNDRY_KEY
    azureOpenAIApiInstanceName: process.env.AZURE_API_INSTANCE_NAME, // In Node.js defaults to process.env.AZURE_API_INSTANCE_NAME
    azureOpenAIApiDeploymentName: "gpt-4o", // In Node.js defaults to process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME
    azureOpenAIApiVersion: "2025-01-01-preview", // In Node.js defaults to process.env.AZURE_OPENAI_API_VERSION
});

export const azureGpt4oMini = new AzureChatOpenAI({
    model: "gpt-4o-mini",
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY, // In Node.js defaults to process.env.AZURE_OPENAI_API_KEY
    azureOpenAIApiInstanceName: process.env.AZURE_API_INSTANCE_NAME, // In Node.js defaults to process.env.AZURE_API_INSTANCE_NAME
    azureOpenAIApiDeploymentName: "gpt-4o-mini", // In Node.js defaults to process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME
    azureOpenAIApiVersion: "2025-01-01-preview", // In Node.js defaults to process.env.AZURE_OPENAI_API_VERSION
});

export const azureGpt41 = new AzureChatOpenAI({
    model: "gpt-4.1",
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY, // In Node.js defaults to process.env.AZURE_OPENAI_API_KEY
    azureOpenAIApiInstanceName: process.env.AZURE_API_INSTANCE_NAME, // In Node.js defaults to process.env.AZURE_API_INSTANCE_NAME
    azureOpenAIApiDeploymentName: "gpt-4.1", // In Node.js defaults to process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME
    azureOpenAIApiVersion: "2025-01-01-preview", // In Node.js defaults to process.env.AZURE_OPENAI_API_VERSION
});

export const azureGpt41Mini = new AzureChatOpenAI({
    model: "gpt-4.1-mini",
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY, // In Node.js defaults to process.env.AZURE_OPENAI_API_KEY
    azureOpenAIApiInstanceName: process.env.AZURE_API_INSTANCE_NAME, // In Node.js defaults to process.env.AZURE_API_INSTANCE_NAME
    azureOpenAIApiDeploymentName: "gpt-4.1-mini", // In Node.js defaults to process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME
    azureOpenAIApiVersion: "2025-01-01-preview", // In Node.js defaults to process.env.AZURE_OPENAI_API_VERSION
});

