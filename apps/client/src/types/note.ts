import type { Tag } from "./index";

export interface Note {
  id: string;
  title: string;
  content?: string;
  searchableContent?: string;
  userId: string;
  parentId?: string;
  order: number;
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
  children?: Note[];
  tags?: Tag[];
}
