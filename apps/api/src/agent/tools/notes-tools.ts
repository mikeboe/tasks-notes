import { tool } from "langchain";
import { z } from "zod";
import { db } from "../../db";
import { notes, noteTags } from "../../schema/notes-schema";
import { tags } from "../../schema/tasks-schema";
import { teamMembers } from "../../schema/teams-schema";
import { eq, and, desc, isNull, ilike, or } from "drizzle-orm";
import { searchNotes } from "../../utils/meilisearch";

interface ToolContext {
  userId: string;
  teamId?: string;
}

// Helper function to check team access
async function checkTeamAccess(userId: string, teamId: string): Promise<boolean> {
  const membership = await db.select()
    .from(teamMembers)
    .where(and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, userId)
    ))
    .limit(1);

  return membership.length > 0;
}

// Helper function to build where conditions for notes
function buildNoteWhereConditions(userId: string, teamId?: string, includeArchived = false) {
  const conditions = [];

  if (!includeArchived) {
    conditions.push(eq(notes.archived, false));
  }

  if (teamId) {
    conditions.push(eq(notes.teamId, teamId));
  } else {
    conditions.push(isNull(notes.teamId));
    conditions.push(eq(notes.userId, userId));
  }

  return conditions;
}

/**
 * Tool: Get Note By ID
 * Fetches a single note by its ID with full content
 */
export function createGetNoteByIdTool(context: ToolContext) {
  return tool(
    async ({ noteId }: { noteId: string }): Promise<string> => {
      try {
        const note = await db.select().from(notes).where(eq(notes.id, noteId)).limit(1);

        if (note.length === 0) {
          return `Error: Note with ID ${noteId} not found`;
        }

        const noteData = note[0];

        // Check access: personal note or team note
        if (noteData.teamId) {
          const hasAccess = await checkTeamAccess(context.userId, noteData.teamId);
          if (!hasAccess) {
            return `Error: You don't have access to this note`;
          }
        } else if (noteData.userId !== context.userId) {
          return `Error: You don't have access to this note`;
        }

        // Fetch tags
        const noteTags_result = await db.select({
          id: tags.id,
          name: tags.name,
        })
        .from(noteTags)
        .innerJoin(tags, eq(noteTags.tagId, tags.id))
        .where(eq(noteTags.noteId, noteId));

        const tagNames = noteTags_result.map(t => t.name).join(', ');

        let response = '-----\n';
        response += `# Note: ${noteData.title}\n`;
        response += `ID: ${noteData.id}\n`;
        response += `Created: ${noteData.createdAt.toISOString()}\n`;
        response += `Updated: ${noteData.updatedAt.toISOString()}\n`;
        if (tagNames) {
          response += `Tags: ${tagNames}\n`;
        }
        response += '-----\n\n';
        response += noteData.searchableContent || noteData.content || 'No content';

        return response;
      } catch (error) {
        console.error('Error fetching note:', error);
        return `Error fetching note: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
    {
      name: "get_note_by_id",
      description: "Fetch a single note by its ID. Returns the full note content, title, metadata, and tags. Use this when you need to read the complete content of a specific note.",
      schema: z.object({
        noteId: z.string().uuid().describe("The UUID of the note to fetch"),
      }),
    }
  );
}

/**
 * Tool: Search Notes
 * Search notes using Meilisearch for fast, typo-tolerant search
 */
export function createSearchNotesTool(context: ToolContext) {
  return tool(
    async ({ query, limit = 10 }: { query: string; limit?: number }): Promise<string> => {
      try {
        // Use Meilisearch for fast, typo-tolerant search
        const meilisearchResults = await searchNotes(
          query,
          context.userId,
          context.teamId || null,
          Math.min(limit, 50)
        );

        // Return chunk data directly - showing relevant excerpts from chunks
        if (meilisearchResults.length === 0) {
          return `No notes found matching query: "${query}"`;
        }

        let response = `Found ${meilisearchResults.length} result(s) matching "${query}":\n\n`;

        for (const chunk of meilisearchResults) {
          response += '-----\n';
          response += `## ${chunk.title}\n`;
          response += `ID: ${chunk.noteId}\n`;
          response += `Updated: ${chunk.updatedAt}\n`;
          if (chunk.totalChunks > 1) {
            response += `(Showing chunk ${chunk.chunkIndex + 1} of ${chunk.totalChunks})\n`;
          }

          // Show the relevant chunk content (first 300 characters)
          const excerpt = (chunk.searchableContent || '').substring(0, 300);
          response += `\nExcerpt: ${excerpt}${(chunk.searchableContent || '').length > 300 ? '...' : ''}\n\n`;
        }

        response += `\nTo read the full content of any note, use the get_note_by_id tool with the note ID.`;

        return response;
      } catch (error) {
        console.error('Error searching notes:', error);
        return `Error searching notes: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
    {
      name: "search_notes",
      description: "Search through all accessible notes using a text query with typo-tolerance. Searches in both note titles and content using Meilisearch for fast, relevant results. Returns a list of matching notes with excerpts. Use this to find relevant notes based on keywords or topics.",
      schema: z.object({
        query: z.string().describe("The search query text (typo-tolerant)"),
        limit: z.number().optional().default(10).describe("Maximum number of results to return (default: 10, max: 50)"),
      }),
    }
  );
}

/**
 * Tool: List Notes
 * Get all notes with optional filters
 */
export function createListNotesTool(context: ToolContext) {
  return tool(
    async ({ parentId, limit = 50 }: { parentId?: string; limit?: number }): Promise<string> => {
      try {
        const whereConditions = buildNoteWhereConditions(context.userId, context.teamId);

        // Filter by parent if specified
        if (parentId !== undefined) {
          if (parentId === 'null' || parentId === '') {
            whereConditions.push(isNull(notes.parentId));
          } else {
            whereConditions.push(eq(notes.parentId, parentId));
          }
        }

        const results = await db.select({
          id: notes.id,
          title: notes.title,
          parentId: notes.parentId,
          order: notes.order,
          createdAt: notes.createdAt,
          updatedAt: notes.updatedAt,
        })
        .from(notes)
        .where(and(...whereConditions))
        .orderBy(notes.order)
        .limit(Math.min(limit, 100));

        if (results.length === 0) {
          return `No notes found${parentId ? ` with parent ID ${parentId}` : ''}`;
        }

        let response = `Found ${results.length} note(s):\n\n`;

        for (const note of results) {
          response += `- ${note.title} (ID: ${note.id})`;
          if (note.parentId) {
            response += ` [child of ${note.parentId}]`;
          }
          response += `\n  Updated: ${note.updatedAt.toISOString()}\n`;
        }

        response += `\nTo read the full content of any note, use the get_note_by_id tool.`;

        return response;
      } catch (error) {
        console.error('Error listing notes:', error);
        return `Error listing notes: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
    {
      name: "list_notes",
      description: "List all accessible notes with optional filtering. Returns note metadata (title, ID, parent) without full content. Use this to get an overview of available notes or to find notes in a specific location in the hierarchy.",
      schema: z.object({
        parentId: z.string().optional().describe("Filter by parent note ID. Use 'null' for root notes only. Omit to get all notes."),
        limit: z.number().optional().default(50).describe("Maximum number of results (default: 50, max: 100)"),
      }),
    }
  );
}

/**
 * Tool: Get Notes By Tag
 * Find notes that have a specific tag
 */
export function createGetNotesByTagTool(context: ToolContext) {
  return tool(
    async ({ tagName }: { tagName: string }): Promise<string> => {
      try {
        const whereConditions = buildNoteWhereConditions(context.userId, context.teamId);

        // Join with note_tags and tags to filter by tag name
        const results = await db.select({
          id: notes.id,
          title: notes.title,
          searchableContent: notes.searchableContent,
          updatedAt: notes.updatedAt,
        })
        .from(notes)
        .innerJoin(noteTags, eq(notes.id, noteTags.noteId))
        .innerJoin(tags, eq(noteTags.tagId, tags.id))
        .where(and(
          ...whereConditions,
          ilike(tags.name, tagName)
        ))
        .orderBy(desc(notes.updatedAt));

        if (results.length === 0) {
          return `No notes found with tag: "${tagName}"`;
        }

        let response = `Found ${results.length} note(s) with tag "${tagName}":\n\n`;

        for (const note of results) {
          response += '-----\n';
          response += `## ${note.title}\n`;
          response += `ID: ${note.id}\n`;
          response += `Updated: ${note.updatedAt.toISOString()}\n`;

          // Show excerpt
          const excerpt = (note.searchableContent || '').substring(0, 200);
          response += `Excerpt: ${excerpt}${(note.searchableContent || '').length > 200 ? '...' : ''}\n\n`;
        }

        return response;
      } catch (error) {
        console.error('Error getting notes by tag:', error);
        return `Error getting notes by tag: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
    {
      name: "get_notes_by_tag",
      description: "Find all notes that have a specific tag. Returns a list of notes with excerpts. Use this when you need to find notes organized by a particular tag or category.",
      schema: z.object({
        tagName: z.string().describe("The name of the tag to search for"),
      }),
    }
  );
}

/**
 * Tool: Get Recent Notes
 * Get recently modified notes
 */
export function createGetRecentNotesTool(context: ToolContext) {
  return tool(
    async ({ limit = 10 }: { limit?: number }): Promise<string> => {
      try {
        const whereConditions = buildNoteWhereConditions(context.userId, context.teamId);

        const results = await db.select({
          id: notes.id,
          title: notes.title,
          searchableContent: notes.searchableContent,
          createdAt: notes.createdAt,
          updatedAt: notes.updatedAt,
        })
        .from(notes)
        .where(and(...whereConditions))
        .orderBy(desc(notes.updatedAt))
        .limit(Math.min(limit, 50));

        if (results.length === 0) {
          return `No recent notes found`;
        }

        let response = `${results.length} most recent note(s):\n\n`;

        for (const note of results) {
          response += '-----\n';
          response += `## ${note.title}\n`;
          response += `ID: ${note.id}\n`;
          response += `Updated: ${note.updatedAt.toISOString()}\n`;

          // Show excerpt
          const excerpt = (note.searchableContent || '').substring(0, 200);
          response += `Excerpt: ${excerpt}${(note.searchableContent || '').length > 200 ? '...' : ''}\n\n`;
        }

        return response;
      } catch (error) {
        console.error('Error getting recent notes:', error);
        return `Error getting recent notes: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
    {
      name: "get_recent_notes",
      description: "Get the most recently modified notes, sorted by update time. Returns a list of notes with excerpts. Use this to see what notes were recently worked on or to find notes by recency.",
      schema: z.object({
        limit: z.number().optional().default(10).describe("Maximum number of results (default: 10, max: 50)"),
      }),
    }
  );
}

/**
 * Tool: Get Note Hierarchy
 * Get a note with its parent and children
 */
export function createGetNoteHierarchyTool(context: ToolContext) {
  return tool(
    async ({ noteId }: { noteId: string }): Promise<string> => {
      try {
        // Get the main note
        const note = await db.select().from(notes).where(eq(notes.id, noteId)).limit(1);

        if (note.length === 0) {
          return `Error: Note with ID ${noteId} not found`;
        }

        const noteData = note[0];

        // Check access
        if (noteData.teamId) {
          const hasAccess = await checkTeamAccess(context.userId, noteData.teamId);
          if (!hasAccess) {
            return `Error: You don't have access to this note`;
          }
        } else if (noteData.userId !== context.userId) {
          return `Error: You don't have access to this note`;
        }

        let response = '-----\n';
        response += `# Note: ${noteData.title}\n`;
        response += `ID: ${noteData.id}\n\n`;

        // Get parent if exists
        if (noteData.parentId) {
          const parent = await db.select({
            id: notes.id,
            title: notes.title,
          }).from(notes).where(eq(notes.id, noteData.parentId)).limit(1);

          if (parent.length > 0) {
            response += `## Parent Note:\n`;
            response += `- ${parent[0].title} (ID: ${parent[0].id})\n\n`;
          }
        } else {
          response += `## Parent Note: None (this is a root note)\n\n`;
        }

        // Get children
        const children = await db.select({
          id: notes.id,
          title: notes.title,
          order: notes.order,
        })
        .from(notes)
        .where(and(
          eq(notes.parentId, noteId),
          eq(notes.archived, false)
        ))
        .orderBy(notes.order);

        response += `## Child Notes (${children.length}):\n`;
        if (children.length > 0) {
          for (const child of children) {
            response += `- ${child.title} (ID: ${child.id})\n`;
          }
        } else {
          response += `No child notes\n`;
        }

        response += '\n-----\n';

        return response;
      } catch (error) {
        console.error('Error getting note hierarchy:', error);
        return `Error getting note hierarchy: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
    {
      name: "get_note_hierarchy",
      description: "Get a note's position in the hierarchy, including its parent note and all child notes. Use this to understand the structure and organization of notes, or to navigate the note tree.",
      schema: z.object({
        noteId: z.string().uuid().describe("The UUID of the note to get hierarchy for"),
      }),
    }
  );
}
