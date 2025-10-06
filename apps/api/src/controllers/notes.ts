
import { Request, Response } from 'express';
import { db } from '../db';
import { notes, favorites, createNoteSchema, updateNoteSchema, reorderNoteSchema } from '../schema/notes-schema';
import { eq, and, asc, desc, max, min, lt, gt, gte, lte, isNull } from 'drizzle-orm';
import { extractTextFromBlockNote } from '../utils/text-extractor';

export const getNotes = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'User not authenticated'
      });
    }

    const teamId = req.query.teamId as string | undefined;

    // Build where conditions
    const whereConditions = [
      eq(notes.userId, req.user.id),
      eq(notes.archived, false)
    ];

    // Filter by teamId: null for personal notes, specific teamId for team notes
    if (teamId) {
      whereConditions.push(eq(notes.teamId, teamId));
    } else {
      whereConditions.push(isNull(notes.teamId));
    }

    const userNotes = await db.select({
      id: notes.id,
      title: notes.title,
      userId: notes.userId,
      teamId: notes.teamId,
      parentId: notes.parentId,
      order: notes.order,
      archived: notes.archived,
      searchableContent: notes.searchableContent,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
    }).from(notes).where(and(...whereConditions)).orderBy(asc(notes.order));

    res.json(userNotes);
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

export const getNoteById = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'User not authenticated'
      });
    }

    const noteId = req.params.id;

    const note = await db.select().from(notes).where(and(eq(notes.id, noteId), eq(notes.userId, req.user.id)));

    if (note.length === 0) {
      return res.status(404).json({ message: 'Note not found' });
    }

    res.json(note[0]);
  } catch (error) {
    console.error('Get note by id error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

export const createNote = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'User not authenticated'
      });
    }

    const validation = createNoteSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.error.issues
      });
    }

    const { title, content, parentId, order } = validation.data;
    const teamId = req.query.teamId as string | undefined;

    // Build where conditions for finding max order
    const whereConditions = [eq(notes.userId, req.user.id)];

    if (teamId) {
      whereConditions.push(eq(notes.teamId, teamId));
    } else {
      whereConditions.push(isNull(notes.teamId));
    }

    if (parentId) {
      whereConditions.push(eq(notes.parentId, parentId));
    } else {
      whereConditions.push(isNull(notes.parentId));
    }

    let noteOrder = order;
    if (noteOrder === undefined) {
      const maxOrderResult = await db.select({ maxOrder: max(notes.order) })
        .from(notes)
        .where(and(...whereConditions));

      noteOrder = (maxOrderResult[0]?.maxOrder || 0) + 1;
    }

    const searchableContent = content ? extractTextFromBlockNote(content) : '';

    const newNote = await db.insert(notes).values({
      title,
      content,
      searchableContent,
      parentId,
      order: noteOrder,
      userId: req.user.id,
      teamId: teamId || null,
    }).returning();

    res.status(201).json(newNote[0]);
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

export const updateNote = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'User not authenticated'
      });
    }

    const noteId = req.params.id;
    const validation = updateNoteSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.error.issues
      });
    }

    const { title, content, parentId, order } = validation.data;
    
    const searchableContent = content ? extractTextFromBlockNote(content) : undefined;

    const updatedNote = await db.update(notes).set({
      title,
      content,
      searchableContent,
      parentId,
      order,
      updatedAt: new Date(),
    }).where(and(eq(notes.id, noteId), eq(notes.userId, req.user.id))).returning();

    if (updatedNote.length === 0) {
      return res.status(404).json({ message: 'Note not found' });
    }

    res.json(updatedNote[0]);
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

export const deleteNote = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'User not authenticated'
      });
    }

    const noteId = req.params.id;

    const deletedNote = await db.delete(notes).where(and(eq(notes.id, noteId), eq(notes.userId, req.user.id))).returning();

    if (deletedNote.length === 0) {
      return res.status(404).json({ message: 'Note not found' });
    }

    res.status(204).end();
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

export const moveNote = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'User not authenticated'
      });
    }

    const noteId = req.params.id;
    const { direction } = req.body;

    if (!['up', 'down', 'top', 'bottom'].includes(direction)) {
      return res.status(400).json({
        message: 'Invalid direction. Must be one of: up, down, top, bottom'
      });
    }

    const currentNote = await db.select().from(notes).where(and(eq(notes.id, noteId), eq(notes.userId, req.user.id)));
    
    if (currentNote.length === 0) {
      return res.status(404).json({ message: 'Note not found' });
    }

    const note = currentNote[0];
    const parentCondition = note.parentId ? eq(notes.parentId, note.parentId) : isNull(notes.parentId);
    
    let updatedNote;
    
    switch (direction) {
      case 'up': {
        const prevNote = await db.select()
          .from(notes)
          .where(and(
            eq(notes.userId, req.user.id),
            parentCondition,
            lt(notes.order, note.order)
          ))
          .orderBy(desc(notes.order))
          .limit(1);
          
        if (prevNote.length > 0) {
          await db.update(notes).set({ order: prevNote[0].order }).where(eq(notes.id, noteId));
          await db.update(notes).set({ order: note.order }).where(eq(notes.id, prevNote[0].id));
        }
        break;
      }
      
      case 'down': {
        const nextNote = await db.select()
          .from(notes)
          .where(and(
            eq(notes.userId, req.user.id),
            parentCondition,
            gt(notes.order, note.order)
          ))
          .orderBy(asc(notes.order))
          .limit(1);
          
        if (nextNote.length > 0) {
          await db.update(notes).set({ order: nextNote[0].order }).where(eq(notes.id, noteId));
          await db.update(notes).set({ order: note.order }).where(eq(notes.id, nextNote[0].id));
        }
        break;
      }
      
      case 'top': {
        const minOrderResult = await db.select({ minOrder: min(notes.order) })
          .from(notes)
          .where(and(eq(notes.userId, req.user.id), parentCondition));
          
        const minOrder = minOrderResult[0]?.minOrder || 0;
        await db.update(notes).set({ order: minOrder - 1 }).where(eq(notes.id, noteId));
        break;
      }
      
      case 'bottom': {
        const maxOrderResult = await db.select({ maxOrder: max(notes.order) })
          .from(notes)
          .where(and(eq(notes.userId, req.user.id), parentCondition));
          
        const maxOrder = maxOrderResult[0]?.maxOrder || 0;
        await db.update(notes).set({ order: maxOrder + 1 }).where(eq(notes.id, noteId));
        break;
      }
    }

    updatedNote = await db.select().from(notes).where(eq(notes.id, noteId));
    res.json(updatedNote[0]);
    
  } catch (error) {
    console.error('Move note error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

export const moveNoteToParent = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'User not authenticated'
      });
    }

    const noteId = req.params.id;
    const { parentId, order } = req.body;

    const currentNote = await db.select().from(notes).where(and(eq(notes.id, noteId), eq(notes.userId, req.user.id)));
    
    if (currentNote.length === 0) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (parentId && parentId !== null) {
      const parentNote = await db.select().from(notes).where(and(eq(notes.id, parentId), eq(notes.userId, req.user.id)));
      if (parentNote.length === 0) {
        return res.status(400).json({ message: 'Parent note not found' });
      }
      
      if (noteId === parentId) {
        return res.status(400).json({ message: 'Cannot set note as its own parent' });
      }
      
      const isDescendant = await checkIfDescendant(noteId, parentId, req.user.id);
      if (isDescendant) {
        return res.status(400).json({ message: 'Cannot move note to its descendant' });
      }
    }

    let noteOrder = order;
    if (noteOrder === undefined) {
      const maxOrderResult = await db.select({ maxOrder: max(notes.order) })
        .from(notes)
        .where(and(
          eq(notes.userId, req.user.id),
          parentId ? eq(notes.parentId, parentId) : isNull(notes.parentId)
        ));
      
      noteOrder = (maxOrderResult[0]?.maxOrder || 0) + 1;
    }

    const updatedNote = await db.update(notes).set({
      parentId: parentId || null,
      order: noteOrder,
      updatedAt: new Date(),
    }).where(and(eq(notes.id, noteId), eq(notes.userId, req.user.id))).returning();

    if (updatedNote.length === 0) {
      return res.status(404).json({ message: 'Note not found' });
    }

    res.json(updatedNote[0]);
    
  } catch (error) {
    console.error('Move note to parent error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

const checkIfDescendant = async (noteId: string, potentialParentId: string, userId: string): Promise<boolean> => {
  const descendants = await db.select({ id: notes.id }).from(notes)
    .where(and(eq(notes.parentId, noteId), eq(notes.userId, userId)));
  
  for (const descendant of descendants) {
    if (descendant.id === potentialParentId) {
      return true;
    }
    
    const isChildDescendant = await checkIfDescendant(descendant.id, potentialParentId, userId);
    if (isChildDescendant) {
      return true;
    }
  }
  
  return false;
};

export const toggleFavorite = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'User not authenticated'
      });
    }

    const noteId = req.params.id;

    const note = await db.select().from(notes).where(and(eq(notes.id, noteId), eq(notes.userId, req.user.id)));
    if (note.length === 0) {
      return res.status(404).json({ message: 'Note not found' });
    }

    const existingFavorite = await db.select().from(favorites).where(and(eq(favorites.noteId, noteId), eq(favorites.userId, req.user.id)));

    if (existingFavorite.length > 0) {
      await db.delete(favorites).where(and(eq(favorites.noteId, noteId), eq(favorites.userId, req.user.id)));
      res.json({ isFavorite: false });
    } else {
      await db.insert(favorites).values({
        noteId,
        userId: req.user.id,
      });
      res.json({ isFavorite: true });
    }
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

export const getFavoriteNotes = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'User not authenticated'
      });
    }

    const favoriteNotes = await db.select({
      id: notes.id,
      title: notes.title,
      userId: notes.userId,
      parentId: notes.parentId,
      order: notes.order,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
      favoriteCreatedAt: favorites.createdAt,
    })
    .from(notes)
    .innerJoin(favorites, eq(favorites.noteId, notes.id))
    .where(and(eq(notes.userId, req.user.id), eq(favorites.userId, req.user.id)))
    .orderBy(desc(favorites.createdAt));

    res.json(favoriteNotes);
  } catch (error) {
    console.error('Get favorite notes error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

export const checkIfFavorite = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'User not authenticated'
      });
    }

    const noteId = req.params.id;
    
    const favorite = await db.select().from(favorites).where(and(eq(favorites.noteId, noteId), eq(favorites.userId, req.user.id)));
    
    res.json({ isFavorite: favorite.length > 0 });
  } catch (error) {
    console.error('Check if favorite error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

export const archiveNote = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'User not authenticated'
      });
    }

    const noteId = req.params.id;

    const archivedNote = await db.update(notes).set({
      archived: true,
      updatedAt: new Date(),
    }).where(and(eq(notes.id, noteId), eq(notes.userId, req.user.id))).returning();

    if (archivedNote.length === 0) {
      return res.status(404).json({ message: 'Note not found' });
    }

    res.json(archivedNote[0]);
  } catch (error) {
    console.error('Archive note error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

export const duplicateNote = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'User not authenticated'
      });
    }

    const noteId = req.params.id;

    const originalNote = await db.select().from(notes).where(and(eq(notes.id, noteId), eq(notes.userId, req.user.id)));
    
    if (originalNote.length === 0) {
      return res.status(404).json({ message: 'Note not found' });
    }

    const note = originalNote[0];

    const maxOrderResult = await db.select({ maxOrder: max(notes.order) })
      .from(notes)
      .where(and(
        eq(notes.userId, req.user.id),
        note.parentId ? eq(notes.parentId, note.parentId) : isNull(notes.parentId)
      ));
    
    const newOrder = (maxOrderResult[0]?.maxOrder || 0) + 1;

    const searchableContent = note.content ? extractTextFromBlockNote(note.content) : '';
    
    const duplicatedNote = await db.insert(notes).values({
      title: `${note.title} (Copy)`,
      content: note.content,
      searchableContent,
      parentId: note.parentId,
      order: newOrder,
      userId: req.user.id,
      archived: false,
    }).returning();

    res.status(201).json(duplicatedNote[0]);
  } catch (error) {
    console.error('Duplicate note error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

export const getRecentNotes = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'User not authenticated'
      });
    }

    const limit = parseInt(req.query.limit as string) || 5;
    const teamId = req.query.teamId as string | undefined;

    // Build where conditions
    const whereConditions = [
      eq(notes.userId, req.user.id),
      eq(notes.archived, false)
    ];

    // Filter by teamId: null for personal notes, specific teamId for team notes
    if (teamId && teamId !== 'undefined' && teamId !== 'null') {
      whereConditions.push(eq(notes.teamId, teamId));
    } else {
      whereConditions.push(isNull(notes.teamId));
    }

    const recentNotes = await db.select({
      id: notes.id,
      title: notes.title,
      content: notes.content,
      searchableContent: notes.searchableContent,
      userId: notes.userId,
      teamId: notes.teamId,
      parentId: notes.parentId,
      order: notes.order,
      archived: notes.archived,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
    })
    .from(notes)
    .where(and(...whereConditions))
    .orderBy(desc(notes.updatedAt))
    .limit(limit);

    // Add isFavorite field for each note
    const notesWithFavorites = await Promise.all(recentNotes.map(async (note) => {
      const favorite = await db.select().from(favorites)
        .where(and(eq(favorites.noteId, note.id), eq(favorites.userId, req.user!.id)));
      
      return {
        ...note,
        isFavorite: favorite.length > 0
      };
    }));

    res.json(notesWithFavorites);
  } catch (error) {
    console.error('Get recent notes error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};
