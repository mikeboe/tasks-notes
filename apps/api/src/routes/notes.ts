
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getNotes, createNote, updateNote, deleteNote, getNoteById, moveNote, moveNoteToParent, toggleFavorite, getFavoriteNotes, checkIfFavorite, archiveNote, duplicateNote, getRecentNotes } from '../controllers/notes';

const router = Router();

router.use(authMiddleware);

router.get('/', getNotes);
router.get('/recent', getRecentNotes);
router.get('/:id', getNoteById);
router.post('/', createNote);
router.put('/:id', updateNote);
router.delete('/:id', deleteNote);
router.post('/:id/move', moveNote);
router.post('/:id/move-to-parent', moveNoteToParent);
router.post('/:id/favorite', toggleFavorite);
router.get('/:id/favorite', checkIfFavorite);
router.get('/favorites/list', getFavoriteNotes);
router.post('/:id/archive', archiveNote);
router.post('/:id/duplicate', duplicateNote);

export default router;
