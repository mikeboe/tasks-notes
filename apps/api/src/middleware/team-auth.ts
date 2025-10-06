import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { teamMembers, type TeamMember } from '../schema/teams-schema';
import { eq, and } from 'drizzle-orm';

// Extend Express Request type to include team membership
declare global {
  namespace Express {
    interface Request {
      teamMembership?: TeamMember;
    }
  }
}

/**
 * Middleware to verify user is a member of the team specified in route params
 * Sets req.teamMembership if user is a member
 */
export const requireTeamMember = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const teamId = req.params.teamId;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Team ID is required'
      });
    }

    // Check if user is a member of this team
    const membership = await db.select()
      .from(teamMembers)
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId)
      ))
      .limit(1);

    if (!membership.length) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this team'
      });
    }

    // Attach membership to request for downstream use
    req.teamMembership = membership[0];
    next();
  } catch (error) {
    console.error('Team membership verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Middleware to verify user has admin or owner role in the team
 * Must be used after requireTeamMember
 */
export const requireTeamAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.teamMembership) {
    return res.status(403).json({
      success: false,
      message: 'Team membership verification required'
    });
  }

  const role = req.teamMembership.role;

  if (role !== 'owner' && role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin or owner role required for this action'
    });
  }

  next();
};

/**
 * Middleware to verify user is the owner of the team
 * Must be used after requireTeamMember
 */
export const requireTeamOwner = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.teamMembership) {
    return res.status(403).json({
      success: false,
      message: 'Team membership verification required'
    });
  }

  if (req.teamMembership.role !== 'owner') {
    return res.status(403).json({
      success: false,
      message: 'Owner role required for this action'
    });
  }

  next();
};
