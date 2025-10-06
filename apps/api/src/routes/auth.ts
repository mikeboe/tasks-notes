import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/auth';
import { authLimiter, loginLimiter, forgotPasswordLimiter } from '../middleware/rateLimiter';
import {
  register,
  login,
  refresh,
  logout,
  me,
  verifyEmail,
  forgotPassword,
  resetPassword,
  inviteUser,
  acceptUserInvitation,
  getUsers,
  updateUserRole,
  getPendingInvitations,
  changePassword,
  generateApiKeyForUser,
  getApiKey,
  microsoftLogin
} from '../controllers/auth';

const router = Router();

// Public authentication routes
router.post('/register', authLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/microsoft/login', loginLimiter, microsoftLogin);
router.post('/refresh', refresh);
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.post('/logout', authMiddleware, logout);
router.get('/me', authMiddleware, me);

// Profile management routes
router.post('/change-password', authMiddleware, changePassword);
router.post('/generate-api-key', authMiddleware, generateApiKeyForUser);
router.get('/api-key', authMiddleware, getApiKey);

// User management routes (SuperAdmin only)
router.post('/users/invite', authMiddleware, roleMiddleware(['superAdmin']), authLimiter, inviteUser);
router.post('/users/accept-invitation', acceptUserInvitation);
router.get('/users', authMiddleware, roleMiddleware(['superAdmin']), getUsers);
router.put('/users/role', authMiddleware, roleMiddleware(['superAdmin']), authLimiter, updateUserRole);
router.get('/users/invitations', authMiddleware, roleMiddleware(['superAdmin']), getPendingInvitations);

export default router;