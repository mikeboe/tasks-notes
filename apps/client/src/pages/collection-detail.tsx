import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useCollections } from '@/context/CollectionsContext';
import { CollectionContentPanel } from '@/components/collections/CollectionContentPanel';
import { CollectionChatPanel } from '@/components/collections/CollectionChatPanel';
import { CollectionTasksPanel } from '@/components/collections/CollectionTasksPanel';

const CollectionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { currentCollection, items, tasks, isLoading, loadCollection, startPollingTasks, stopPollingTasks } = useCollections();

  useEffect(() => {
    if (id) {
      loadCollection(id);
      startPollingTasks(id);
    }

    return () => {
      stopPollingTasks();
    };
  }, [id]);

  if (isLoading && !currentCollection) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-muted-foreground">Loading collection...</div>
      </div>
    );
  }

  if (!currentCollection) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-muted-foreground">Collection not found</div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Left Column: Content Selection (25%) */}
      <div className="w-1/4 border-r flex flex-col overflow-hidden">
        <div className="p-4 border-b shrink-0">
          <h2 className="text-lg font-semibold">Content</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {items.length}/20 items
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <CollectionContentPanel
            collectionId={id!}
            items={items}
          />
        </div>
      </div>

      {/* Middle Column: Chat (50%) */}
      <div className="w-1/2 flex flex-col overflow-hidden">
        <div className="p-4 border-b shrink-0">
          <h2 className="text-lg font-semibold">{currentCollection.title}</h2>
          {currentCollection.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {currentCollection.description}
            </p>
          )}
        </div>
        <div className="flex-1 overflow-hidden">
          <CollectionChatPanel collectionId={id!} />
        </div>
      </div>

      {/* Right Column: Long-Running Tasks (25%) */}
      <div className="w-1/4 border-l flex flex-col overflow-hidden">
        <div className="p-4 border-b shrink-0">
          <h2 className="text-lg font-semibold">Tasks</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {tasks.filter(t => t.status === 'running').length} running
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <CollectionTasksPanel
            collectionId={id!}
            tasks={tasks}
          />
        </div>
      </div>
    </div>
  );
};

export default CollectionDetail;
