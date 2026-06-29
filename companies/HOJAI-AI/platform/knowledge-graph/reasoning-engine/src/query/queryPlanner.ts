// Query Planner - Optimize multi-hop graph queries

export interface QueryPlan {
  id: string;
  operations: QueryOperation[];
  estimatedCost: number;
  estimatedTime: number;
}

export interface QueryOperation {
  type: 'scan' | 'index' | 'join' | 'filter' | 'project' | 'sort' | 'limit';
  nodeType?: string;
  property?: string;
  value?: any;
  cost: number;
}

export interface GraphQuery {
  start: string;
  hops: Hop[];
  filters?: Filter[];
  return?: string[];
  limit?: number;
}

export interface Hop {
  edgeType: string;
  direction?: 'out' | 'in' | 'both';
  nodeType?: string;
}

export interface Filter {
  property: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';
  value: any;
}

// Optimize query execution plan
export function optimizeQuery(query: GraphQuery): QueryPlan {
  const operations: QueryOperation[] = [];
  let estimatedCost = 0;

  // Start with index scan if possible
  if (query.start) {
    operations.push({
      type: 'scan',
      nodeType: query.start,
      cost: 1
    });
    estimatedCost += 1;
  }

  // Plan hops
  for (const hop of query.hops) {
    operations.push({
      type: 'join',
      nodeType: hop.nodeType,
      cost: 10 * (estimatedCost || 1)
    });
    estimatedCost *= 10;
  }

  // Apply filters as early as possible
  if (query.filters) {
    for (const filter of query.filters) {
      operations.push({
        type: 'filter',
        property: filter.property,
        value: filter.value,
        cost: 5
      });
      estimatedCost += 5;
    }
  }

  // Project only needed properties
  if (query.return) {
    operations.push({
      type: 'project',
      property: query.return.join(','),
      cost: 1
    });
  }

  // Sort and limit
  if (query.limit) {
    operations.push({
      type: 'limit',
      value: query.limit,
      cost: 1
    });
  }

  return {
    id: `plan-${Date.now()}`,
    operations,
    estimatedCost,
    estimatedTime: estimatedCost * 0.1 // ms estimate
  };
}

// Execute query plan
export async function executePlan(
  plan: QueryPlan,
  graph: { nodes: any[]; edges: any[] }
): Promise<any[]> {
  let results: any[] = graph.nodes;

  for (const op of plan.operations) {
    switch (op.type) {
      case 'scan':
        results = results.filter(n => !op.nodeType || n.type === op.nodeType);
        break;
      case 'join':
        if (op.nodeType) {
          results = results.filter(n => !n.type || n.type === op.nodeType);
        }
        break;
      case 'filter':
        if (op.property && op.value !== undefined) {
          results = results.filter(n => {
            const val = n[op.property!];
            return val === op.value;
          });
        }
        break;
      case 'project':
        results = results.map(n => {
          const projected: any = {};
          if (op.property) {
            for (const p of op.property.split(',')) {
              projected[p] = n[p];
            }
          }
          return projected;
        });
        break;
      case 'limit':
        if (op.value) {
          results = results.slice(0, op.value);
        }
        break;
    }
  }

  return results;
}
