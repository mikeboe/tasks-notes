import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { users, apiKeys } from '../schema/auth-schema';
import { eq, and, isNull } from 'drizzle-orm';
import { verifyAccessToken, hashApiKey } from '../utils/auth';

declare global {
  namespace Express {
    interface Request {
      user?: typeof users.$inferSelect;
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check for API key in headers first
    const apiKey = req.headers['x-api-key'] as string;
    
    if (apiKey) {
      if (!apiKey.startsWith('ak_')) {
        return res.status(401).json({
          success: false,
          message: 'Invalid API key format'
        });
      }

      const hashedApiKey = hashApiKey(apiKey);
      
      // Find valid API key and associated user
      const result = await db
        .select({
          user: users,
          apiKey: apiKeys
        })
        .from(apiKeys)
        .innerJoin(users, eq(apiKeys.userId, users.id))
        .where(
          and(
            eq(apiKeys.keyHash, hashedApiKey),
            isNull(apiKeys.revokedAt)
          )
        )
        .limit(1);

      if (!result.length) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or revoked API key'
        });
      }

      // Update last used timestamp
      await db.update(apiKeys)
        .set({ lastUsed: new Date() })
        .where(eq(apiKeys.id, result[0].apiKey.id));

      req.user = result[0].user;
      return next();
    }

    // Fallback to JWT authentication
    const token = req.cookies.accessToken;
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token or API key required'
      });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    const user = await db.select().from(users).where(eq(users.id, decoded.userId)).limit(1);
    
    if (!user.length) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    req.user = user[0];
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};