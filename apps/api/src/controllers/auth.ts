import { Request, Response } from 'express';
import { db } from '../db';
import {
  users,
  refreshTokens,
  userInvitations,
  apiKeys,
  registerSchema,
  loginSchema,
  resetPasswordSchema,
  forgotPasswordSchema,
  verifyEmailSchema,
  inviteUserSchema,
  acceptUserInvitationSchema,
  updateUserRoleSchema,
  getUsersSearchSchema,
  changePasswordSchema,
  microsoftLoginSchema
} from '../schema/auth-schema';
import { eq, and, gt, isNull, like, or } from 'drizzle-orm';
import { 
  hashPassword, 
  verifyPassword, 
  generateAccessToken, 
  generateRefreshToken, 
  hashRefreshToken,
  generateEmailVerificationToken,
  generatePasswordResetToken,
  generateApiKey,
  hashApiKey
} from '../utils/auth';

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/'
};

export const register = async (req: Request, res: Response) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.error.issues
      });
    }

    const { email, password, firstName, lastName } = validation.data;

    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length > 0) {
      return res.status(409).json({
        message: 'User already exists'
      });
    }

    // Hash password and generate email verification token
    const passwordHash = await hashPassword(password);
    const emailVerificationToken = generateEmailVerificationToken();

    // Create user
    const newUser = await db.insert(users).values({
      email,
      passwordHash,
      firstName,
      lastName,
      emailVerificationToken
    }).returning({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      emailVerified: users.emailVerified
    });

    // TODO: Send email verification email here
    // For now, we'll just return success

    res.status(201).json(newUser[0]);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.error.issues
      });
    }

    const { email, password } = validation.data;

    // Find user
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user.length) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    // Check if password exists (Microsoft users don't have passwords)
    if (!user[0].passwordHash) {
      return res.status(401).json({
        message: 'This account uses Microsoft login. Please sign in with Microsoft.'
      });
    }

    // Verify password
    const isValidPassword = await verifyPassword(user[0].passwordHash, password);
    if (!isValidPassword) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user[0].id);
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);

    // Store refresh token in database
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await db.insert(refreshTokens).values({
      userId: user[0].id,
      tokenHash: refreshTokenHash,
      expiresAt
    });

    // Update last login
    await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, user[0].id));

    // Set cookies
    res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 }); // 15 minutes
    res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 days

    res.json({
      id: user[0].id,
      email: user[0].email,
      firstName: user[0].firstName,
      lastName: user[0].lastName,
      role: user[0].role,
      emailVerified: user[0].emailVerified,
      profilePicture: user[0].profilePicture
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({
        message: 'Refresh token required'
      });
    }

    const refreshTokenHash = hashRefreshToken(refreshToken);

    // Find valid refresh token
    const tokenRecord = await db.select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, refreshTokenHash),
          gt(refreshTokens.expiresAt, new Date()),
          isNull(refreshTokens.revokedAt)
        )
      )
      .limit(1);

    if (!tokenRecord.length) {
      return res.status(401).json({
        message: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(tokenRecord[0].userId);
    const newRefreshToken = generateRefreshToken();
    const newRefreshTokenHash = hashRefreshToken(newRefreshToken);

    // Revoke old refresh token and create new one
    await db.update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, tokenRecord[0].id));

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await db.insert(refreshTokens).values({
      userId: tokenRecord[0].userId,
      tokenHash: newRefreshTokenHash,
      expiresAt,
      replacedByTokenId: tokenRecord[0].id
    });

    // Set new cookies
    res.cookie('accessToken', newAccessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', newRefreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.status(204).end();
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (refreshToken) {
      const refreshTokenHash = hashRefreshToken(refreshToken);
      // Revoke refresh token
      await db.update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.tokenHash, refreshTokenHash));
    }

    // Clear cookies
    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);

    res.status(204).end();
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

export const me = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'User not authenticated'
      });
    }

    res.json({
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      role: req.user.role,
      emailVerified: req.user.emailVerified,
      profilePicture: req.user.profilePicture,
      createdAt: req.user.createdAt
    });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const validation = verifyEmailSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.error.issues
      });
    }

    const { token } = validation.data;

    // Find user with verification token
    const user = await db.select()
      .from(users)
      .where(eq(users.emailVerificationToken, token))
      .limit(1);

    if (!user.length) {
      return res.status(400).json({
        message: 'Invalid verification token'
      });
    }

    // Update user as verified
    await db.update(users)
      .set({ 
        emailVerified: true, 
        emailVerificationToken: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, user[0].id));

    res.status(204).end();
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const validation = forgotPasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.error.issues
      });
    }

    const { email } = validation.data;

    // Find user
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user.length) {
      // Don't reveal if email exists or not
      return res.status(204).end();
    }

    // Generate password reset token
    const resetToken = generatePasswordResetToken();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Update user with reset token
    await db.update(users)
      .set({ 
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
        updatedAt: new Date()
      })
      .where(eq(users.id, user[0].id));

    // TODO: Send password reset email here
    // For now, we'll just return success

    res.status(204).end();
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const validation = resetPasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.error.issues
      });
    }

    const { token, password } = validation.data;

    // Find user with valid reset token
    const user = await db.select()
      .from(users)
      .where(
        and(
          eq(users.passwordResetToken, token),
          gt(users.passwordResetExpires, new Date())
        )
      )
      .limit(1);

    if (!user.length) {
      return res.status(400).json({
        message: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(password);

    // Update user password and clear reset token
    await db.update(users)
      .set({ 
        passwordHash: newPasswordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, user[0].id));

    // Revoke all refresh tokens for this user (force re-login)
    await db.update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.userId, user[0].id));

    res.status(204).end();
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

// User management functions for SuperAdmin

export const inviteUser = async (req: Request, res: Response) => {
  try {
    const validation = inviteUserSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.error.issues
      });
    }

    const { email, role } = validation.data;

    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length > 0) {
      return res.status(409).json({
        message: 'User already exists'
      });
    }

    // Check if invitation already exists
    const existingInvitation = await db.select()
      .from(userInvitations)
      .where(and(eq(userInvitations.email, email), eq(userInvitations.status, 'pending')))
      .limit(1);
    
    if (existingInvitation.length > 0) {
      return res.status(409).json({
        message: 'Invitation already sent for this email'
      });
    }

    // Generate invitation token
    const invitationToken = generateEmailVerificationToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invitation
    const invitation = await db.insert(userInvitations).values({
      email,
      role,
      token: invitationToken,
      invitedById: req.user?.id,
      expiresAt,
      status: 'pending'
    }).returning();

    // TODO: Send invitation email here

    res.status(201).json(invitation[0]);
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

export const acceptUserInvitation = async (req: Request, res: Response) => {
  try {
    const validation = acceptUserInvitationSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.error.issues
      });
    }

    const { token, password, firstName, lastName } = validation.data;

    // Find valid invitation
    const invitation = await db.select()
      .from(userInvitations)
      .where(
        and(
          eq(userInvitations.token, token),
          eq(userInvitations.status, 'pending'),
          gt(userInvitations.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!invitation.length) {
      return res.status(400).json({
        message: 'Invalid or expired invitation token'
      });
    }

    const passwordHash = await hashPassword(password);

    // Create user and update invitation in transaction
    const result = await db.transaction(async (tx) => {
      // Create user
      const newUser = await tx.insert(users).values({
        email: invitation[0].email,
        passwordHash,
        firstName,
        lastName,
        role: invitation[0].role,
        emailVerified: true
      }).returning();

      // Mark invitation as accepted
      await tx.update(userInvitations)
        .set({ 
          status: 'accepted',
          acceptedAt: new Date()
        })
        .where(eq(userInvitations.id, invitation[0].id));

      return newUser[0];
    });

    res.status(201).json({
      id: result.id,
      email: result.email,
      firstName: result.firstName,
      lastName: result.lastName,
      role: result.role,
      emailVerified: result.emailVerified
    });
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const validation = getUsersSearchSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.error.issues
      });
    }

    const { query, role, page, limit } = validation.data;
    const offset = (page - 1) * limit;

    let whereCondition;
    if (query && role) {
      whereCondition = and(
        eq(users.role, role),
        or(
          like(users.firstName, `%${query}%`),
          like(users.lastName, `%${query}%`),
          like(users.email, `%${query}%`)
        )
      );
    } else if (query) {
      whereCondition = or(
        like(users.firstName, `%${query}%`),
        like(users.lastName, `%${query}%`),
        like(users.email, `%${query}%`)
      );
    } else if (role) {
      whereCondition = eq(users.role, role);
    }

    const usersResult = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
      lastLogin: users.lastLogin
    }).from(users)
      .where(whereCondition)
      .limit(limit)
      .offset(offset);

    res.json(usersResult);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const validation = updateUserRoleSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.error.issues
      });
    }

    const { id, role } = validation.data;

    // Check if user exists
    const user = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!user.length) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Update user role
    const updatedUser = await db.update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        emailVerified: users.emailVerified
      });

    res.json(updatedUser[0]);
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

export const getPendingInvitations = async (_req: Request, res: Response) => {
  try {
    const invitations = await db.select({
      id: userInvitations.id,
      email: userInvitations.email,
      role: userInvitations.role,
      status: userInvitations.status,
      createdAt: userInvitations.createdAt,
      expiresAt: userInvitations.expiresAt
    }).from(userInvitations)
      .where(eq(userInvitations.status, 'pending'));

    res.json(invitations);
  } catch (error) {
    console.error('Get invitations error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const validation = changePasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.error.issues
      });
    }

    const { currentPassword, newPassword } = validation.data;

    // Check if user has a password (Microsoft users don't)
    if (!req.user.passwordHash) {
      return res.status(400).json({
        success: false,
        message: 'This account uses Microsoft login and does not have a password to change'
      });
    }

    // Verify current password
    const isValidPassword = await verifyPassword(req.user.passwordHash, currentPassword);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await db.update(users)
      .set({ 
        passwordHash: newPasswordHash,
        updatedAt: new Date()
      })
      .where(eq(users.id, req.user.id));

    // Revoke all refresh tokens for this user (force re-login on other devices)
    await db.update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.userId, req.user.id));

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const generateApiKeyForUser = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Revoke any existing API key for this user
    await db.update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(and(
        eq(apiKeys.userId, req.user.id),
        isNull(apiKeys.revokedAt)
      ));

    // Generate new API key
    const apiKey = generateApiKey();
    const hashedApiKey = hashApiKey(apiKey);

    // Store in database
    await db.insert(apiKeys).values({
      userId: req.user.id,
      keyHash: hashedApiKey,
      name: 'Default API Key'
    });

    res.json({
      success: true,
      apiKey: apiKey,
      message: 'API key generated successfully'
    });
  } catch (error) {
    console.error('Generate API key error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getApiKey = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Find active API key for user
    const result = await db.select({
      id: apiKeys.id,
      name: apiKeys.name,
      createdAt: apiKeys.createdAt,
      lastUsed: apiKeys.lastUsed
    }).from(apiKeys)
      .where(and(
        eq(apiKeys.userId, req.user.id),
        isNull(apiKeys.revokedAt)
      ))
      .limit(1);

    if (!result.length) {
      return res.json({
        success: true,
        apiKey: null,
        message: 'No active API key found'
      });
    }

    // Return masked API key (we don't store the original)
    res.json({
      success: true,
      hasApiKey: true,
      keyInfo: result[0],
      message: 'API key information retrieved'
    });
  } catch (error) {
    console.error('Get API key error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const microsoftLogin = async (req: Request, res: Response) => {
  try {
    const validation = microsoftLoginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.error.issues
      });
    }

    const { idToken, accessToken: msAccessToken } = validation.data;

    // Decode the Microsoft ID token (JWT)
    const jwt = require('jsonwebtoken');
    const decodedToken = jwt.decode(idToken) as any;

    if (!decodedToken) {
      return res.status(401).json({
        message: 'Invalid Microsoft token'
      });
    }

    // Extract user information from the token
    const microsoftId = decodedToken.oid || decodedToken.sub; // Object ID or Subject
    const email = decodedToken.email || decodedToken.preferred_username;
    const firstName = decodedToken.given_name || decodedToken.name?.split(' ')[0] || 'User';
    const lastName = decodedToken.family_name || decodedToken.name?.split(' ').slice(1).join(' ') || '';

    // Fetch profile picture from Microsoft Graph API if msAccessToken is provided
    let profilePicture: string | null = null;
    if (msAccessToken) {
      try {
        const axios = require('axios');

        // Get the photo metadata first to check if it exists
        const photoMetaResponse = await axios.get('https://graph.microsoft.com/v1.0/me/photo', {
          headers: { Authorization: `Bearer ${msAccessToken}` }
        });

        if (photoMetaResponse.status === 200) {
          // Fetch the actual photo
          const photoResponse = await axios.get('https://graph.microsoft.com/v1.0/me/photo/$value', {
            headers: { Authorization: `Bearer ${msAccessToken}` },
            responseType: 'arraybuffer'
          });

          if (photoResponse.status === 200) {
            // Convert to base64 data URL
            const base64Image = Buffer.from(photoResponse.data, 'binary').toString('base64');
            const contentType = photoResponse.headers['content-type'] || 'image/jpeg';
            profilePicture = `data:${contentType};base64,${base64Image}`;
          }
        }
      } catch (photoError: any) {
        // Photo might not exist or Graph API call failed - continue without it
        console.log('Could not fetch profile picture:', photoError.message);
      }
    }

    // Check if user exists by Microsoft ID
    let user = await db.select()
      .from(users)
      .where(eq(users.microsoftId, microsoftId))
      .limit(1);

    if (!user.length) {
      // Check if user exists by email
      user = await db.select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (user.length) {
        // Link existing email account to Microsoft account
        await db.update(users)
          .set({
            microsoftId,
            authProvider: 'microsoft',
            emailVerified: true,
            profilePicture: profilePicture || user[0].profilePicture,
            updatedAt: new Date()
          })
          .where(eq(users.id, user[0].id));

        // Refresh user data
        user = await db.select()
          .from(users)
          .where(eq(users.id, user[0].id))
          .limit(1);
      } else {
        // Create new user with Microsoft account
        const newUser = await db.insert(users).values({
          email,
          microsoftId,
          firstName,
          lastName,
          emailVerified: true,
          authProvider: 'microsoft',
          profilePicture,
          role: 'admin'
        }).returning();

        user = newUser;
      }
    } else {
      // Update profile picture if we got a new one
      if (profilePicture) {
        await db.update(users)
          .set({
            profilePicture,
            updatedAt: new Date()
          })
          .where(eq(users.id, user[0].id));

        // Refresh user data
        user = await db.select()
          .from(users)
          .where(eq(users.id, user[0].id))
          .limit(1);
      }
    }

    // Generate tokens
    const accessToken = generateAccessToken(user[0].id);
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);

    // Store refresh token in database
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await db.insert(refreshTokens).values({
      userId: user[0].id,
      tokenHash: refreshTokenHash,
      expiresAt
    });

    // Update last login
    await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, user[0].id));

    // Set cookies
    res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 }); // 15 minutes
    res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 days

    res.json({
      id: user[0].id,
      email: user[0].email,
      firstName: user[0].firstName,
      lastName: user[0].lastName,
      role: user[0].role,
      emailVerified: user[0].emailVerified,
      profilePicture: user[0].profilePicture
    });
  } catch (error) {
    console.error('Microsoft login error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};