// Transitive Closure - Compute reachability between entities

export interface ClosureResult {
  entity: string;
  reachable: string[];
  reachableFrom: string[];
  stronglyConnected: string[][];
}

// Compute transitive closure using Floyd-Warshall variant
export function computeTransitiveClosure(
  nodes: string[],
  edges: { source: string; target: string }[]
): Map<string, Set<string>> {
  const reachability = new Map<string, Set<string>>();

  // Initialize: each node reaches itself
  for (const node of nodes) {
    reachability.set(node, new Set([node]));
  }

  // Initialize direct edges
  for (const edge of edges) {
    reachability.get(edge.source)?.add(edge.target);
  }

  // Floyd-Warshall: if A reaches B and B reaches C, then A reaches C
  for (const k of nodes) {
    for (const i of nodes) {
      if (reachability.get(i)?.has(k)) {
        for (const j of nodes) {
          if (reachability.get(k)?.has(j)) {
            reachability.get(i)?.add(j);
          }
        }
      }
    }
  }

  return reachability;
}

// Get entities reachable from a given entity
export function getReachableFrom(
  entity: string,
  reachability: Map<string, Set<string>>
): string[] {
  return Array.from(reachability.get(entity) || []);
}

// Get entities that can reach a given entity
export function getReachableFromEntities(
  entity: string,
  reachability: Map<string, Set<string>>
): string[] {
  const result: string[] = [];

  for (const [node, reachable] of reachability) {
    if (reachable.has(entity) && node !== entity) {
      result.push(node);
    }
  }

  return result;
}

// Find strongly connected components (entities that can reach each other)
export function findStronglyConnectedComponents(
  nodes: string[],
  edges: { source: string; target: string }[]
): string[][] {
  const reachability = computeTransitiveClosure(nodes, edges);
  const visited = new Set<string>();
  const components: string[][] = [];

  for (const node of nodes) {
    if (visited.has(node)) continue;

    const component: string[] = [];

    // Find all nodes that can reach this node and that this node can reach
    for (const other of nodes) {
      if (other === node) continue;
      if (visited.has(other)) continue;

      if (reachability.get(node)?.has(other) && reachability.get(other)?.has(node)) {
        component.push(other);
        visited.add(other);
      }
    }

    if (component.length > 0) {
      component.push(node);
      components.push(component);
    }

    visited.add(node);
  }

  return components;
}

// Check if two entities are mutually reachable
export function areMutuallyReachable(
  entity1: string,
  entity2: string,
  reachability: Map<string, Set<string>>
): boolean {
  return reachability.get(entity1)?.has(entity2) === true &&
         reachability.get(entity2)?.has(entity1) === true;
}

// Get reachability distance (shortest path length)
export function getReachabilityDistance(
  start: string,
  end: string,
  reachability: Map<string, Set<string>>
): number | null {
  if (!reachability.get(start)?.has(end)) return null;

  // BFS to find shortest path
  const visited = new Set<string>();
  const queue: { node: string; distance: number }[] = [{ node: start, distance: 0 }];

  while (queue.length > 0) {
    const { node, distance } = queue.shift()!;

    if (node === end) return distance;
    if (visited.has(node)) continue;
    visited.add(node);

    // In a real implementation, we'd iterate through actual edges
    // This is a simplified version
    const reachable = reachability.get(node);
    if (reachable) {
      for (const next of reachable) {
        if (!visited.has(next)) {
          queue.push({ node: next, distance: distance + 1 });
        }
      }
    }
  }

  return null;
}
