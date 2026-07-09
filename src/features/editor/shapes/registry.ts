import type { ShapeKind } from "../types";
import type { ShapeDefinition } from "./types";

class ShapeRegistryImpl {
  private shapes = new Map<ShapeKind, ShapeDefinition>();

  register(def: ShapeDefinition) {
    this.shapes.set(def.type, def);
  }

  get(type: ShapeKind): ShapeDefinition | undefined {
    return this.shapes.get(type);
  }

  getAll(): ShapeDefinition[] {
    return Array.from(this.shapes.values());
  }

  has(type: ShapeKind): boolean {
    return this.shapes.has(type);
  }
}

export const ShapeRegistry = new ShapeRegistryImpl();
