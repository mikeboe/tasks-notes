import { SearxngSearch } from "@langchain/community/tools/searxng_search";

export const internetSearchTool = new SearxngSearch({
    apiBase: "http://localhost:8080",
    params: {
        format: "json",
    }
});

