import { Request, Response } from 'express';
import { db } from '../db';
import { notes } from '../schema/notes-schema';
import { tasks, tags, taskTags } from '../schema/tasks-schema';
import { users } from '../schema/auth-schema';
import { eq, and, like, or, ilike } from 'drizzle-orm';
import { createSearchContext } from '../utils/text-extractor';

interface SearchResult {
  id: string;
  title: string;
  type: 'note' | 'task' | 'tag';
  content?: string;
  context?: string;
  url: string;
  metadata?: {
    priority?: string;
    status?: string;
    tagNames?: string[];
    createdAt?: string;
  };
}

export const search = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'User not authenticated'
      });
    }

    const query = req.query.q as string;
    
    if (!query || query.length < 3) {
      return res.json([]);
    }

    const searchTerm = `%${query}%`;
    const results: SearchResult[] = [];

    // Search Notes
    const noteResults = await db
      .select({
        id: notes.id,
        title: notes.title,
        content: notes.content,
        searchableContent: notes.searchableContent,
        createdAt: notes.createdAt,
      })
      .from(notes)
      .where(
        and(
          eq(notes.userId, req.user.id),
          eq(notes.archived, false),
          or(
            ilike(notes.title, searchTerm),
            ilike(notes.searchableContent, searchTerm)
          )
        )
      )
      .limit(10);

    for (const note of noteResults) {
      const context = note.searchableContent 
        ? createSearchContext(note.searchableContent, query, 60)
        : '';

      results.push({
        id: note.id,
        title: note.title,
        type: 'note',
        content: note.content || '',
        context,
        url: `/notes/${note.id}`,
        metadata: {
          createdAt: note.createdAt.toISOString(),
        },
      });
    }

    // Search Tasks
    const taskResults = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        notes: tasks.notes,
        priority: tasks.priority,
        createdAt: tasks.createdAt,
        statusName: tasks.statusId, // We'll need to join with status table later
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.createdById, req.user.id),
          or(
            ilike(tasks.title, searchTerm),
            ilike(tasks.notes, searchTerm)
          )
        )
      )
      .limit(10);

    for (const task of taskResults) {
      const context = task.notes 
        ? createSearchContext(task.notes, query, 60)
        : '';

      // Get tags for this task
      const taskTagsResult = await db
        .select({
          tagName: tags.name,
        })
        .from(taskTags)
        .innerJoin(tags, eq(taskTags.tagId, tags.id))
        .where(eq(taskTags.taskId, task.id));

      results.push({
        id: task.id,
        title: task.title,
        type: 'task',
        content: task.notes || '',
        context,
        url: `/tasks/${task.id}`,
        metadata: {
          priority: task.priority,
          tagNames: taskTagsResult.map(t => t.tagName),
          createdAt: task.createdAt.toISOString(),
        },
      });
    }

    // Search Tags
    const tagResults = await db
      .select({
        id: tags.id,
        name: tags.name,
      })
      .from(tags)
      .where(ilike(tags.name, searchTerm))
      .limit(10);

    for (const tag of tagResults) {
      results.push({
        id: tag.id,
        title: tag.name,
        type: 'tag',
        url: `/tasks?tag=${tag.id}`,
      });
    }

    // Sort results by relevance (exact matches first, then partial)
    const sortedResults = results.sort((a, b) => {
      const aExact = a.title.toLowerCase().includes(query.toLowerCase());
      const bExact = b.title.toLowerCase().includes(query.toLowerCase());
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Secondary sort by type (notes first, then tasks, then tags)
      const typeOrder = { note: 0, task: 1, tag: 2 };
      return typeOrder[a.type] - typeOrder[b.type];
    });

    res.json(sortedResults);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};