/**
 * Build a tree hierarchy from a flat list of entities.
 * Entities with no parentEntityId (or whose parent is not in the list) become roots.
 * Each entity gets a `childEntities` array containing its direct children.
 */

/** Minimal shape required to build the entity hierarchy tree. */
interface EntityNode {
  id: string;
  parentEntityId?: string | null;
  childEntities?: EntityNode[];
  [key: string]: unknown;
}

export function buildTree(entities: EntityNode[]): EntityNode[] {
  const map = new Map(
    entities.map((e) => [e.id, { ...e, childEntities: [] as EntityNode[] }])
  );
  const roots: EntityNode[] = [];
  for (const entity of map.values()) {
    if (entity.parentEntityId && map.has(entity.parentEntityId)) {
      map.get(entity.parentEntityId)!.childEntities!.push(entity);
    } else {
      roots.push(entity);
    }
  }
  return roots;
}
