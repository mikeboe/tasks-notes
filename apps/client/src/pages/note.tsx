import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { NotesApi } from "@/lib/notes-api";
import { AssetsApi } from "@/lib/assets-api";
import { TasksApi } from "@/lib/tasks-api";
import { type Note, type Tag } from "@/types/index";
import "@blocknote/core/fonts/inter.css";

import {
  useCreateBlockNote,
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  type DefaultReactSuggestionItem,
} from "@blocknote/react";
import { BlockNoteEditor, filterSuggestionItems } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import debounce from "lodash.debounce";
import { useNotes } from "@/context/NotesContext";
import { Skeleton } from "@/components/ui/skeleton";
import { NavActions } from "@/components/nav-actions";
import { TagsCombobox } from "@/components/tasks/tags-combobox";
import { useTeamContext } from "@/hooks/use-team-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tag as TagIcon, FileText } from "lucide-react";
import { ContentExtractionModal } from "@/components/editor/content-extraction-modal";
import { parseMarkdownToBlocks } from "@/lib/markdown-parser";
import toast from "react-hot-toast";

const NotePage = () => {
  const { id } = useParams<{ id: string }>();
  const { teamId } = useTeamContext();
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isTagModalOpen, setIsTagModalOpen] = useState<boolean>(false);
  const [isExtractionModalOpen, setIsExtractionModalOpen] = useState<boolean>(false);
  const { updateNoteTitleInTree } = useNotes();

  // Upload file function for BlockNote
  const uploadFile = async (file: File): Promise<string> => {
    const response = await AssetsApi.uploadFile(file);
    if (response.success && response.data) {
      return response.data.s3Url; // Return the S3 URL directly for immediate display
    }
    throw new Error(response.error || "Failed to upload file");
  };

  // Resolve file URL function for BlockNote
  const resolveFileUrl = async (url: string): Promise<string> => {
    // If url is already a full URL, return it
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // Otherwise, treat it as an asset ID and fetch the asset
    const response = await AssetsApi.getAsset(url);
    if (response.success && response.data) {
      return response.data.s3Url;
    }
    throw new Error(response.error || "Failed to resolve file URL");
  };

  // Creates a new editor instance with upload and resolve functions
  const editor = useCreateBlockNote({
    uploadFile,
    resolveFileUrl,
  });

  useEffect(() => {
    if (id) {
      setIsLoading(true);
      const fetchNote = async () => {
        try {
          const [noteResponse, tagsResponse] = await Promise.all([
            NotesApi.getNoteById(id),
            TasksApi.getTags(teamId)
          ]);

          if (noteResponse.success && noteResponse.data) {
            setNote(noteResponse.data);
            setTitle(noteResponse.data.title);
            setSelectedTagIds(noteResponse.data.tags?.map(t => t.id) || []);

            // Load the content into the editor
            if (noteResponse.data.content) {
              try {
                const blocks = JSON.parse(noteResponse.data.content);
                editor.replaceBlocks(editor.document, blocks);
              } catch (e) {
                console.error("Error parsing note content:", e);
                editor.replaceBlocks(editor.document, [{ type: "paragraph", content: "" }]);
              }
            } else {
              editor.replaceBlocks(editor.document, [{ type: "paragraph", content: "" }]);
            }
          }

          if (tagsResponse.success && tagsResponse.data) {
            setTags(tagsResponse.data);
          }
        } catch (error) {
          console.error("Failed to fetch note:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchNote();
    } else {
      setIsLoading(false);
    }
  }, [id, editor, teamId]);

  const debouncedSaveContent = useMemo(
    () =>
      debounce(async (currentEditor: BlockNoteEditor) => {
        if (id) {
          const searchableContent = await currentEditor.blocksToMarkdownLossy();
          const content = JSON.stringify(currentEditor.document);
          await NotesApi.updateNote(id, { content, searchableContent });
        }
      }, 200),
    [id]
  );

  const debouncedSaveTitle = useMemo(
    () =>
      debounce(async (newTitle: string) => {
        if (id) {
          await NotesApi.updateNote(id, { title: newTitle });
          updateNoteTitleInTree(id, newTitle); // Update the title in the tree view
        }
      }, 200),
    [id, updateNoteTitleInTree]
  );

  const handleEditorChange = () => {
    debouncedSaveContent(editor);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    debouncedSaveTitle(newTitle);
  };

  const handleTagsChange = async (tagIds: string[]) => {
    setSelectedTagIds(tagIds);
    if (id) {
      await NotesApi.updateNote(id, { tag_ids: tagIds });
      // Update local note state
      const updatedTags = tags.filter(tag => tagIds.includes(tag.id));
      setNote(prev => prev ? { ...prev, tags: updatedTags } : null);
    }
  };

  const loadTagsOnly = async () => {
    try {
      const tagsResponse = await TasksApi.getTags(teamId);
      if (tagsResponse.success && tagsResponse.data) {
        setTags(tagsResponse.data);
      }
    } catch (error) {
      console.error("Failed to reload tags:", error);
    }
  };

  const handleExtractionSuccess = (markdown: string, metadata: any) => {
    try {
      // Parse markdown to BlockNote blocks
      const blocks = parseMarkdownToBlocks(markdown);

      // Get current cursor position
      const currentBlock = editor.getTextCursorPosition().block;

      // Insert blocks after current block
      editor.insertBlocks(blocks, currentBlock, "after");

      // Move cursor to the end of inserted content
      const lastInsertedBlock = blocks[blocks.length - 1];
      if (lastInsertedBlock) {
        editor.setTextCursorPosition(lastInsertedBlock, "end");
      }

      // Save the updated content
      debouncedSaveContent(editor);

      toast.success(`Content extracted from ${metadata.extractionType}!`);
    } catch (error) {
      console.error("Failed to insert extracted content:", error);
      toast.error("Failed to insert content into note");
    }
  };

  // Custom slash menu item for content extraction
  const extractContentSlashItem = (): DefaultReactSuggestionItem => ({
    title: "Extract Content",
    onItemClick: () => {
      setIsExtractionModalOpen(true);
    },
    aliases: ["extract", "ocr", "scrape", "url", "pdf", "image"],
    group: "Advanced",
    icon: <FileText size={18} />,
    subtext: "Extract text from URLs, PDFs, or images",
  });

  // Get custom slash menu items including default ones
  const getCustomSlashMenuItems = (editor: BlockNoteEditor): DefaultReactSuggestionItem[] => [
    ...getDefaultReactSlashMenuItems(editor),
    extractContentSlashItem(),
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <div className="w-full max-w-4xl space-y-4 px-[54px]">
          <Skeleton className="h-8 w-3/4" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  const selectedTags = tags.filter(tag => selectedTagIds.includes(tag.id));

  return (
    <div className="flex justify-center p-4">
      <div className="w-full max-w-4xl">
        {note ? (
          <div>
            <div className="flex px-[54px]">
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                className="text-2xl font-bold mb-4 w-full border-none focus:ring-0 focus:outline-none bg-transparent"
              />
              <div className="ml-auto px-3">
                <NavActions note={note} />
              </div>
            </div>

            {/* Display Selected Tags */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 px-[54px] mb-4">
                {selectedTags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="flex items-center gap-1 cursor-pointer hover:bg-secondary/80"
                    onClick={() => setIsTagModalOpen(true)}
                  >
                    <TagIcon className="h-3 w-3" />
                    <span>{tag.name}</span>
                  </Badge>
                ))}
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => setIsTagModalOpen(true)}
                >
                  + Add tag
                </Badge>
              </div>
            )}

            {/* Add tag button when no tags */}
            {selectedTags.length === 0 && (
              <div className="px-[54px] mb-4">
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => setIsTagModalOpen(true)}
                >
                  <TagIcon className="h-3 w-3 mr-1" />
                  Add tags
                </Badge>
              </div>
            )}

            <BlockNoteView editor={editor} onChange={handleEditorChange} slashMenu={false}>
              <SuggestionMenuController
                triggerCharacter={"/"}
                getItems={async (query) =>
                  filterSuggestionItems(getCustomSlashMenuItems(editor), query)
                }
              />
            </BlockNoteView>
          </div>
        ) : (
          <div className="text-center">
            <p>Note not found</p>
          </div>
        )}
      </div>

      {/* Content Extraction Modal */}
      <ContentExtractionModal
        open={isExtractionModalOpen}
        onClose={() => setIsExtractionModalOpen(false)}
        onSuccess={handleExtractionSuccess}
      />

      {/* Tags Modal */}
      <Dialog open={isTagModalOpen} onOpenChange={setIsTagModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Tags</DialogTitle>
          </DialogHeader>
          <TagsCombobox
            selectedTagIds={selectedTagIds}
            onTagsChange={handleTagsChange}
            availableTags={tags}
            onTagsUpdated={loadTagsOnly}
            label="Tags"
            placeholder="Search and select tags..."
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotePage;
