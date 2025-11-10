import { Request, Response } from 'express';
import { db } from '../db';
import {
  collections,
  collectionItems,
  collectionTasks,
  MAX_COLLECTION_ITEMS,
  createCollectionSchema,
  updateCollectionSchema,
  addCollectionItemSchema,
  createCollectionTaskSchema,
} from '../schema/collections-schema';
import { notes } from '../schema/notes-schema';
import { eq, and, desc, count, isNull } from 'drizzle-orm';
import {
  generateEmbeddingsForItem,
  deleteEmbeddingsForCollection,
  deleteEmbeddingsForItem,
} from '../services/embeddings-service';
import { executeCollectionTask } from '../services/collection-tasks-service';

/**
 * Create a new collection
 */
export async function createCollection(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const teamId = req.body.teamId;

    // Validate input
    const validatedData = createCollectionSchema.parse(req.body);

    const [collection] = await db.insert(collections).values({
      ...validatedData,
      userId,
      teamId: teamId || null,
    }).returning();

    res.json({
      success: true,
      data: collection,
    });
  } catch (error) {
    console.error('Error creating collection:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create collection',
    });
  }
}

/**
 * Get all collections for user (filtered by teamId)
 */
export async function getCollections(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const teamId = req.query.teamId as string | undefined;

    const whereConditions = [];

    if (teamId) {
      whereConditions.push(eq(collections.teamId, teamId));
    } else {
      whereConditions.push(isNull(collections.teamId));
      whereConditions.push(eq(collections.userId, userId));
    }

    const results = await db.select()
      .from(collections)
      .where(and(...whereConditions))
      .orderBy(desc(collections.updatedAt));

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch collections',
    });
  }
}

/**
 * Get a single collection with items
 */
export async function getCollection(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Get collection
    const collection = await db.select()
      .from(collections)
      .where(eq(collections.id, id))
      .limit(1);

    if (!collection || collection.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found',
      });
    }

    const collectionData = collection[0];

    // Check access
    if (collectionData.teamId) {
      // Team collection - check membership
      // TODO: Add team membership check
    } else if (collectionData.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No access to this collection',
      });
    }

    // Get items
    const items = await db.select()
      .from(collectionItems)
      .where(eq(collectionItems.collectionId, id))
      .orderBy(collectionItems.order);

    res.json({
      success: true,
      data: {
        collection: collectionData,
        items,
      },
    });
  } catch (error) {
    console.error('Error fetching collection:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch collection',
    });
  }
}

/**
 * Update a collection
 */
export async function updateCollection(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Validate input
    const validatedData = updateCollectionSchema.parse(req.body);

    // Check collection exists and user has access
    const collection = await db.select()
      .from(collections)
      .where(eq(collections.id, id))
      .limit(1);

    if (!collection || collection.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found',
      });
    }

    const collectionData = collection[0];

    if (collectionData.userId !== userId && !collectionData.teamId) {
      return res.status(403).json({
        success: false,
        message: 'No access to this collection',
      });
    }

    // Update collection
    const [updatedCollection] = await db.update(collections)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(collections.id, id))
      .returning();

    res.json({
      success: true,
      data: updatedCollection,
    });
  } catch (error) {
    console.error('Error updating collection:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update collection',
    });
  }
}

/**
 * Delete a collection
 */
export async function deleteCollection(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Check collection exists and user has access
    const collection = await db.select()
      .from(collections)
      .where(eq(collections.id, id))
      .limit(1);

    if (!collection || collection.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found',
      });
    }

    const collectionData = collection[0];

    if (collectionData.userId !== userId && !collectionData.teamId) {
      return res.status(403).json({
        success: false,
        message: 'No access to this collection',
      });
    }

    // Delete embeddings
    await deleteEmbeddingsForCollection(id);

    // Delete collection (cascade will delete items and tasks)
    await db.delete(collections).where(eq(collections.id, id));

    res.json({
      success: true,
      message: 'Collection deleted',
    });
  } catch (error) {
    console.error('Error deleting collection:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete collection',
    });
  }
}

/**
 * Add item to collection (with limit check)
 */
export async function addCollectionItem(req: Request, res: Response) {
  try {
    const { id: collectionId } = req.params;
    const userId = req.user!.id;
    const teamId = req.body.teamId;

    // Validate input
    const validatedData = addCollectionItemSchema.parse(req.body);

    // Check collection exists and user has access
    const collection = await db.select()
      .from(collections)
      .where(eq(collections.id, collectionId))
      .limit(1);

    if (!collection || collection.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found',
      });
    }

    // Check if limit exceeded
    const itemCount = await db.select({ count: count() })
      .from(collectionItems)
      .where(eq(collectionItems.collectionId, collectionId));

    if (itemCount[0].count >= MAX_COLLECTION_ITEMS) {
      return res.status(400).json({
        success: false,
        message: `Collection item limit reached (maximum ${MAX_COLLECTION_ITEMS} items)`,
      });
    }

    // If adding existing note, verify access
    if (validatedData.noteId) {
      const note = await db.select()
        .from(notes)
        .where(eq(notes.id, validatedData.noteId))
        .limit(1);

      if (!note || note.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Note not found',
        });
      }

      // Check note access
      const noteData = note[0];
      if (noteData.teamId) {
        // Team note - check team membership
        if (noteData.teamId !== teamId) {
          return res.status(403).json({
            success: false,
            message: 'No access to this note',
          });
        }
      } else if (noteData.userId !== userId) {
        // Personal note - check ownership
        return res.status(403).json({
          success: false,
          message: 'No access to this note',
        });
      }

      // Create collection item referencing note
      const [item] = await db.insert(collectionItems).values({
        collectionId,
        noteId: validatedData.noteId,
        sourceType: 'note',
        order: itemCount[0].count,
      }).returning();

      return res.json({
        success: true,
        data: item,
      });
    }

    // Create standalone content item
    const [item] = await db.insert(collectionItems).values({
      collectionId,
      title: validatedData.title,
      content: validatedData.content,
      searchableContent: validatedData.searchableContent,
      sourceType: validatedData.sourceType,
      sourceUrl: validatedData.sourceUrl,
      metadata: validatedData.metadata,
      order: itemCount[0].count,
    }).returning();

    res.json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error('Error adding collection item:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to add item',
    });
  }
}

/**
 * Remove item from collection
 */
export async function removeCollectionItem(req: Request, res: Response) {
  try {
    const { id: collectionId, itemId } = req.params;
    const userId = req.user!.id;

    // Check collection access
    const collection = await db.select()
      .from(collections)
      .where(eq(collections.id, collectionId))
      .limit(1);

    if (!collection || collection.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found',
      });
    }

    // Delete embeddings
    await deleteEmbeddingsForItem(itemId);

    // Delete item
    await db.delete(collectionItems)
      .where(and(
        eq(collectionItems.id, itemId),
        eq(collectionItems.collectionId, collectionId)
      ));

    res.json({
      success: true,
      message: 'Item removed',
    });
  } catch (error) {
    console.error('Error removing collection item:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to remove item',
    });
  }
}

/**
 * Generate embeddings for a collection item (async)
 */
export async function generateItemEmbeddings(req: Request, res: Response) {
  try {
    const { id: collectionId, itemId } = req.params;
    const userId = req.user!.id;
    const teamId = req.body.teamId;

    // Verify access to collection
    const collection = await db.select()
      .from(collections)
      .where(eq(collections.id, collectionId))
      .limit(1);

    if (!collection || collection.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found',
      });
    }

    // Start async embeddings generation (don't await)
    generateEmbeddingsForItem(collectionId, itemId, userId, teamId)
      .catch(error => {
        console.error('Background embeddings generation failed:', error);
      });

    // Return immediately
    res.json({
      success: true,
      message: 'Embeddings generation started',
    });
  } catch (error) {
    console.error('Error starting embeddings generation:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate embeddings',
    });
  }
}

/**
 * Get embeddings status for an item
 */
export async function getItemEmbeddingsStatus(req: Request, res: Response) {
  try {
    const { itemId } = req.params;

    const item = await db.select({
      hasEmbeddings: collectionItems.hasEmbeddings,
      embeddingsGeneratedAt: collectionItems.embeddingsGeneratedAt,
      embeddingsError: collectionItems.embeddingsError,
    })
      .from(collectionItems)
      .where(eq(collectionItems.id, itemId))
      .limit(1);

    if (!item || item.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    res.json({
      success: true,
      data: item[0],
    });
  } catch (error) {
    console.error('Error fetching embeddings status:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch status',
    });
  }
}

/**
 * Create a collection task
 */
export async function createTask(req: Request, res: Response) {
  try {
    const { id: collectionId } = req.params;
    const userId = req.user!.id;

    // Validate input
    const validatedData = createCollectionTaskSchema.parse(req.body);

    // Check collection access
    const collection = await db.select()
      .from(collections)
      .where(eq(collections.id, collectionId))
      .limit(1);

    if (!collection || collection.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found',
      });
    }

    // Create task
    const [task] = await db.insert(collectionTasks).values({
      collectionId,
      ...validatedData,
    }).returning();

    // Start async task execution
    executeCollectionTask(task.id)
      .catch(error => {
        console.error('Background task execution failed:', error);
      });

    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create task',
    });
  }
}

/**
 * Get all tasks for a collection
 */
export async function getTasks(req: Request, res: Response) {
  try {
    const { id: collectionId } = req.params;

    const tasks = await db.select()
      .from(collectionTasks)
      .where(eq(collectionTasks.collectionId, collectionId))
      .orderBy(desc(collectionTasks.createdAt));

    res.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch tasks',
    });
  }
}

/**
 * Get a single task
 */
export async function getTask(req: Request, res: Response) {
  try {
    const { taskId } = req.params;

    const task = await db.select()
      .from(collectionTasks)
      .where(eq(collectionTasks.id, taskId))
      .limit(1);

    if (!task || task.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    res.json({
      success: true,
      data: task[0],
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch task',
    });
  }
}

/**
 * Delete a task
 */
export async function deleteTask(req: Request, res: Response) {
  try {
    const { taskId } = req.params;

    await db.delete(collectionTasks)
      .where(eq(collectionTasks.id, taskId));

    res.json({
      success: true,
      message: 'Task deleted',
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete task',
    });
  }
}
