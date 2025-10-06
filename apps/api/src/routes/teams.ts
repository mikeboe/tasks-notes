import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { requireTeamMember, requireTeamAdmin, requireTeamOwner } from '../middleware/team-auth';
import {
  createTeam,
  getTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
  addTeamMember,
  getTeamMembers,
  updateTeamMember,
  removeTeamMember,
} from '../controllers/teams';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Team management routes
router.post('/', createTeam);
router.get('/', getTeams);
router.get('/:teamId', requireTeamMember, getTeamById);
router.put('/:teamId', requireTeamMember, requireTeamAdmin, updateTeam);
router.delete('/:teamId', requireTeamMember, requireTeamOwner, deleteTeam);

// Team members routes
router.post('/:teamId/members', requireTeamMember, requireTeamAdmin, addTeamMember);
router.get('/:teamId/members', requireTeamMember, getTeamMembers);
router.put('/:teamId/members/:userId', requireTeamMember, requireTeamAdmin, updateTeamMember);
router.delete('/:teamId/members/:userId', requireTeamMember, removeTeamMember);

export default router;
