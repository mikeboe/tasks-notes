import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollections } from '@/context/CollectionsContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlusIcon, FolderIcon, TrashIcon } from 'lucide-react';

const Collections = () => {
  const navigate = useNavigate();
  const { collections, createCollection, deleteCollection, isLoading } = useCollections();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCollection, setNewCollection] = useState({ title: '', description: '' });
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollection.title.trim()) return;

    setIsCreating(true);
    try {
      const collection = await createCollection({
        title: newCollection.title,
        description: newCollection.description || undefined,
      });
      setNewCollection({ title: '', description: '' });
      setShowCreateDialog(false);
      navigate(`/collections/${collection.id}`);
    } catch (error) {
      console.error('Failed to create collection:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCollection = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this collection?')) return;

    try {
      await deleteCollection(id);
    } catch (error) {
      console.error('Failed to delete collection:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Collections</h1>
          <p className="text-muted-foreground mt-1">
            Group notes and documents for semantic search and AI analysis
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <PlusIcon className="mr-2 h-4 w-4" />
          New Collection
        </Button>
      </div>

      {/* Collections Grid */}
      {isLoading && collections.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading collections...
        </div>
      ) : collections.length === 0 ? (
        <div className="text-center py-12">
          <FolderIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No collections yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first collection to get started
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Create Collection
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map(collection => (
            <Card
              key={collection.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/collections/${collection.id}`)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderIcon className="h-5 w-5 text-primary" />
                  {collection.title}
                </CardTitle>
                {collection.description && (
                  <CardDescription className="line-clamp-2">
                    {collection.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardFooter className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  Updated {new Date(collection.updatedAt).toLocaleDateString()}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleDeleteCollection(collection.id, e)}
                  className="text-destructive hover:text-destructive"
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create Collection Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Collection</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCollection}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="My Collection"
                  value={newCollection.title}
                  onChange={(e) => setNewCollection(prev => ({ ...prev, title: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="What is this collection about?"
                  value={newCollection.description}
                  onChange={(e) => setNewCollection(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!newCollection.title.trim() || isCreating}>
                {isCreating ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Collections;
