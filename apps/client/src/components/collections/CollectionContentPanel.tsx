import React, { useState } from 'react';
import { useCollections } from '@/context/CollectionsContext';
import { Button } from '@/components/ui/button';
import { PlusIcon, FileIcon, CheckCircleIcon, AlertCircleIcon, LoaderIcon, XIcon } from 'lucide-react';
import type { CollectionItem } from '@/lib/collections-api';
import { AddContentDialog } from './AddContentDialog';

interface Props {
  collectionId: string;
  items: CollectionItem[];
}

export const CollectionContentPanel: React.FC<Props> = ({ collectionId, items }) => {
  const { removeItem, generateEmbeddings, refreshItemStatus } = useCollections();
  const [showAddContent, setShowAddContent] = useState(false);
  const [processingItems, setProcessingItems] = useState<Set<string>>(new Set());

  const handleGenerateEmbeddings = async (itemId: string) => {
    setProcessingItems(prev => new Set(prev).add(itemId));
    try {
      await generateEmbeddings(collectionId, itemId);

      // Poll for status updates
      const pollInterval = setInterval(async () => {
        await refreshItemStatus(collectionId, itemId);

        // Check if done
        const item = items.find(i => i.id === itemId);
        if (item && (item.hasEmbeddings || item.embeddingsError)) {
          clearInterval(pollInterval);
          setProcessingItems(prev => {
            const newSet = new Set(prev);
            newSet.delete(itemId);
            return newSet;
          });
        }
      }, 2000);

      // Cleanup after 30 seconds max
      setTimeout(() => {
        clearInterval(pollInterval);
        setProcessingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      }, 30000);
    } catch (error) {
      setProcessingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const handleRemoveItem = async (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Remove this item from the collection?')) return;

    try {
      await removeItem(collectionId, itemId);
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };

  const getSourceTypeIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'note':
        return '📝';
      case 'pdf':
        return '📄';
      case 'image':
        return '🖼️';
      case 'url':
        return '🔗';
      default:
        return '📎';
    }
  };

  const canAddMore = items.length < 20;

  return (
    <div className="p-4 space-y-2">
      <Button
        className="w-full"
        variant="outline"
        onClick={() => setShowAddContent(true)}
        disabled={!canAddMore}
      >
        <PlusIcon className="mr-2 h-4 w-4" />
        Add Content
      </Button>

      {!canAddMore && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Maximum 20 items reached
        </p>
      )}

      <div className="space-y-2 mt-4">
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <FileIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No content yet
          </div>
        ) : (
          items.map(item => (
            <div
              key={item.id}
              className="p-3 border rounded-lg hover:bg-secondary/50 group"
            >
              <div className="flex items-start gap-2">
                <span className="text-lg shrink-0">{getSourceTypeIcon(item.sourceType)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item.title || 'Untitled'}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {item.sourceType}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {/* Embeddings Status */}
                  {item.hasEmbeddings ? (
                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  ) : item.embeddingsError ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2"
                      onClick={() => handleGenerateEmbeddings(item.id)}
                      title={item.embeddingsError}
                    >
                      <AlertCircleIcon className="h-3 w-3 text-destructive" />
                    </Button>
                  ) : processingItems.has(item.id) ? (
                    <LoaderIcon className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2"
                      onClick={() => handleGenerateEmbeddings(item.id)}
                    >
                      <span className="text-xs">Generate</span>
                    </Button>
                  )}

                  {/* Remove Button */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                    onClick={(e) => handleRemoveItem(item.id, e)}
                  >
                    <XIcon className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <AddContentDialog
        open={showAddContent}
        onClose={() => setShowAddContent(false)}
        collectionId={collectionId}
      />
    </div>
  );
};
