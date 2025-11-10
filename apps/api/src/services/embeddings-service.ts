import { OpenAIEmbeddings } from "@langchain/openai";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { db } from "../db";
import { collectionItems } from "../schema/collections-schema";
import { eq } from "drizzle-orm";
import { Pool } from "pg";

// Platform-wide embeddings configuration
const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small", // 1536 dimensions
  apiKey: process.env.OPENAI_API_KEY,
});

// Text splitter configuration
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

/**
 * Initialize PGVectorStore with auto-migration
 * This will create the table and indexes if they don't exist
 */
async function getVectorStore(collectionId?: string) {
  const config: any = {
    postgresConnectionOptions: {
      connectionString: process.env.DATABASE_URL,
    },
    tableName: 'collection_embeddings',
    columns: {
      idColumnName: 'id',
      vectorColumnName: 'embedding',
      contentColumnName: 'content',
      metadataColumnName: 'metadata',
    },
  };

  // Add collection filter if provided
  if (collectionId) {
    config.filter = { collectionId };
  }

  // This will run migrations automatically
  return await PGVectorStore.initialize(embeddings, config);
}

/**
 * Generate embeddings for a collection item
 */
export async function generateEmbeddingsForItem(
  collectionId: string,
  itemId: string,
  userId: string,
  teamId?: string
): Promise<void> {
  try {
    // Get the item
    const item = await db.select()
      .from(collectionItems)
      .where(eq(collectionItems.id, itemId))
      .limit(1);

    if (!item || item.length === 0) {
      throw new Error('Item not found');
    }

    const itemData = item[0];
    const content = itemData.searchableContent || itemData.content || '';

    if (!content.trim()) {
      throw new Error('No content to generate embeddings');
    }

    // Split content into chunks
    const chunks = await textSplitter.createDocuments([content]);

    // Initialize vector store (auto-migrates)
    const vectorStore = await getVectorStore();

    // Prepare documents with rich metadata
    const documents = chunks.map((chunk, index) => ({
      pageContent: chunk.pageContent,
      metadata: {
        // Collection identifiers
        collectionId,
        collectionItemId: itemId,

        // Source information
        noteId: itemData.noteId || null,
        title: itemData.title || 'Untitled',
        sourceType: itemData.sourceType,
        sourceUrl: itemData.sourceUrl || null,

        // Chunk information
        chunkIndex: index,
        totalChunks: chunks.length,

        // Access control
        userId,
        teamId: teamId || null,

        // Timestamps
        createdAt: new Date().toISOString(),
        itemCreatedAt: itemData.createdAt.toISOString(),
        itemUpdatedAt: itemData.updatedAt.toISOString(),
      },
    }));

    // Add to vector store
    await vectorStore.addDocuments(documents);

    // Update item status
    await db.update(collectionItems)
      .set({
        hasEmbeddings: true,
        embeddingsGeneratedAt: new Date(),
        embeddingsError: null,
      })
      .where(eq(collectionItems.id, itemId));

  } catch (error) {
    console.error('Error generating embeddings:', error);

    // Update item with error
    await db.update(collectionItems)
      .set({
        hasEmbeddings: false,
        embeddingsError: error instanceof Error ? error.message : 'Unknown error',
      })
      .where(eq(collectionItems.id, itemId));

    throw error;
  }
}

/**
 * Search within a collection using vector similarity
 */
export async function searchCollectionByVector(
  collectionId: string,
  query: string,
  limit: number = 5
): Promise<Array<{ content: string; metadata: any; score: number }>> {
  // Initialize with collection filter
  const vectorStore = await getVectorStore(collectionId);

  // Use the base VectorStore method via type assertion
  const results = await (vectorStore as any).similaritySearch(query, limit);

  return results.map((doc: any) => ({
    content: doc.pageContent,
    metadata: doc.metadata,
    score: 1.0, // Score not available without similarity score method
  }));
}

/**
 * Delete embeddings for a collection item
 */
export async function deleteEmbeddingsForItem(itemId: string): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    await pool.query(
      'DELETE FROM collection_embeddings WHERE metadata->>\'collectionItemId\' = $1',
      [itemId]
    );
  } finally {
    await pool.end();
  }
}

/**
 * Delete all embeddings for a collection
 */
export async function deleteEmbeddingsForCollection(collectionId: string): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    await pool.query(
      'DELETE FROM collection_embeddings WHERE metadata->>\'collectionId\' = $1',
      [collectionId]
    );
  } finally {
    await pool.end();
  }
}
