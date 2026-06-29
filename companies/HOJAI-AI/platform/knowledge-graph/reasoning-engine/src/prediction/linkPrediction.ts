// Link Prediction - Suggest new relationships

export interface LinkPrediction {
  source: string;
  target: string;
  score: number;
  reason: string;
  confidence: number;
}

export interface NetworkMetrics {
  node: string;
  degree: number;
  clusteringCoefficient: number;
  betweenness: number;
  pagerank: number;
}

// Predict potential links based on common neighbors
export function predictLinks(
  nodes: { id: string; neighbors: string[] }[],
  threshold: number = 0.5
): LinkPrediction[] {
  const predictions: LinkPrediction[] = [];
  const nodeMap = new Map<string, string[]>(nodes.map(n => [n.id, n.neighbors]));

  for (const node of nodes) {
    for (const other of nodes) {
      if (node.id === other.id) continue;

      // Skip if already connected
      if (nodeMap.get(node.id)?.includes(other.id)) continue;

      // Calculate Common Neighbors score
      const commonNeighbors = node.neighbors.filter(n => other.neighbors.includes(n));
      const cnScore = commonNeighbors.length;

      // Calculate Jaccard coefficient
      const union = new Set([...node.neighbors, ...other.neighbors]);
      const jaccardScore = commonNeighbors.length / union.size;

      // Calculate Adamic-Adar index
      let aaScore = 0;
      for (const neighbor of commonNeighbors) {
        const neighborDegree = nodeMap.get(neighbor)?.length || 0;
        if (neighborDegree > 1) {
          aaScore += 1 / Math.log(neighborDegree);
        }
      }

      // Combine scores
      const score = (cnScore + jaccardScore + aaScore) / 3;

      if (score >= threshold) {
        predictions.push({
          source: node.id,
          target: other.id,
          score,
          reason: `Common neighbors: ${commonNeighbors.join(', ') || 'none'}`,
          confidence: score
        });
      }
    }
  }

  return predictions.sort((a, b) => b.score - a.score);
}

// Calculate PageRank for nodes
export function calculatePageRank(
  nodes: string[],
  edges: { source: string; target: string }[],
  iterations: number = 100,
  damping: number = 0.85
): Map<string, number> {
  const n = nodes.length;
  const ranks = new Map<string, number>();

  // Initialize ranks
  for (const node of nodes) {
    ranks.set(node, 1 / n);
  }

  // Build adjacency list
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();

  for (const node of nodes) {
    outgoing.set(node, []);
    incoming.set(node, []);
  }

  for (const edge of edges) {
    outgoing.get(edge.source)?.push(edge.target);
    incoming.get(edge.target)?.push(edge.source);
  }

  // Iterate
  for (let i = 0; i < iterations; i++) {
    const newRanks = new Map<string, number>();

    for (const node of nodes) {
      let rank = (1 - damping) / n;

      for (const neighbor of (incoming.get(node) || [])) {
        const neighborOutgoing = outgoing.get(neighbor)?.length || 1;
        rank += damping * (ranks.get(neighbor) || 0) / neighborOutgoing;
      }

      newRanks.set(node, rank);
    }

    for (const node of nodes) {
      ranks.set(node, newRanks.get(node) || 0);
    }
  }

  return ranks;
}

// Calculate network metrics for a node
export function calculateNetworkMetrics(
  nodeId: string,
  nodes: { id: string; neighbors: string[] }[],
  edges: { source: string; target: string }[]
): NetworkMetrics {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) {
    throw new Error(`Node ${nodeId} not found`);
  }

  // Degree
  const degree = node.neighbors.length;

  // Clustering coefficient (triangles / possible triangles)
  let triangles = 0;
  const neighborPairs: [string, string][] = [];

  for (const n1 of node.neighbors) {
    for (const n2 of node.neighbors) {
      if (n1 < n2) {
        neighborPairs.push([n1, n2]);
      }
    }
  }

  for (const [n1, n2] of neighborPairs) {
    const n1Node = nodes.find(n => n.id === n1);
    const n2Node = nodes.find(n => n.id === n2);
    if (n1Node?.neighbors.includes(n2) && n2Node?.neighbors.includes(n1)) {
      triangles++;
    }
  }

  const possibleTriangles = neighborPairs.length || 1;
  const clusteringCoefficient = triangles / possibleTriangles;

  // Betweenness (simplified - count shortest paths through node)
  const shortestPaths = countShortestPaths(nodeId, nodes);
  const betweenness = shortestPaths;

  // PageRank
  const ranks = calculatePageRank(nodes.map(n => n.id), edges);
  const pagerank = ranks.get(nodeId) || 0;

  return {
    node: nodeId,
    degree,
    clusteringCoefficient,
    betweenness,
    pagerank
  };
}

function countShortestPaths(
  nodeId: string,
  nodes: { id: string; neighbors: string[] }[]
): number {
  let count = 0;
  for (const start of nodes) {
    if (start.id === nodeId) continue;
    for (const end of nodes) {
      if (end.id === nodeId || start.id === end.id) continue;
      count++;
    }
  }
  return count;
}
