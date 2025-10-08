import { Request, Response } from 'express';
import { db } from '../db';
import { tags, createTagSchema } from '../schema/tasks-schema';
import { eq, asc, isNull } from 'drizzle-orm';

// Get all tags
export const getTags = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'User not authenticated'
      });
    }

    const teamId = req.query.teamId as string | undefined;

    // Filter by teamId: null for personal tags, specific teamId for team tags
    const whereCondition = teamId ? eq(tags.teamId, teamId) : isNull(tags.teamId);

    const allTags = await db
      .select()
      .from(tags)
      .where(whereCondition)
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
    const teamId = req.query.teamId as string | undefined;

    // Check if tag with same name already exists in the same context (team or personal)
    const whereCondition = teamId ? eq(tags.teamId, teamId) : isNull(tags.teamId);
    const existingTag = await db
      .select()
      .from(tags)
      .where(whereCondition);

    const nameExists = existingTag.some(tag => tag.name === name);
    if (nameExists) {
      return res.status(400).json({
        message: 'Tag with this name already exists'
      });
    }

    const newTag = await db.insert(tags).values({
      name,
      teamId: teamId || null
    }).returning();

    res.status(201).json(newTag[0]);
  } catch (error) {
    console.error('Create tag error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};