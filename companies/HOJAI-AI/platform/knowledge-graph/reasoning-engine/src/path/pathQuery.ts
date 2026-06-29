// Path Query Engine - Find paths between entities

export interface GraphNode {
  id: string;
  type: string;
  properties: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  properties: Record<string, any>;
  weight?: number;
}

export interface Path {
  nodes: GraphNode[];
  edges: GraphEdge[];
  totalWeight: number;
  length: number;
}

// Find all simple paths between two nodes (limited depth)
export function findAllPaths(
  start: string,
  end: string,
  graph: { nodes: GraphNode[]; edges: GraphEdge[] },
  maxDepth: number = 5
): Path[] {
  const paths: Path[] = [];
  const visited = new Set<string>();

  function dfs(current: string, target: string, depth: number, path: Path): void {
    if (depth > maxDepth) return;
    if (current === target && path.nodes.length > 1) {
      paths.push({ ...path });
      return;
    }

    visited.add(current);

    const outgoingEdges = graph.edges.filter(e => e.source === current);
    const incomingEdges = graph.edges.filter(e => e.target === current);

    for (const edge of [...outgoingEdges, ...incomingEdges]) {
      const nextNode = edge.source === current ? edge.target : edge.source;
      if (visited.has(nextNode)) continue;

      const node = graph.nodes.find(n => n.id === nextNode);
      if (!node) continue;

      path.nodes.push(node);
      path.edges.push(edge);
      path.totalWeight += edge.weight || 1;
      path.length = path.nodes.length - 1;

      dfs(nextNode, target, depth + 1, path);

      path.nodes.pop();
      path.edges.pop();
      path.totalWeight -= edge.weight || 1;
      path.length = path.nodes.length - 1;
    }

    visited.delete(current);
  }

  const startNode = graph.nodes.find(n => n.id === start);
  const endNode = graph.nodes.find(n => n.id === end);
  if (!startNode || !endNode) return paths;

  dfs(start, end, 0, {
    nodes: [startNode],
    edges: [],
    totalWeight: 0,
    length: 0
  });

  return paths;
}

// Find shortest path using BFS
export function shortestPath(
  start: string,
  end: string,
  graph: { nodes: GraphNode[]; edges: GraphEdge[] }
): Path | null {
  const queue: { node: string; path: Path }[] = [];
  const visited = new Set<string>();

  const startNode = graph.nodes.find(n => n.id === start);
  const endNode = graph.nodes.find(n => n.id === end);
  if (!startNode || !endNode) return null;

  queue.push({
    node: start,
    path: { nodes: [startNode], edges: [], totalWeight: 0, length: 0 }
  });
  visited.add(start);

  while (queue.length > 0) {
    const { node, path } = queue.shift()!;

    if (node === end) return path;

    const edges = graph.edges.filter(e => e.source === node || e.target === node);

    for (const edge of edges) {
      const nextNode = edge.source === node ? edge.target : edge.source;
      if (visited.has(nextNode)) continue;

      visited.add(nextNode);
      const nextGraphNode = graph.nodes.find(n => n.id === nextNode)!;

      queue.push({
        node: nextNode,
        path: {
          nodes: [...path.nodes, nextGraphNode],
          edges: [...path.edges, edge],
          totalWeight: path.totalWeight + (edge.weight || 1),
          length: path.length + 1
        }
      });
    }
  }

  return null;
}

// Find paths matching a pattern
export function findPatternPaths(
  pattern: string[],
  graph: { nodes: GraphNode[]; edges: GraphEdge[] },
  nodeTypes: string[]
): Path[] {
  const paths: Path[] = [];

  // Find all paths starting from nodes matching first pattern element
  for (const startNode of graph.nodes) {
    if (!matchesNodeType(startNode, pattern[0], nodeTypes)) continue;

    const allPaths = findAllPaths(startNode.id, '', graph, pattern.length);
    for (const path of allPaths) {
      if (matchesPattern(path, pattern, nodeTypes)) {
        paths.push(path);
      }
    }
  }

  return paths;
}

function matchesNodeType(node: GraphNode, pattern: string, nodeTypes: string[]): boolean {
  if (pattern === '*') return true;
  const typeIndex = nodeTypes.indexOf(pattern);
  return typeIndex >= 0 && node.type === nodeTypes[typeIndex];
}

function matchesPattern(path: Path, pattern: string[], nodeTypes: string[]): boolean {
  if (path.nodes.length !== pattern.length) return false;

  for (let i = 0; i < path.nodes.length; i++) {
    if (!matchesNodeType(path.nodes[i], pattern[i], nodeTypes)) {
      return false;
    }
  }

  return true;
}
