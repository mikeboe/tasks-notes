import { Meilisearch } from 'meilisearch';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

// Initialize Meilisearch client
const client = new Meilisearch({
  host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
  apiKey: process.env.MEILI_MASTER_KEY || '',
});

// Initialize text splitter for chunking long documents
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: [
    "\n\n",
    "\n",
    " ",
    ".",
    ",",
    "\u200b",  // Zero-width space
    "\uff0c",  // Fullwidth comma
    "\u3001",  // Ideographic comma
    "\uff0e",  // Fullwidth full stop
    "\u3002",  // Ideographic stop
    "",
  ],
});

interface NoteDocument {
  id: string;           // Unique chunk ID: noteId-chunk-0, noteId-chunk-1, etc.
  noteId: string;       // Original note ID for grouping chunks
  title: string;
  searchableContent: string;
  chunkIndex: number;   // Index of this chunk (0, 1, 2, ...)
  totalChunks: number;  // Total number of chunks for this note
  userId: string;
  teamId: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get the index name for a team or personal notes
 * Personal notes use 'personal' as index, team notes use teamId
 */
export const getIndexName = (teamId: string | null): string => {
  return teamId || 'personal';
};

/**
 * Ensure an index exists and has proper configuration
 */
const ensureIndexConfigured = async (indexName: string): Promise<void> => {
  try {
    const index = client.index(indexName);

    // Update searchable and filterable attributes
    await index.updateSearchableAttributes(['title', 'searchableContent']);
    await index.updateFilterableAttributes(['userId', 'teamId', 'noteId']);
  } catch (error) {
    console.error(`Error configuring index ${indexName}:`, error);
  }
};

/**
 * Add or update a note in Meilisearch
 * Splits long documents into chunks for better search performance
 */
export const upsertNoteDocument = async (note: {
  id: string;
  title: string;
  searchableContent: string;
  userId: string;
  teamId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Promise<void> => {
  try {
    const indexName = getIndexName(note.teamId);
    const index = client.index(indexName);

    // Ensure the index is properly configured (idempotent operation)
    await ensureIndexConfigured(indexName);

    // First, delete any existing chunks for this note
    await deleteNoteDocument(note.id, note.teamId);

    const content = note.searchableContent || '';

    // Split the content into chunks
    const chunks = await textSplitter.splitText(content);
    const totalChunks = chunks.length;

    // Create a document for each chunk
    const documents: NoteDocument[] = chunks.map((chunk, index) => ({
      id: `${note.id}-chunk-${index}`,
      noteId: note.id,
      title: note.title,
      searchableContent: chunk,
      chunkIndex: index,
      totalChunks: totalChunks,
      userId: note.userId,
      teamId: note.teamId,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    }));

    // Add all chunks to the index
    if (documents.length > 0) {
      await index.addDocuments(documents, { primaryKey: 'id' });
    }
  } catch (error) {
    console.error('Error upserting document to Meilisearch:', error);
    // Don't throw - we don't want search indexing to break the main operation
  }
};

/**
 * Delete a note from Meilisearch
 * Deletes all chunks associated with this note
 */
export const deleteNoteDocument = async (
  noteId: string,
  teamId: string | null
): Promise<void> => {
  try {
    const indexName = getIndexName(teamId);
    const index = client.index(indexName);

    // Search for all chunks belonging to this note
    const searchResults = await index.search<NoteDocument>('', {
      filter: `noteId = "${noteId}"`,
      limit: 1000, // Assuming no note will have more than 1000 chunks
    });

    // Delete all found chunks
    const chunkIds = searchResults.hits.map(hit => hit.id);
    if (chunkIds.length > 0) {
      await index.deleteDocuments(chunkIds);
    }
  } catch (error) {
    console.error('Error deleting document from Meilisearch:', error);
    // Don't throw - we don't want search indexing to break the main operation
  }
};

/**
 * Search notes across all accessible indexes
 * For personal notes, search only in 'personal' index
 * For team context, search in the specific team index
 * Returns deduplicated results grouped by noteId
 */
export const searchNotes = async (
  query: string,
  userId: string,
  teamId: string | null,
  limit: number = 10
): Promise<NoteDocument[]> => {
  try {
    const indexName = getIndexName(teamId);
    const index = client.index(indexName);

    // Search with higher limit to account for multiple chunks per note
    const searchResults = await index.search<NoteDocument>(query, {
      limit: limit * 10, // Get more results to ensure we have enough unique notes
      attributesToSearchOn: ['title', 'searchableContent'],
    });

    // Filter by userId for personal index to ensure users only see their own notes
    let hits = searchResults.hits;
    if (!teamId) {
      hits = hits.filter(hit => hit.userId === userId);
    }

    // Deduplicate by noteId - keep the first (highest-ranked) chunk for each note
    const uniqueNotes = new Map<string, NoteDocument>();
    for (const hit of hits) {
      if (!uniqueNotes.has(hit.noteId)) {
        uniqueNotes.set(hit.noteId, hit);
      }
    }

    // Return limited number of unique notes
    return Array.from(uniqueNotes.values()).slice(0, limit);
  } catch (error) {
    console.error('Error searching in Meilisearch:', error);
    return [];
  }
};

/**
 * Initialize indexes with proper settings
 * Call this on application startup
 */
export const initializeMeilisearch = async (): Promise<void> => {
  try {
    // Configure searchable attributes for personal index
    const personalIndex = client.index('personal');
    await personalIndex.updateSearchableAttributes(['title', 'searchableContent']);
    await personalIndex.updateFilterableAttributes(['userId', 'teamId', 'noteId']);

    console.log('Meilisearch initialized successfully');
  } catch (error) {
    console.error('Error initializing Meilisearch:', error);
    // Don't throw - application should start even if Meilisearch is unavailable
  }
};

export default client;
