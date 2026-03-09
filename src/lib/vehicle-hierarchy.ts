/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Build a tree hierarchy from a flat list of entities.
 * Entities with no parentEntityId (or whose parent is not in the list) become roots.
 * Each entity gets a `childEntities` array containing its direct children.
 */
export function buildTree(entities: any[]): any[] {
  const map = new Map(entities.map((e) => [e.id, { ...e, childEntities: [] as any[] }]));
  const roots: any[] = [];
  for (const entity of map.values()) {
    if (entity.parentEntityId && map.has(entity.parentEntityId)) {
      map.get(entity.parentEntityId)!.childEntities.push(entity);
    } else {
      roots.push(entity);
    }
  }
  return roots;
}
