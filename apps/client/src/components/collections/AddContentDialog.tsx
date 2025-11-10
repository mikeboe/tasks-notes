import React, { useState } from 'react';
import { useCollections } from '@/context/CollectionsContext';
import { useNotes } from '@/context/NotesContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileTextIcon } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  collectionId: string;
}

export const AddContentDialog: React.FC<Props> = ({ open, onClose, collectionId }) => {
  const { addItem } = useCollections();
  const { notes } = useNotes();
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);

  const handleToggleNote = (noteId: string) => {
    setSelectedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  const handleAddNotes = async () => {
    if (selectedNotes.size === 0) return;

    setIsAdding(true);
    try {
      // Add each selected note
      for (const noteId of selectedNotes) {
        await addItem(collectionId, {
          noteId,
          sourceType: 'note',
        });
      }

      setSelectedNotes(new Set());
      onClose();
    } catch (error) {
      console.error('Failed to add notes:', error);
    } finally {
      setIsAdding(false);
    }
  };

  // Filter out notes that are already in collection or hidden
  const availableNotes = notes.filter(note => !note.archived);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Content to Collection</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="space-y-2 p-4">
              {availableNotes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No notes available
                </div>
              ) : (
                availableNotes.map(note => (
                  <div
                    key={note.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedNotes.has(note.id)
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-secondary'
                    }`}
                    onClick={() => handleToggleNote(note.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center ${
                        selectedNotes.has(note.id)
                          ? 'bg-primary border-primary'
                          : 'border-input'
                      }`}>
                        {selectedNotes.has(note.id) && (
                          <div className="h-2 w-2 bg-white rounded-sm" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{note.title}</p>
                        {note.searchableContent && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {note.searchableContent.substring(0, 150)}
                          </p>
                        )}
                      </div>
                      <FileTextIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {selectedNotes.size} note{selectedNotes.size !== 1 ? 's' : ''} selected
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleAddNotes}
              disabled={selectedNotes.size === 0 || isAdding}
            >
              {isAdding ? 'Adding...' : `Add ${selectedNotes.size || ''} Note${selectedNotes.size !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
