import { tool } from "langchain";
import { z } from "zod";
import { searchCollectionByVector } from "../../services/embeddings-service";

interface ToolContext {
  userId: string;
  teamId?: string;
  collectionId: string;
}

/**
 * Tool: Search Collection
 * Search through collection using vector similarity
 */
export function createSearchCollectionTool(context: ToolContext) {
  return tool(
    async ({ query, limit = 5 }: { query: string; limit?: number }): Promise<string> => {
      try {
        const results = await searchCollectionByVector(
          context.collectionId,
          query,
          Math.min(limit, 10)
        );

        if (results.length === 0) {
          return `No relevant content found in collection for query: "${query}"`;
        }

        let response = `Found ${results.length} relevant chunk(s):\n\n`;

        for (const result of results) {
          response += '-----\n';
          response += `Source: ${result.metadata.title || 'Untitled'}\n`;
          response += `Type: ${result.metadata.sourceType}\n`;
          response += `Relevance: ${(result.score * 100).toFixed(1)}%\n`;

          if (result.metadata.noteId) {
            response += `Note ID: ${result.metadata.noteId}\n`;
          }

          if (result.metadata.sourceUrl) {
            response += `URL: ${result.metadata.sourceUrl}\n`;
          }

          if (result.metadata.totalChunks > 1) {
            response += `Chunk: ${result.metadata.chunkIndex + 1}/${result.metadata.totalChunks}\n`;
          }

          response += `\n${result.content}\n\n`;
        }

        return response;
      } catch (error) {
        console.error('Error searching collection:', error);
        return `Error searching collection: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
    {
      name: "search_collection",
      description: "Search through the collection using semantic/vector search. Returns the most relevant content chunks based on the query. Use this to find information within the collection.",
      schema: z.object({
        query: z.string().describe("The search query"),
        limit: z.number().optional().default(5).describe("Max results (default: 5, max: 10)"),
      }),
    }
  );
}
