import Dexie, { type EntityTable } from "dexie";
import type { ShapeNode, FlowEdge } from "./features/editor/store";

export interface ProjectData {
  nodes: ShapeNode[];
  edges: FlowEdge[];
  zoom?: number;
  cursor?: { x: number; y: number };
}

export interface Project {
  id: string;
  name: string;
  thumbnail: string | null;
  lastModified: number;
  createdAt: number;
  objectCount: number;
  isFavorite: boolean;
  data: ProjectData;
}

const db = new Dexie("FlowchartEditorDB") as Dexie & {
  projects: EntityTable<Project, "id">;
};

// Define indexed fields
db.version(1).stores({
  projects: "id, name, lastModified, createdAt, isFavorite",
});

export { db };
