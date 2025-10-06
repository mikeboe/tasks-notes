import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { NotesApi } from '@/lib/notes-api';
import { type Note } from '@/types/index';
import { buildTree } from '@/lib/utils';
import { useTeamContext } from '@/hooks/use-team-context';

interface NoteNode extends Note {
  children: NoteNode[];
}

interface NotesContextType {
  notes: NoteNode[];
  fetchNotes: () => Promise<void>;
  updateNoteTitleInTree: (noteId: string, newTitle: string) => void;
  updateNoteParentInTree: (noteId: string, newParentId: string | null) => void;
  moveNoteOptimistic: (noteId: string, newParentId: string | null, order?: number) => Promise<boolean>;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notes, setNotes] = useState<NoteNode[]>([]);
  const { teamId } = useTeamContext();

  const fetchNotes = useCallback(async () => {
    const response = await NotesApi.getNotes(teamId);
    if (response.success && response.data) {
      setNotes(buildTree(response.data) as NoteNode[]);
    }
  }, [teamId]);

  // Reload notes when teamId changes
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes, teamId]);

  const updateNoteTitleInTree = useCallback((noteId: string, newTitle: string) => {
    setNotes(prevNotes => {
      const updateTitle = (nodes: NoteNode[]): NoteNode[] => {
        return nodes.map(note => {
          if (note.id === noteId) {
            return { ...note, title: newTitle };
          } else if (note.children && note.children.length > 0) {
            return { ...note, children: updateTitle(note.children) };
          }
          return note;
        });
      };
      return updateTitle(prevNotes);
    });
  }, []);

  const updateNoteParentInTree = useCallback((noteId: string, newParentId: string | null) => {
    setNotes(prevNotes => {
      // Flatten the current tree into a list of notes
      const flattenTree = (nodes: NoteNode[]): Note[] => {
        let flatList: Note[] = [];
        nodes.forEach(node => {
          const { children, ...rest } = node;
          flatList.push(rest);
          if (children && children.length > 0) {
            flatList = flatList.concat(flattenTree(children));
          }
        });
        return flatList;
      };

      let flatNotes = flattenTree(prevNotes);

      // Update the parentId of the moved note
      flatNotes = flatNotes.map(note =>
        note.id === noteId
          ? { ...note, parentId: newParentId === null ? undefined : newParentId }
          : note
      );

      // Rebuild the tree from the updated flat list
      return buildTree(flatNotes) as NoteNode[];
    });
  }, []);

  const moveNoteOptimistic = useCallback(async (noteId: string, newParentId: string | null, order?: number): Promise<boolean> => {
    // Optimistically update the UI first
    const oldNotes = notes;
    updateNoteParentInTree(noteId, newParentId);
    
    try {
      const response = await NotesApi.moveNoteToParent(noteId, newParentId, order);
      if (response.success) {
        // Fetch fresh data to ensure consistency
        await fetchNotes();
        return true;
      } else {
        // Revert the optimistic update
        setNotes(oldNotes);
        return false;
      }
    } catch (error) {
      // Revert the optimistic update
      setNotes(oldNotes);
      console.error('Failed to move note:', error);
      return false;
    }
  }, [notes, fetchNotes, updateNoteParentInTree]);

  return (
    <NotesContext.Provider value={{ notes, fetchNotes, updateNoteTitleInTree, updateNoteParentInTree, moveNoteOptimistic }}>
      {children}
    </NotesContext.Provider>
  );
};

export const useNotes = () => {
  const context = useContext(NotesContext);
  if (context === undefined) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
};
