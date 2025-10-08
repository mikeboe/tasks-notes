import { Request, Response } from 'express';
import { db } from '../db';
import {
  tasks,
  taskStages,
  taskAssignees,
  taskTags,
  taskComments,
  taskChecklistItems,
  taskLinkedNotes,
  tags,
  createTaskSchema,
  updateTaskSchema,
  getTasksQuerySchema,
  createTaskCommentSchema
} from '../schema/tasks-schema';
import { users } from '../schema/auth-schema';
import { notes } from '../schema/notes-schema';
import { teamMembers } from '../schema/teams-schema';
import { eq, and, inArray, desc, asc, isNull } from 'drizzle-orm';

// Get all tasks with optional filters
export const getTasks = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'User not authenticated'
      });
    }

    const validation = getTasksQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.error.issues
      });
    }

    const { assignee_id, priority, status_id } = validation.data;
    const teamId = req.query.teamId as string | undefined;

    // Apply filters
    const conditions = [];

    // Filter by teamId: null for personal tasks, specific teamId for team tasks
    if (teamId) {
      // Verify user is a member of the team
      const membership = await db.select()
        .from(teamMembers)
        .where(and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, req.user.id)
        ))
        .limit(1);

      if (!membership.length) {
        return res.status(403).json({
          message: 'You are not a member of this team'
        });
      }

      // Return all tasks for this team (created by any team member)
      conditions.push(eq(tasks.teamId, teamId));
    } else {
      // Return personal tasks (only created by the user)
      conditions.push(isNull(tasks.teamId));
      conditions.push(eq(tasks.createdById, req.user.id));
    }

    if (priority) {
      conditions.push(eq(tasks.priority, priority));
    }

    if (status_id) {
      conditions.push(eq(tasks.statusId, status_id));
    }

    const userTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        isCompleted: tasks.isCompleted,
        createdById: tasks.createdById,
        priority: tasks.priority,
        statusId: tasks.statusId,
        notes: tasks.notes,
        startDate: tasks.startDate,
        endDate: tasks.endDate,
        teamId: tasks.teamId,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .where(and(...conditions))
      .orderBy(desc(tasks.createdAt));

    // If assignee filter is specified, also include tasks assigned to that user
    if (assignee_id) {
      const assignedTasks = await db
        .select({
          id: tasks.id,
          title: tasks.title,
          isCompleted: tasks.isCompleted,
          createdById: tasks.createdById,
          priority: tasks.priority,
          statusId: tasks.statusId,
          notes: tasks.notes,
          startDate: tasks.startDate,
          endDate: tasks.endDate,
          teamId: tasks.teamId,
          createdAt: tasks.createdAt,
          updatedAt: tasks.updatedAt,
        })
        .from(tasks)
        .innerJoin(taskAssignees, eq(tasks.id, taskAssignees.taskId))
        .where(and(
          eq(taskAssignees.userId, assignee_id),
          ...(priority ? [eq(tasks.priority, priority)] : []),
          ...(status_id ? [eq(tasks.statusId, status_id)] : [])
        ))
        .orderBy(desc(tasks.createdAt));

      // Merge and deduplicate tasks
      const allTasks = [...userTasks];
      assignedTasks.forEach(assignedTask => {
        if (!allTasks.some(task => task.id === assignedTask.id)) {
          allTasks.push(assignedTask);
        }
      });
      
      // Get additional data for tasks
      const tasksWithData = await Promise.all(allTasks.map(async (task) => {
        const [assignees, taskTagsData, comments, linkedNotes, status, createdBy] = await Promise.all([
          db.select({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
          })
          .from(taskAssignees)
          .innerJoin(users, eq(taskAssignees.userId, users.id))
          .where(eq(taskAssignees.taskId, task.id)),

          db.select({
            id: tags.id,
            name: tags.name,
          })
          .from(taskTags)
          .innerJoin(tags, eq(taskTags.tagId, tags.id))
          .where(eq(taskTags.taskId, task.id)),

          db.select({
            id: taskComments.id,
            content: taskComments.content,
            createdAt: taskComments.createdAt,
            user: {
              id: users.id,
              name: users.firstName,
              email: users.email
            }
          })
          .from(taskComments)
          .innerJoin(users, eq(taskComments.userId, users.id))
          .where(eq(taskComments.taskId, task.id))
          .orderBy(asc(taskComments.createdAt)),

          db.select({
            id: notes.id,
            title: notes.title,
          })
          .from(taskLinkedNotes)
          .innerJoin(notes, eq(taskLinkedNotes.noteId, notes.id))
          .where(eq(taskLinkedNotes.taskId, task.id)),

          db.select().from(taskStages).where(eq(taskStages.id, task.statusId)).then(res => res[0]),

          db.select({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
          }).from(users).where(eq(users.id, task.createdById)).then(res => res[0])
        ]);

        return {
          ...task,
          assignees: assignees.map(user => ({
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email
          })),
          tags: taskTagsData,
          comments: comments.map(comment => ({
            id: comment.id,
            content: comment.content,
            created_at: comment.createdAt,
            user: {
              id: comment.user.id,
              name: comment.user.name,
              email: comment.user.email
            }
          })),
          linked_notes: linkedNotes,
          status,
          created_by: createdBy ? {
            id: createdBy.id,
            name: `${createdBy.firstName} ${createdBy.lastName}`,
            email: createdBy.email
          } : null
        };
      }));

      return res.json(tasksWithData);
    }

    // Get additional data for user tasks
    const tasksWithData = await Promise.all(userTasks.map(async (task) => {
      const [assignees, taskTagsData, comments, linkedNotes, status, createdBy] = await Promise.all([
        db.select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(taskAssignees)
        .innerJoin(users, eq(taskAssignees.userId, users.id))
        .where(eq(taskAssignees.taskId, task.id)),

        db.select({
          id: tags.id,
          name: tags.name,
        })
        .from(taskTags)
        .innerJoin(tags, eq(taskTags.tagId, tags.id))
        .where(eq(taskTags.taskId, task.id)),

        db.select({
          id: taskComments.id,
          content: taskComments.content,
          createdAt: taskComments.createdAt,
          user: {
            id: users.id,
            name: users.firstName,
            email: users.email
          }
        })
        .from(taskComments)
        .innerJoin(users, eq(taskComments.userId, users.id))
        .where(eq(taskComments.taskId, task.id))
        .orderBy(asc(taskComments.createdAt)),

        db.select({
          id: notes.id,
          title: notes.title,
        })
        .from(taskLinkedNotes)
        .innerJoin(notes, eq(taskLinkedNotes.noteId, notes.id))
        .where(eq(taskLinkedNotes.taskId, task.id)),

        db.select().from(taskStages).where(eq(taskStages.id, task.statusId)).then(res => res[0]),

        db.select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        }).from(users).where(eq(users.id, task.createdById)).then(res => res[0])
      ]);

      return {
        ...task,
        assignees: assignees.map(user => ({
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email
        })),
        tags: taskTagsData,
        comments: comments.map(comment => ({
          id: comment.id,
          content: comment.content,
          created_at: comment.createdAt,
          user: {
            id: comment.user.id,
            name: comment.user.name,
            email: comment.user.email
          }
        })),
        linked_notes: linkedNotes,
        status,
        created_by: createdBy ? {
          id: createdBy.id,
          name: `${createdBy.firstName} ${createdBy.lastName}`,
          email: createdBy.email
        } : null
      };
    }));

    res.json(tasksWithData);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

// Get task by ID with all related data
export const getTaskById = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'User not authenticated'
      });
    }

    const taskId = req.params.id;

    const task = await db.select().from(tasks).where(eq(tasks.id, taskId));

    if (task.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has access to this task (creator or assignee)
    const isAssignee = await db
      .select()
      .from(taskAssignees)
      .where(and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, req.user.id)));

    if (task[0].createdById !== req.user.id && isAssignee.length === 0) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get all related data
    const [assignees, taskTagsData, comments, checklist, linkedNotes, status, createdBy] = await Promise.all([
      db.select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(taskAssignees)
      .innerJoin(users, eq(taskAssignees.userId, users.id))
      .where(eq(taskAssignees.taskId, taskId)),

      db.select({
        id: tags.id,
        name: tags.name,
      })
      .from(taskTags)
      .innerJoin(tags, eq(taskTags.tagId, tags.id))
      .where(eq(taskTags.taskId, taskId)),

      db.select({
        id: taskComments.id,
        content: taskComments.content,
        createdAt: taskComments.createdAt,
        user: {
          id: users.id,
          name: users.firstName,
          email: users.email
        }
      })
      .from(taskComments)
      .innerJoin(users, eq(taskComments.userId, users.id))
      .where(eq(taskComments.taskId, taskId))
      .orderBy(asc(taskComments.createdAt)),

      db.select()
      .from(taskChecklistItems)
      .where(eq(taskChecklistItems.taskId, taskId))
      .orderBy(asc(taskChecklistItems.order)),

      db.select({
        id: notes.id,
        title: notes.title,
      })
      .from(taskLinkedNotes)
      .innerJoin(notes, eq(taskLinkedNotes.noteId, notes.id))
      .where(eq(taskLinkedNotes.taskId, taskId)),

      db.select().from(taskStages).where(eq(taskStages.id, task[0].statusId)).then(res => res[0]),

      db.select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      }).from(users).where(eq(users.id, task[0].createdById)).then(res => res[0])
    ]);

    const taskWithData = {
      ...task[0],
      assignees: assignees.map(user => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email
      })),
      tags: taskTagsData,
      comments: comments.map(comment => ({
        id: comment.id,
        content: comment.content,
        created_at: comment.createdAt,
        user: {
          id: comment.user.id,
          name: comment.user.name,
          email: comment.user.email
        }
      })),
      checklist,
      linked_notes: linkedNotes,
      status,
      created_by: createdBy ? {
        id: createdBy.id,
        name: `${createdBy.firstName} ${createdBy.lastName}`,
        email: createdBy.email
      } : null
    };

    res.json(taskWithData);
  } catch (error) {
    console.error('Get task by id error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

// Create new task
export const createTask = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'User not authenticated'
      });
    }

    const validation = createTaskSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.error.issues
      });
    }

    const { title, status_id, priority, assigned_to_ids, tag_ids, notes, start_date, end_date, linked_note_ids } = validation.data;
    const teamId = req.query.teamId as string | undefined;

    // Verify status exists
    const statusExists = await db.select().from(taskStages).where(eq(taskStages.id, status_id));
    if (statusExists.length === 0) {
      return res.status(400).json({ message: 'Invalid status_id' });
    }

    // Create task
    const newTask = await db.insert(tasks).values({
      title,
      statusId: status_id,
      priority,
      notes,
      startDate: start_date ? new Date(start_date) : undefined,
      endDate: end_date ? new Date(end_date) : undefined,
      createdById: req.user.id,
      teamId: teamId || null,
    }).returning();

    const taskId = newTask[0].id;

    // Handle assignees
    if (assigned_to_ids.length > 0) {
      await db.insert(taskAssignees).values(
        assigned_to_ids.map(userId => ({
          taskId,
          userId
        }))
      );
    }

    // Handle tags
    if (tag_ids.length > 0) {
      await db.insert(taskTags).values(
        tag_ids.map(tagId => ({
          taskId,
          tagId
        }))
      );
    }

    // Handle linked notes
    if (linked_note_ids && linked_note_ids.length > 0) {
      await db.insert(taskLinkedNotes).values(
        linked_note_ids.map(noteId => ({
          taskId,
          noteId
        }))
      );
    }

    // Return created task data
    res.status(201).json(newTask[0]);
    
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

// Update task
export const updateTask = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'User not authenticated'
      });
    }

    const taskId = req.params.id;
    const validation = updateTaskSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.error.issues
      });
    }

    const { title, priority, status_id, assigned_to_ids, tag_ids, notes, start_date, end_date, is_completed, linked_note_ids } = validation.data;

    // Check task exists and user has access
    const existingTask = await db.select().from(tasks).where(eq(tasks.id, taskId));
    if (existingTask.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has access to this task (creator or assignee)
    const isAssignee = await db
      .select()
      .from(taskAssignees)
      .where(and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, req.user.id)));

    if (existingTask[0].createdById !== req.user.id && isAssignee.length === 0) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update task
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updateData.title = title;
    if (priority !== undefined) updateData.priority = priority;
    if (status_id !== undefined) updateData.statusId = status_id;
    if (notes !== undefined) updateData.notes = notes;
    if (start_date !== undefined) updateData.startDate = start_date ? new Date(start_date) : null;
    if (end_date !== undefined) updateData.endDate = end_date ? new Date(end_date) : null;
    if (is_completed !== undefined) updateData.isCompleted = is_completed;

    await db.update(tasks).set(updateData).where(eq(tasks.id, taskId));

    // Update assignees
    if (assigned_to_ids !== undefined) {
      await db.delete(taskAssignees).where(eq(taskAssignees.taskId, taskId));
      if (assigned_to_ids.length > 0) {
        await db.insert(taskAssignees).values(
          assigned_to_ids.map(userId => ({
            taskId,
            userId
          }))
        );
      }
    }

    // Update tags
    if (tag_ids !== undefined) {
      await db.delete(taskTags).where(eq(taskTags.taskId, taskId));
      if (tag_ids.length > 0) {
        await db.insert(taskTags).values(
          tag_ids.map(tagId => ({
            taskId,
            tagId
          }))
        );
      }
    }

    // Update linked notes
    if (linked_note_ids !== undefined) {
      await db.delete(taskLinkedNotes).where(eq(taskLinkedNotes.taskId, taskId));
      if (linked_note_ids.length > 0) {
        await db.insert(taskLinkedNotes).values(
          linked_note_ids.map(noteId => ({
            taskId,
            noteId
          }))
        );
      }
    }

    // Return updated task data
    const updatedTask = await db.select().from(tasks).where(eq(tasks.id, taskId));
    res.json(updatedTask[0]);

  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

// Delete task
export const deleteTask = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'User not authenticated'
      });
    }

    const taskId = req.params.id;

    const task = await db.select().from(tasks).where(eq(tasks.id, taskId));
    if (task.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Only creator can delete task
    if (task[0].createdById !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await db.delete(tasks).where(eq(tasks.id, taskId));

    res.status(204).end();
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

// Add comment to task
export const addTaskComment = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'User not authenticated'
      });
    }

    const taskId = req.params.id;
    const validation = createTaskCommentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.error.issues
      });
    }

    const { content } = validation.data;

    // Check task exists and user has access
    const task = await db.select().from(tasks).where(eq(tasks.id, taskId));
    if (task.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has access to this task (creator or assignee)
    const isAssignee = await db
      .select()
      .from(taskAssignees)
      .where(and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, req.user.id)));

    if (task[0].createdById !== req.user.id && isAssignee.length === 0) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Create comment
    const newComment = await db.insert(taskComments).values({
      taskId,
      userId: req.user.id,
      content,
    }).returning();

    // Return comment with user data
    const commentWithUser = await db
      .select({
        id: taskComments.id,
        content: taskComments.content,
        createdAt: taskComments.createdAt,
        user: {
          id: users.id,
          name: users.firstName,
          email: users.email
        }
      })
      .from(taskComments)
      .innerJoin(users, eq(taskComments.userId, users.id))
      .where(eq(taskComments.id, newComment[0].id));

    res.status(201).json(commentWithUser[0]);

  } catch (error) {
    console.error('Add task comment error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

// Get assignable users (users that can be assigned to tasks)
export const getAssignableUsers = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'User not authenticated'
      });
    }

    // For now, get all users except the current user
    // In a more complex system, this might be filtered by organization, team, etc.
    const assignableUsers = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
    }).from(users);

    res.json(assignableUsers);
  } catch (error) {
    console.error('Get assignable users error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

// Get tasks assigned to the current user
export const getAssignedTasks = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'User not authenticated'
      });
    }

    const teamId = req.query.teamId as string | undefined;

    // If teamId is provided, verify user is a member of the team
    if (teamId && teamId !== 'undefined' && teamId !== 'null') {
      const membership = await db.select()
        .from(teamMembers)
        .where(and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, req.user.id)
        ))
        .limit(1);

      if (!membership.length) {
        return res.status(403).json({
          message: 'You are not a member of this team'
        });
      }
    }

    const assignedTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        isCompleted: tasks.isCompleted,
        createdById: tasks.createdById,
        priority: tasks.priority,
        statusId: tasks.statusId,
        notes: tasks.notes,
        startDate: tasks.startDate,
        endDate: tasks.endDate,
        teamId: tasks.teamId,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .innerJoin(taskAssignees, eq(tasks.id, taskAssignees.taskId))
      .where(
        teamId && teamId !== 'undefined' && teamId !== 'null'
          ? and(eq(taskAssignees.userId, req.user.id), eq(tasks.teamId, teamId))
          : and(eq(taskAssignees.userId, req.user.id), isNull(tasks.teamId))
      )
      .orderBy(desc(tasks.updatedAt));

    // Get additional data for each task
    const tasksWithData = await Promise.all(assignedTasks.map(async (task) => {
      const [assignees, taskTagsData, status, createdBy] = await Promise.all([
        db.select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(taskAssignees)
        .innerJoin(users, eq(taskAssignees.userId, users.id))
        .where(eq(taskAssignees.taskId, task.id)),

        db.select({
          id: tags.id,
          name: tags.name,
        })
        .from(taskTags)
        .innerJoin(tags, eq(taskTags.tagId, tags.id))
        .where(eq(taskTags.taskId, task.id)),

        db.select({
          id: taskStages.id,
          name: taskStages.name,
          order: taskStages.order,
        })
        .from(taskStages)
        .where(eq(taskStages.id, task.statusId)),

        db.select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(users)
        .where(eq(users.id, task.createdById))
      ]);

      return {
        ...task,
        assignees,
        tags: taskTagsData,
        status: status[0] || null,
        created_by: createdBy[0] || null,
      };
    }));

    res.json(tasksWithData);
  } catch (error) {
    console.error('Get assigned tasks error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};