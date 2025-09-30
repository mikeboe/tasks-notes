import { Request, Response } from 'express';
import { db } from '../db';
import { 
  taskStages, 
  tasks,
  createTaskStageSchema, 
  updateTaskStageSchema,
  updateTaskStageOrderSchema 
} from '../schema/tasks-schema';
import { eq, and, asc, isNull } from 'drizzle-orm';

// Get all task stages
export const getTaskStages = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'User not authenticated'
      });
    }

    // Get user stages and default stages (where organizationId is null)
    const stages = await db
      .select()
      .from(taskStages)
      .where(isNull(taskStages.organizationId)) // For now, only default stages
      .orderBy(asc(taskStages.order));

    res.json(stages);
  } catch (error) {
    console.error('Get task stages error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

// Create new task stage
export const createTaskStage = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'User not authenticated'
      });
    }

    const validation = createTaskStageSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.error.issues
      });
    }

    const { name } = validation.data;

    // Get the current max order to append the new stage at the end
    const maxOrderResult = await db
      .select({ maxOrder: taskStages.order })
      .from(taskStages)
      .where(isNull(taskStages.organizationId))
      .orderBy(taskStages.order)
      .limit(1);

    const maxOrder = maxOrderResult.length > 0 
      ? Math.max(...maxOrderResult.map(r => r.maxOrder)) 
      : -1;

    const newStage = await db.insert(taskStages).values({
      name,
      order: maxOrder + 1,
      organizationId: null // For now, all stages are default
    }).returning();

    res.status(201).json(newStage[0]);
  } catch (error) {
    console.error('Create task stage error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

// Update task stage order
export const updateTaskStageOrder = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'User not authenticated'
      });
    }

    const validation = updateTaskStageOrderSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.error.issues
      });
    }

    const { stage_ids } = validation.data;

    // Update the order of each stage
    const updatePromises = stage_ids.map((stageId, index) =>
      db.update(taskStages)
        .set({ 
          order: index,
          updatedAt: new Date()
        })
        .where(and(
          eq(taskStages.id, stageId),
          isNull(taskStages.organizationId) // Only allow reordering default stages for now
        ))
    );

    await Promise.all(updatePromises);

    res.json({ success: true });
  } catch (error) {
    console.error('Update task stage order error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

// Update task stage name
export const updateTaskStage = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'User not authenticated'
      });
    }

    const stageId = req.params.id;
    const validation = updateTaskStageSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.error.issues
      });
    }

    const { name } = validation.data;

    const updatedStage = await db.update(taskStages).set({
      name,
      updatedAt: new Date(),
    }).where(and(
      eq(taskStages.id, stageId),
      isNull(taskStages.organizationId) // Only allow updating default stages for now
    )).returning();

    if (updatedStage.length === 0) {
      return res.status(404).json({ message: 'Task stage not found' });
    }

    res.json(updatedStage[0]);
  } catch (error) {
    console.error('Update task stage error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

// Delete task stage
export const deleteTaskStage = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'User not authenticated'
      });
    }

    const stageId = req.params.id;

    // Check if stage exists
    const stage = await db.select().from(taskStages).where(eq(taskStages.id, stageId));
    if (stage.length === 0) {
      return res.status(404).json({ message: 'Task stage not found' });
    }

    // Check if there are tasks using this stage
    const tasksUsingStage = await db.select().from(tasks).where(eq(tasks.statusId, stageId));
    if (tasksUsingStage.length > 0) {
      // Move tasks to the first available stage (default behavior)
      const firstStage = await db
        .select()
        .from(taskStages)
        .where(isNull(taskStages.organizationId))
        .orderBy(asc(taskStages.order))
        .limit(1);

      if (firstStage.length > 0 && firstStage[0].id !== stageId) {
        await db.update(tasks)
          .set({ 
            statusId: firstStage[0].id,
            updatedAt: new Date()
          })
          .where(eq(tasks.statusId, stageId));
      } else {
        return res.status(400).json({ 
          message: 'Cannot delete stage: tasks are using it and no alternative stage is available' 
        });
      }
    }

    await db.delete(taskStages).where(eq(taskStages.id, stageId));

    res.status(204).end();
  } catch (error) {
    console.error('Delete task stage error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};