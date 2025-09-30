import { Request, Response } from 'express';
import { db } from '../db';
import { tags, createTagSchema } from '../schema/tasks-schema';
import { eq, asc } from 'drizzle-orm';

// Get all tags
export const getTags = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'User not authenticated'
      });
    }

    // Get default tags (where organizationId is null)
    const allTags = await db
      .select()
      .from(tags)
      .orderBy(asc(tags.name));

    res.json(allTags);
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

// Create new tag
export const createTag = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'User not authenticated'
      });
    }

    const validation = createTagSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.error.issues
      });
    }

    const { name } = validation.data;

    // Check if tag with same name already exists
    const existingTag = await db
      .select()
      .from(tags)
      .where(eq(tags.name, name));

    if (existingTag.length > 0) {
      return res.status(400).json({
        message: 'Tag with this name already exists'
      });
    }

    const newTag = await db.insert(tags).values({
      name,
      organizationId: null // For now, all tags are default
    }).returning();

    res.status(201).json(newTag[0]);
  } catch (error) {
    console.error('Create tag error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};