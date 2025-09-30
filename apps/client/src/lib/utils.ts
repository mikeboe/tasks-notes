import { type Note } from "@/types/index";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function buildTree(notes: Note[]): Note[] {
  const noteMap = new Map(notes.map(note => [note.id, { ...note, children: [] as Note[] }]));
  const tree: Note[] = [];

  for (const note of noteMap.values()) {
    if (note.parentId && noteMap.has(note.parentId)) {
      noteMap.get(note.parentId)!.children.push(note);
    } else {
      tree.push(note);
    }
  }

  return tree;
}
