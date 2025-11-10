import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CollectionsAPI } from '@/lib/collections-api';
import type {
  Collection,
  CollectionItem,
  CollectionTask,
  CreateCollectionInput,
  UpdateCollectionInput,
  AddCollectionItemInput,
  CreateCollectionTaskInput,
} from '@/lib/collections-api';
import { useTeamContext } from '@/hooks/use-team-context';
import { toast } from 'react-hot-toast';

interface CollectionsState {
  collections: Collection[];
  currentCollection: Collection | null;
  items: CollectionItem[];
  tasks: CollectionTask[];
  isLoading: boolean;
  error: string | null;
}

interface CollectionsContextValue extends CollectionsState {
  // Collections
  createCollection: (input: CreateCollectionInput) => Promise<Collection>;
  loadCollections: () => Promise<void>;
  loadCollection: (id: string) => Promise<void>;
  updateCollection: (id: string, input: UpdateCollectionInput) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;

  // Items
  addItem: (collectionId: string, input: AddCollectionItemInput) => Promise<void>;
  removeItem: (collectionId: string, itemId: string) => Promise<void>;
  generateEmbeddings: (collectionId: string, itemId: string) => Promise<void>;
  refreshItemStatus: (collectionId: string, itemId: string) => Promise<void>;

  // Tasks
  createTask: (collectionId: string, input: CreateCollectionTaskInput) => Promise<void>;
  loadTasks: (collectionId: string) => Promise<void>;
  deleteTask: (collectionId: string, taskId: string) => Promise<void>;

  // Polling
  startPollingTasks: (collectionId: string) => void;
  stopPollingTasks: () => void;

  clearError: () => void;
}

const CollectionsContext = createContext<CollectionsContextValue | undefined>(undefined);

export const CollectionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { teamId } = useTeamContext();

  const [state, setState] = useState<CollectionsState>({
    collections: [],
    currentCollection: null,
    items: [],
    tasks: [],
    isLoading: false,
    error: null,
  });

  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Load collections when teamId changes
  useEffect(() => {
    loadCollections();
  }, [teamId]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  /**
   * Create a new collection
   */
  const createCollection = useCallback(async (input: CreateCollectionInput): Promise<Collection> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const collection = await CollectionsAPI.createCollection({
        ...input,
        teamId: teamId || undefined,
      });

      setState(prev => ({
        ...prev,
        collections: [collection, ...prev.collections],
        isLoading: false,
      }));

      toast.success('Collection created');
      return collection;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create collection';
      setState(prev => ({ ...prev, error: message, isLoading: false }));
      toast.error(message);
      throw error;
    }
  }, [teamId]);

  /**
   * Load all collections
   */
  const loadCollections = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const collections = await CollectionsAPI.getCollections(teamId || undefined);
      setState(prev => ({ ...prev, collections, isLoading: false }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load collections';
      setState(prev => ({ ...prev, error: message, isLoading: false }));
      toast.error(message);
    }
  }, [teamId]);

  /**
   * Load a single collection with items
   */
  const loadCollection = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { collection, items } = await CollectionsAPI.getCollection(id);
      const tasks = await CollectionsAPI.getTasks(id);

      setState(prev => ({
        ...prev,
        currentCollection: collection,
        items,
        tasks,
        isLoading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load collection';
      setState(prev => ({ ...prev, error: message, isLoading: false }));
      toast.error(message);
    }
  }, []);

  /**
   * Update a collection
   */
  const updateCollection = useCallback(async (id: string, input: UpdateCollectionInput) => {
    try {
      const updated = await CollectionsAPI.updateCollection(id, input);

      setState(prev => ({
        ...prev,
        collections: prev.collections.map(c => c.id === id ? updated : c),
        currentCollection: prev.currentCollection?.id === id ? updated : prev.currentCollection,
      }));

      toast.success('Collection updated');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update collection';
      toast.error(message);
      throw error;
    }
  }, []);

  /**
   * Delete a collection
   */
  const deleteCollection = useCallback(async (id: string) => {
    try {
      await CollectionsAPI.deleteCollection(id);

      setState(prev => ({
        ...prev,
        collections: prev.collections.filter(c => c.id !== id),
        currentCollection: prev.currentCollection?.id === id ? null : prev.currentCollection,
        items: prev.currentCollection?.id === id ? [] : prev.items,
        tasks: prev.currentCollection?.id === id ? [] : prev.tasks,
      }));

      toast.success('Collection deleted');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete collection';
      toast.error(message);
      throw error;
    }
  }, []);

  /**
   * Add item to collection
   */
  const addItem = useCallback(async (collectionId: string, input: AddCollectionItemInput) => {
    try {
      const item = await CollectionsAPI.addCollectionItem(collectionId, {
        ...input,
        teamId: teamId || undefined,
      });

      setState(prev => ({
        ...prev,
        items: [...prev.items, item],
      }));

      toast.success('Item added to collection');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add item';
      toast.error(message);
      throw error;
    }
  }, [teamId]);

  /**
   * Remove item from collection
   */
  const removeItem = useCallback(async (collectionId: string, itemId: string) => {
    try {
      await CollectionsAPI.removeCollectionItem(collectionId, itemId);

      setState(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== itemId),
      }));

      toast.success('Item removed');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove item';
      toast.error(message);
      throw error;
    }
  }, []);

  /**
   * Generate embeddings for an item
   */
  const generateEmbeddings = useCallback(async (collectionId: string, itemId: string) => {
    try {
      await CollectionsAPI.generateItemEmbeddings(collectionId, itemId, teamId || undefined);

      // Update item status to show it's processing
      setState(prev => ({
        ...prev,
        items: prev.items.map(item =>
          item.id === itemId
            ? { ...item, hasEmbeddings: false, embeddingsError: null }
            : item
        ),
      }));

      toast.success('Generating embeddings...');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate embeddings';
      toast.error(message);
      throw error;
    }
  }, [teamId]);

  /**
   * Refresh embeddings status for an item
   */
  const refreshItemStatus = useCallback(async (collectionId: string, itemId: string) => {
    try {
      const status = await CollectionsAPI.getItemEmbeddingsStatus(collectionId, itemId);

      setState(prev => ({
        ...prev,
        items: prev.items.map(item =>
          item.id === itemId
            ? { ...item, ...status }
            : item
        ),
      }));
    } catch (error) {
      console.error('Failed to refresh item status:', error);
    }
  }, []);

  /**
   * Create a task
   */
  const createTask = useCallback(async (collectionId: string, input: CreateCollectionTaskInput) => {
    try {
      const task = await CollectionsAPI.createTask(collectionId, input);

      setState(prev => ({
        ...prev,
        tasks: [task, ...prev.tasks],
      }));

      toast.success('Task started');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create task';
      toast.error(message);
      throw error;
    }
  }, []);

  /**
   * Load tasks for a collection
   */
  const loadTasks = useCallback(async (collectionId: string) => {
    try {
      const tasks = await CollectionsAPI.getTasks(collectionId);
      setState(prev => ({ ...prev, tasks }));
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  }, []);

  /**
   * Delete a task
   */
  const deleteTask = useCallback(async (collectionId: string, taskId: string) => {
    try {
      await CollectionsAPI.deleteTask(collectionId, taskId);

      setState(prev => ({
        ...prev,
        tasks: prev.tasks.filter(task => task.id !== taskId),
      }));

      toast.success('Task deleted');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete task';
      toast.error(message);
      throw error;
    }
  }, []);

  /**
   * Start polling tasks for updates
   */
  const startPollingTasks = useCallback((collectionId: string) => {
    // Stop existing polling
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    // Poll every 3 seconds
    const interval = setInterval(() => {
      loadTasks(collectionId);
    }, 3000);

    setPollingInterval(interval);
  }, [loadTasks, pollingInterval]);

  /**
   * Stop polling tasks
   */
  const stopPollingTasks = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  }, [pollingInterval]);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const value: CollectionsContextValue = {
    ...state,
    createCollection,
    loadCollections,
    loadCollection,
    updateCollection,
    deleteCollection,
    addItem,
    removeItem,
    generateEmbeddings,
    refreshItemStatus,
    createTask,
    loadTasks,
    deleteTask,
    startPollingTasks,
    stopPollingTasks,
    clearError,
  };

  return <CollectionsContext.Provider value={value}>{children}</CollectionsContext.Provider>;
};

export const useCollections = () => {
  const context = useContext(CollectionsContext);
  if (context === undefined) {
    throw new Error('useCollections must be used within a CollectionsProvider');
  }
  return context;
};
