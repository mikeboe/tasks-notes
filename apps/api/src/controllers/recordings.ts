import { Request, Response } from 'express';
import { db } from '../db';
import { recordings, createRecordingRequestSchema, updateRecordingSchema, recordingSearchSchema } from '../schema/recordings-schema';
import { teamMembers } from '../schema/teams-schema';
import { assets } from '../schema/assets-schema';
import { eq, and, desc, count, isNull } from 'drizzle-orm';
import { randomBytes } from 'crypto';

// Generate a unique share token
const generateShareToken = (): string => {
  return randomBytes(16).toString('hex');
};

export const createRecording = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const validation = createRecordingRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.error.issues
      });
    }

    const { assetId, title, description, thumbnailUrl, duration, isPublic, settings, teamId } = validation.data;

    // Verify the asset belongs to the user
    const [asset] = await db
      .select()
      .from(assets)
      .where(and(eq(assets.id, assetId), eq(assets.uploaderId, req.user.id)));

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found or you do not have permission to use it'
      });
    }

    // If teamId is provided, verify the user is a member of the team
    if (teamId) {
      const membership = await db.select()
        .from(teamMembers)
        .where(and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, req.user.id)
        ))
        .limit(1);

      if (!membership.length) {
        return res.status(403).json({
          success: false,
          message: 'You are not a member of this team'
        });
      }
    }

    // Generate share token if public
    const shareToken = isPublic ? generateShareToken() : null;

    const [newRecording] = await db.insert(recordings).values({
      userId: req.user.id,
      teamId: teamId || null,
      assetId,
      title,
      description: description || null,
      thumbnailUrl: thumbnailUrl || null,
      duration,
      isPublic: isPublic || false,
      shareToken,
      settings: settings ? JSON.stringify(settings) : null,
      viewCount: 0,
    }).returning();

    res.status(201).json({
      success: true,
      data: newRecording
    });
  } catch (error) {
    console.error('Create recording error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getRecordings = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const queryParams = recordingSearchSchema.parse(req.query);

    // Build where conditions
    const whereConditions = [];

    // Filter by teamId: null for personal recordings, specific teamId for team recordings
    if (queryParams.teamId) {
      // Verify user is a member of the team
      const membership = await db.select()
        .from(teamMembers)
        .where(and(
          eq(teamMembers.teamId, queryParams.teamId),
          eq(teamMembers.userId, req.user.id)
        ))
        .limit(1);

      if (!membership.length) {
        return res.status(403).json({
          success: false,
          message: 'You are not a member of this team'
        });
      }

      whereConditions.push(eq(recordings.teamId, queryParams.teamId));
    } else {
      // Return personal recordings (only created by the user)
      whereConditions.push(isNull(recordings.teamId));
      whereConditions.push(eq(recordings.userId, req.user.id));
    }

    if (queryParams.isPublic !== undefined) {
      whereConditions.push(eq(recordings.isPublic, queryParams.isPublic));
    }

    // Calculate offset for pagination
    const offset = (queryParams.page - 1) * queryParams.limit;

    // Fetch recordings with associated asset information
    const userRecordings = await db
      .select({
        id: recordings.id,
        userId: recordings.userId,
        teamId: recordings.teamId,
        assetId: recordings.assetId,
        title: recordings.title,
        description: recordings.description,
        thumbnailUrl: recordings.thumbnailUrl,
        duration: recordings.duration,
        isPublic: recordings.isPublic,
        shareToken: recordings.shareToken,
        settings: recordings.settings,
        viewCount: recordings.viewCount,
        createdAt: recordings.createdAt,
        updatedAt: recordings.updatedAt,
        asset: {
          s3Url: assets.s3Url,
          fileSize: assets.fileSize,
          mimeType: assets.mimeType,
        }
      })
      .from(recordings)
      .leftJoin(assets, eq(recordings.assetId, assets.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(recordings.createdAt))
      .limit(queryParams.limit)
      .offset(offset);

    // Get total count for pagination
    const [{ count: totalCount }] = await db
      .select({ count: count(recordings.id) })
      .from(recordings)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    res.json({
      success: true,
      data: {
        recordings: userRecordings,
        pagination: {
          page: queryParams.page,
          limit: queryParams.limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / queryParams.limit),
        },
      },
    });
  } catch (error) {
    console.error('Get recordings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getRecording = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Fetch recording with associated asset information
    const [recording] = await db
      .select({
        id: recordings.id,
        userId: recordings.userId,
        teamId: recordings.teamId,
        assetId: recordings.assetId,
        title: recordings.title,
        description: recordings.description,
        thumbnailUrl: recordings.thumbnailUrl,
        duration: recordings.duration,
        isPublic: recordings.isPublic,
        shareToken: recordings.shareToken,
        settings: recordings.settings,
        viewCount: recordings.viewCount,
        createdAt: recordings.createdAt,
        updatedAt: recordings.updatedAt,
        asset: {
          s3Url: assets.s3Url,
          fileSize: assets.fileSize,
          mimeType: assets.mimeType,
        }
      })
      .from(recordings)
      .leftJoin(assets, eq(recordings.assetId, assets.id))
      .where(eq(recordings.id, id));

    if (!recording) {
      return res.status(404).json({
        success: false,
        message: 'Recording not found'
      });
    }

    // Check if user has permission to view this recording
    if (!req.user) {
      // No user logged in - only allow if recording is public
      if (!recording.isPublic) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required to view this recording'
        });
      }
    } else {
      // User is logged in
      const isOwner = recording.userId === req.user.id;
      const isPublic = recording.isPublic;

      // Check team membership if it's a team recording
      let hasTeamAccess = false;
      if (recording.teamId) {
        const membership = await db.select()
          .from(teamMembers)
          .where(and(
            eq(teamMembers.teamId, recording.teamId),
            eq(teamMembers.userId, req.user.id)
          ))
          .limit(1);
        hasTeamAccess = membership.length > 0;
      }

      if (!isOwner && !isPublic && !hasTeamAccess) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this recording'
        });
      }
    }

    res.json({
      success: true,
      data: recording
    });
  } catch (error) {
    console.error('Get recording error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getPublicRecording = async (req: Request, res: Response) => {
  try {
    const { shareToken } = req.params;

    // Fetch recording by share token
    const [recording] = await db
      .select({
        id: recordings.id,
        userId: recordings.userId,
        teamId: recordings.teamId,
        assetId: recordings.assetId,
        title: recordings.title,
        description: recordings.description,
        thumbnailUrl: recordings.thumbnailUrl,
        duration: recordings.duration,
        isPublic: recordings.isPublic,
        shareToken: recordings.shareToken,
        settings: recordings.settings,
        viewCount: recordings.viewCount,
        createdAt: recordings.createdAt,
        updatedAt: recordings.updatedAt,
        asset: {
          s3Url: assets.s3Url,
          fileSize: assets.fileSize,
          mimeType: assets.mimeType,
        }
      })
      .from(recordings)
      .leftJoin(assets, eq(recordings.assetId, assets.id))
      .where(and(
        eq(recordings.shareToken, shareToken),
        eq(recordings.isPublic, true)
      ));

    if (!recording) {
      return res.status(404).json({
        success: false,
        message: 'Recording not found or is not public'
      });
    }

    res.json({
      success: true,
      data: recording
    });
  } catch (error) {
    console.error('Get public recording error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const updateRecording = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { id } = req.params;
    const validation = updateRecordingSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.error.issues
      });
    }

    const { title, description, thumbnailUrl, isPublic, settings } = validation.data;

    // Check if recording exists and user is the owner
    const [existingRecording] = await db
      .select()
      .from(recordings)
      .where(eq(recordings.id, id));

    if (!existingRecording) {
      return res.status(404).json({
        success: false,
        message: 'Recording not found'
      });
    }

    if (existingRecording.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this recording'
      });
    }

    // If changing to public and no share token exists, generate one
    let shareToken = existingRecording.shareToken;
    if (isPublic && !shareToken) {
      shareToken = generateShareToken();
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (thumbnailUrl !== undefined) updateData.thumbnailUrl = thumbnailUrl;
    if (isPublic !== undefined) {
      updateData.isPublic = isPublic;
      updateData.shareToken = shareToken;
    }
    if (settings !== undefined) updateData.settings = JSON.stringify(settings);

    const [updatedRecording] = await db
      .update(recordings)
      .set(updateData)
      .where(eq(recordings.id, id))
      .returning();

    res.json({
      success: true,
      data: updatedRecording
    });
  } catch (error) {
    console.error('Update recording error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const deleteRecording = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { id } = req.params;

    // Check if recording exists and user is the owner
    const [recording] = await db
      .select()
      .from(recordings)
      .where(eq(recordings.id, id));

    if (!recording) {
      return res.status(404).json({
        success: false,
        message: 'Recording not found'
      });
    }

    if (recording.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this recording'
      });
    }

    // Delete the recording (asset will be handled by cascade or separately)
    await db
      .delete(recordings)
      .where(eq(recordings.id, id));

    res.json({
      success: true,
      message: 'Recording deleted successfully'
    });
  } catch (error) {
    console.error('Delete recording error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const incrementViewCount = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [recording] = await db
      .select()
      .from(recordings)
      .where(eq(recordings.id, id));

    if (!recording) {
      return res.status(404).json({
        success: false,
        message: 'Recording not found'
      });
    }

    // Increment view count
    const [updatedRecording] = await db
      .update(recordings)
      .set({
        viewCount: recording.viewCount + 1,
      })
      .where(eq(recordings.id, id))
      .returning();

    res.json({
      success: true,
      data: { viewCount: updatedRecording.viewCount }
    });
  } catch (error) {
    console.error('Increment view count error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
