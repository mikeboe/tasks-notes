import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { NotesApi } from '@/lib/notes-api';
import { type Note } from '@/types/index';

interface FavoritesContextType {
  favoriteNotes: Note[];
  isLoading: boolean;
  isFavorite: (noteId: string) => boolean;
  toggleFavorite: (noteId: string) => Promise<boolean>;
  fetchFavorites: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favoriteNotes, setFavoriteNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchFavorites = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await NotesApi.getFavoriteNotes();
      if (response.success && response.data) {
        setFavoriteNotes(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const isFavorite = useCallback((noteId: string) => {
    return favoriteNotes.some(note => note.id === noteId);
  }, [favoriteNotes]);

  const toggleFavorite = useCallback(async (noteId: string): Promise<boolean> => {
    try {
      const response = await NotesApi.toggleFavorite(noteId);
      if (response.success && response.data) {
        // Update local state optimistically
        if (response.data.isFavorite) {
          // Note was favorited - we need to get the note details
          const noteResponse = await NotesApi.getNoteById(noteId);
          if (noteResponse.success && noteResponse.data) {
            setFavoriteNotes(prev => [...prev, noteResponse.data!]);
          }
        } else {
          // Note was unfavorited - remove from favorites
          setFavoriteNotes(prev => prev.filter(note => note.id !== noteId));
        }
        return response.data.isFavorite;
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
    return false;
  }, []);

  return (
    <FavoritesContext.Provider value={{
      favoriteNotes,
      isLoading,
      isFavorite,
      toggleFavorite,
      fetchFavorites
    }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};