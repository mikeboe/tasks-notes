const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export interface Collection {
  id: string;
  title: string;
  description: string | null;
  userId: string;
  teamId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionItem {
  id: string;
  collectionId: string;
  noteId: string | null;
  title: string | null;
  content: string | null;
  searchableContent: string | null;
  sourceType: 'pdf' | 'image' | 'url' | 'note';
  sourceUrl: string | null;
  metadata: string | null;
  hasEmbeddings: boolean;
  embeddingsGeneratedAt: string | null;
  embeddingsError: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionTask {
  id: string;
  collectionId: string;
  taskType: 'summary' | 'podcast' | 'research' | 'common_themes' | 'outline';
  title: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  input: string | null;
  result: string | null;
  resultNoteId: string | null;
  error: string | null;
  progress: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface CreateCollectionInput {
  title: string;
  description?: string;
  teamId?: string;
}

export interface UpdateCollectionInput {
  title?: string;
  description?: string;
}

export interface AddCollectionItemInput {
  noteId?: string;
  title?: string;
  content?: string;
  searchableContent?: string;
  sourceType: 'pdf' | 'image' | 'url' | 'note';
  sourceUrl?: string;
  metadata?: string;
  teamId?: string;
}

export interface CreateCollectionTaskInput {
  taskType: 'summary' | 'podcast' | 'research' | 'common_themes' | 'outline';
  title: string;
  input?: string;
}

export class CollectionsAPI {
  /**
   * Create a new collection
   */
  static async createCollection(input: CreateCollectionInput): Promise<Collection> {
    const response = await fetch(`${API_BASE_URL}/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create collection');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Get all collections (filtered by teamId)
   */
  static async getCollections(teamId?: string): Promise<Collection[]> {
    const params = new URLSearchParams();
    if (teamId) {
      params.append('teamId', teamId);
    }

    const response = await fetch(`${API_BASE_URL}/collections?${params}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch collections');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Get a single collection with items
   */
  static async getCollection(id: string): Promise<{ collection: Collection; items: CollectionItem[] }> {
    const response = await fetch(`${API_BASE_URL}/collections/${id}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch collection');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Update a collection
   */
  static async updateCollection(id: string, input: UpdateCollectionInput): Promise<Collection> {
    const response = await fetch(`${API_BASE_URL}/collections/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update collection');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Delete a collection
   */
  static async deleteCollection(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/collections/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete collection');
    }
  }

  /**
   * Add item to collection
   */
  static async addCollectionItem(collectionId: string, input: AddCollectionItemInput): Promise<CollectionItem> {
    const response = await fetch(`${API_BASE_URL}/collections/${collectionId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add item');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Remove item from collection
   */
  static async removeCollectionItem(collectionId: string, itemId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/collections/${collectionId}/items/${itemId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to remove item');
    }
  }

  /**
   * Generate embeddings for an item
   */
  static async generateItemEmbeddings(collectionId: string, itemId: string, teamId?: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/collections/${collectionId}/items/${itemId}/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ teamId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate embeddings');
    }
  }

  /**
   * Get embeddings status for an item
   */
  static async getItemEmbeddingsStatus(collectionId: string, itemId: string): Promise<{
    hasEmbeddings: boolean;
    embeddingsGeneratedAt: string | null;
    embeddingsError: string | null;
  }> {
    const response = await fetch(`${API_BASE_URL}/collections/${collectionId}/items/${itemId}/embeddings/status`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch embeddings status');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Create a collection task
   */
  static async createTask(collectionId: string, input: CreateCollectionTaskInput): Promise<CollectionTask> {
    const response = await fetch(`${API_BASE_URL}/collections/${collectionId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create task');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Get all tasks for a collection
   */
  static async getTasks(collectionId: string): Promise<CollectionTask[]> {
    const response = await fetch(`${API_BASE_URL}/collections/${collectionId}/tasks`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch tasks');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Get a single task
   */
  static async getTask(collectionId: string, taskId: string): Promise<CollectionTask> {
    const response = await fetch(`${API_BASE_URL}/collections/${collectionId}/tasks/${taskId}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch task');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Delete a task
   */
  static async deleteTask(collectionId: string, taskId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/collections/${collectionId}/tasks/${taskId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete task');
    }
  }
}
