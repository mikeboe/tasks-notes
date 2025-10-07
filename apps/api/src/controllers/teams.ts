import { Request, Response } from 'express';
import { db } from '../db';
import {
  teams,
  teamMembers,
  createTeamSchema,
  updateTeamSchema,
  addTeamMemberSchema,
  updateTeamMemberSchema,
  type Team
} from '../schema/teams-schema';
import { users } from '../schema/auth-schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Create a new team
 * POST /api/teams
 */
export const createTeam = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const validation = createTeamSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.error.issues
      });
    }

    const { name, color, icon } = validation.data;

    // Create team and add creator as owner in a transaction
    const result = await db.transaction(async (tx) => {
      // Create the team
      const newTeam = await tx.insert(teams).values({
        name,
        color,
        icon,
        createdById: req.user!.id,
      }).returning();

      // Add creator as owner
      await tx.insert(teamMembers).values({
        teamId: newTeam[0].id,
        userId: req.user!.id,
        role: 'owner',
      });

      return newTeam[0];
    });

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get all teams for the authenticated user
 * GET /api/teams
 */
export const getTeams = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get all teams where user is a member
    const userTeams = await db
      .select({
        id: teams.id,
        name: teams.name,
        color: teams.color,
        icon: teams.icon,
        createdById: teams.createdById,
        createdAt: teams.createdAt,
        updatedAt: teams.updatedAt,
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
        memberCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM ${teamMembers} tm
          WHERE tm.team_id = ${teams.id}
        )`,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(eq(teamMembers.userId, req.user.id));

    res.json({
      success: true,
      data: userTeams
    });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get team details by ID
 * GET /api/teams/:teamId
 */
export const getTeamById = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get team details
    const team = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);

    if (!team.length) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Get all team members with user details
    const members = await db
      .select({
        userId: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId));

    res.json({
      success: true,
      data: {
        ...team[0],
        members,
      }
    });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Update team details
 * PUT /api/teams/:teamId
 */
export const updateTeam = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;

    const validation = updateTeamSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.error.issues
      });
    }

    const { name, color, icon } = validation.data;

    // Build update object with only provided fields
    const updateData: Partial<typeof teams.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;

    // Update team
    const updatedTeam = await db
      .update(teams)
      .set(updateData)
      .where(eq(teams.id, teamId))
      .returning();

    if (!updatedTeam.length) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    res.json({
      success: true,
      data: updatedTeam[0]
    });
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Delete a team
 * DELETE /api/teams/:teamId
 */
export const deleteTeam = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;

    // Delete team (cascades to members and related data)
    const deletedTeam = await db
      .delete(teams)
      .where(eq(teams.id, teamId))
      .returning();

    if (!deletedTeam.length) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    res.status(204).end();
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Add a member to a team
 * POST /api/teams/:teamId/members
 */
export const addTeamMember = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;

    const validation = addTeamMemberSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.error.issues
      });
    }

    const { user_id, email, role } = validation.data;

    // Find user by ID or email
    let targetUserId = user_id;

    if (!targetUserId && email) {
      const user = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user.length) {
        return res.status(404).json({
          success: false,
          message: 'User not found with that email'
        });
      }

      targetUserId = user[0].id;
    }

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'User ID or email is required'
      });
    }

    // Check if user is already a member
    const existingMember = await db
      .select()
      .from(teamMembers)
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, targetUserId)
      ))
      .limit(1);

    if (existingMember.length) {
      return res.status(409).json({
        success: false,
        message: 'User is already a member of this team'
      });
    }

    // Add member to team
    const newMember = await db.insert(teamMembers).values({
      teamId,
      userId: targetUserId,
      role: role || 'member',
    }).returning();

    res.status(201).json({
      success: true,
      data: newMember[0]
    });
  } catch (error) {
    console.error('Add team member error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get all members of a team
 * GET /api/teams/:teamId/members
 */
export const getTeamMembers = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;

    const members = await db
      .select({
        id: teamMembers.id,
        userId: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId));

    res.json({
      success: true,
      data: members
    });
  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Update a team member's role
 * PUT /api/teams/:teamId/members/:userId
 */
export const updateTeamMember = async (req: Request, res: Response) => {
  try {
    const { teamId, userId } = req.params;

    const validation = updateTeamMemberSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.error.issues
      });
    }

    const { role } = validation.data;

    // Update member role
    const updatedMember = await db
      .update(teamMembers)
      .set({ role })
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId)
      ))
      .returning();

    if (!updatedMember.length) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found'
      });
    }

    res.json({
      success: true,
      data: updatedMember[0]
    });
  } catch (error) {
    console.error('Update team member error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get teams for a specific user (admin only)
 * GET /api/teams/user/:userId
 */
export const getUserTeams = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get all teams where the specified user is a member
    const userTeams = await db
      .select({
        id: teams.id,
        name: teams.name,
        color: teams.color,
        icon: teams.icon,
        createdById: teams.createdById,
        createdAt: teams.createdAt,
        updatedAt: teams.updatedAt,
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(eq(teamMembers.userId, userId));

    res.json({
      success: true,
      data: userTeams
    });
  } catch (error) {
    console.error('Get user teams error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Remove a member from a team
 * DELETE /api/teams/:teamId/members/:userId
 */
export const removeTeamMember = async (req: Request, res: Response) => {
  try {
    const { teamId, userId } = req.params;

    // Check if user is removing themselves or has permission
    const isSelfRemoval = req.user?.id === userId;
    const hasPermission = req.teamMembership?.role === 'owner' || req.teamMembership?.role === 'admin';

    if (!isSelfRemoval && !hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to remove this member'
      });
    }

    // Get the user being removed to check their role
    const userBeingRemoved = await db
      .select({ role: teamMembers.role })
      .from(teamMembers)
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId)
      ))
      .limit(1);

    if (!userBeingRemoved.length) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found'
      });
    }

    // Prevent removing the last owner (only if the user being removed is an owner)
    if (userBeingRemoved[0].role === 'owner') {
      const ownerCount = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(teamMembers)
        .where(and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.role, 'owner')
        ));

      if (ownerCount[0].count <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot remove the last owner of the team'
        });
      }
    }

    // Remove member
    const deleted = await db
      .delete(teamMembers)
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId)
      ))
      .returning();

    if (!deleted.length) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found'
      });
    }

    res.status(204).end();
  } catch (error) {
    console.error('Remove team member error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
