import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { NotesApi } from "@/lib/notes-api";
import { type Note } from "@/types/index";
import "@blocknote/core/fonts/inter.css";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import debounce from "lodash.debounce";
import { useNotes } from "@/context/NotesContext";
import { Skeleton } from "@/components/ui/skeleton";
import { NavActions } from "@/components/nav-actions";

const NotePage = () => {
  const { id } = useParams<{ id: string }>();
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { updateNoteTitleInTree } = useNotes();

  // Creates a new editor instance.
  const editor = useCreateBlockNote();

  useEffect(() => {
    if (id) {
      setIsLoading(true);
      const fetchNote = async () => {
        try {
          const response = await NotesApi.getNoteById(id);
          if (response.success && response.data) {
            setNote(response.data);
            setTitle(response.data.title);
            // Load the content into the editor
            if (response.data.content) {
              try {
                const blocks = JSON.parse(response.data.content);
                editor.replaceBlocks(editor.document, blocks);
              } catch (e) {
                console.error("Error parsing note content:", e);
                editor.replaceBlocks(editor.document, [{ type: "paragraph", content: "" }]);
              }
            } else {
              editor.replaceBlocks(editor.document, [{ type: "paragraph", content: "" }]);
            }
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
  }, [id, editor]);

  const debouncedSaveContent = useMemo(
    () =>
      debounce(async (currentEditor: BlockNoteEditor) => {
        if (id) {
          const content = JSON.stringify(currentEditor.document);
          await NotesApi.updateNote(id, { content });
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
            <BlockNoteView editor={editor} onChange={handleEditorChange} />
          </div>
        ) : (
          <div className="text-center">
            <p>Note not found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotePage;
