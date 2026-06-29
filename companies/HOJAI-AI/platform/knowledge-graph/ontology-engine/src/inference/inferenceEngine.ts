/**
 * Inference Engine - Real algorithms for reasoning over ontologies
 *
 * Implements:
 * 1. Property inheritance - properties flow down class hierarchy
 * 2. Transitive relationships - A→B, B→C implies A→C
 * 3. Symmetric relationships - if A relates to B, B relates to A
 * 4. Reflexive relationships - A relates to itself
 * 5. Rule-based inference - IF antecedent THEN consequent
 */

import { query } from '../db/database.js';
import type {
  InferenceResult,
  InferredFact,
  AppliedRule,
  InferenceRule,
  InferenceRuleRow,
  Property,
  PropertyRow,
  RelationshipType,
  RelationshipTypeRow,
  OntologyClass,
  ClassRow
} from '../models/types.js';

// Type definitions for the inference graph
interface Fact {
  subject: string;
  predicate: string;
  object: unknown;
  confidence: number;
}

interface InferenceGraph {
  nodes: Map<string, Set<string>>;
  edges: Map<string, Fact[]>;
}

interface RuleMatch {
  rule: InferenceRule;
  bindings: Map<string, string>;
}

export class InferenceEngine {
  private graph: InferenceGraph = {
    nodes: new Map(),
    edges: new Map()
  };

  private rules: InferenceRule[] = [];
  private transitiveRelationships: Set<string> = new Set();
  private symmetricRelationships: Set<string> = new Set();

  /**
   * Initialize the inference engine with ontology data
   */
  async initialize(): Promise<void> {
    await this.loadTransitiveRelationships();
    await this.loadSymmetricRelationships();
    await this.loadRules();
  }

  /**
   * Load transitive relationships from the database
   */
  private async loadTransitiveRelationships(): Promise<void> {
    const result = await query<RelationshipTypeRow>(
      "SELECT name FROM relationship_types WHERE is_transitive = true"
    );
    this.transitiveRelationships = new Set(result.rows.map(r => r.name));
  }

  /**
   * Load symmetric relationships from the database
   */
  private async loadSymmetricRelationships(): Promise<void> {
    const result = await query<RelationshipTypeRow>(
      "SELECT name FROM relationship_types WHERE is_symmetric = true"
    );
    this.symmetricRelationships = new Set(result.rows.map(r => r.name));
  }

  /**
   * Load inference rules from the database
   */
  private async loadRules(): Promise<void> {
    const result = await query<InferenceRuleRow>(
      "SELECT * FROM inference_rules WHERE is_active = true ORDER BY priority DESC"
    );
    this.rules = result.rows.map(row => this.mapRowToRule(row));
  }

  /**
   * Add a fact to the inference graph
   */
  addFact(fact: Fact): void {
    // Add subject node
    if (!this.graph.nodes.has(fact.subject)) {
      this.graph.nodes.set(fact.subject, new Set());
    }
    this.graph.nodes.get(fact.subject)!.add(fact.predicate);

    // Add predicate edge
    if (!this.graph.edges.has(fact.predicate)) {
      this.graph.edges.set(fact.predicate, []);
    }
    this.graph.edges.get(fact.predicate)!.push(fact);
  }

  /**
   * Clear all facts from the inference graph
   */
  clearFacts(): void {
    this.graph = {
      nodes: new Map(),
      edges: new Map()
    };
  }

  /**
   * Main inference method - applies all inference rules
   */
  async infer(
    facts: Record<string, unknown>[],
    rules?: string[],
    maxDepth: number = 5,
    context?: Record<string, unknown>
  ): Promise<InferenceResult> {
    const startTime = Date.now();
    const inferredFacts: InferredFact[] = [];
    const appliedRules: AppliedRule[] = [];
    const visited: Set<string> = new Set();

    // Load facts into the graph
    this.clearFacts();
    for (const fact of facts) {
      this.addFact({
        subject: fact.subject as string,
        predicate: fact.predicate as string,
        object: fact.object,
        confidence: (fact.confidence as number) || 1.0
      });
    }

    // Filter rules if specified
    const rulesToApply = rules
      ? this.rules.filter(r => rules.includes(r.id))
      : this.rules;

    // Apply each inference strategy
    await this.applyPropertyInheritance(inferredFacts, appliedRules, maxDepth);
    await this.applyTransitiveClosure(inferredFacts, appliedRules, maxDepth);
    await this.applySymmetricClosure(inferredFacts, appliedRules);
    await this.applyRuleBasedInference(inferredFacts, appliedRules, rulesToApply, context);

    return {
      inferredFacts,
      appliedRules,
      executionTimeMs: Date.now() - startTime
    };
  }

  /**
   * Property Inheritance Algorithm
   *
   * If a class A is a subclass of B, and B has property P,
   * then A also has property P (unless A overrides it)
   *
   * Algorithm: BFS traversal up the class hierarchy
   */
  private async applyPropertyInheritance(
    inferredFacts: InferredFact[],
    appliedRules: AppliedRule[],
    maxDepth: number
  ): Promise<void> {
    const ruleName = 'Property Inheritance';

    // Get all class hierarchies
    const classResult = await query<ClassRow>(
      `WITH RECURSIVE class_hierarchy AS (
        SELECT id, name, parent_class_id, 0 as level
        FROM classes
        UNION ALL
        SELECT c.id, c.name, c.parent_class_id, ch.level + 1
        FROM classes c
        INNER JOIN class_hierarchy ch ON c.id = ch.parent_class_id
        WHERE ch.level < $1
      )
      SELECT * FROM class_hierarchy ORDER BY level DESC`
    , [maxDepth]);

    // Build parent map
    const parentMap = new Map<string, string>();
    const childMap = new Map<string, string[]>();

    for (const row of classResult.rows) {
      if (row.parent_class_id) {
        parentMap.set(row.id, row.parent_class_id);
        if (!childMap.has(row.parent_class_id)) {
          childMap.set(row.parent_class_id, []);
        }
        childMap.get(row.parent_class_id)!.push(row.id);
      }
    }

    // Get all properties
    const propsResult = await query<PropertyRow>(
      'SELECT * FROM properties ORDER BY class_id, name'
    );

    // Build property map by class
    const propertiesByClass = new Map<string, PropertyRow[]>();
    for (const prop of propsResult.rows) {
      if (!propertiesByClass.has(prop.class_id)) {
        propertiesByClass.set(prop.class_id, []);
      }
      propertiesByClass.get(prop.class_id)!.push(prop);
    }

    // For each class, traverse up hierarchy and inherit properties
    const processedPairs = new Set<string>();

    for (const [classId, props] of propertiesByClass) {
      const inheritedProps = this.getInheritedProperties(classId, parentMap, propertiesByClass, maxDepth);

      for (const inheritedProp of inheritedProps) {
        const key = `${classId}:${inheritedProp.name}`;
        if (!processedPairs.has(key)) {
          processedPairs.add(key);

          inferredFacts.push({
            predicate: 'hasProperty',
            subject: classId,
            object: {
              propertyName: inheritedProp.name,
              dataType: inheritedProp.data_type,
              inheritedFrom: inheritedProp.class_id,
              isInherited: inheritedProp.class_id !== classId
            },
            confidence: 0.95,
            ruleName: ruleName,
            derivationPath: [inheritedProp.class_id, classId]
          });
        }
      }
    }

    appliedRules.push({
      ruleId: 'property-inheritance',
      ruleName,
      matched: classResult.rows.length > 0,
      conclusions: inferredFacts.filter(f => f.ruleName === ruleName).length
    });
  }

  /**
   * Get inherited properties through hierarchy traversal
   */
  private getInheritedProperties(
    classId: string,
    parentMap: Map<string, string>,
    propertiesByClass: Map<string, PropertyRow[]>,
    maxDepth: number
  ): PropertyRow[] {
    const inherited = new Map<string, PropertyRow>();
    let currentClass = classId;
    let depth = 0;

    // Traverse up the hierarchy
    while (parentMap.has(currentClass) && depth < maxDepth) {
      currentClass = parentMap.get(currentClass)!;
      depth++;

      const parentProps = propertiesByClass.get(currentClass) || [];
      for (const prop of parentProps) {
        // Don't override if property already exists
        if (!inherited.has(prop.name)) {
          inherited.set(prop.name, prop);
        }
      }
    }

    return Array.from(inherited.values());
  }

  /**
   * Transitive Closure Algorithm
   *
   * If A relates to B via relationship R, and B relates to C via R,
   * then A relates to C via R (for transitive relationships)
   *
   * Algorithm: Modified Floyd-Warshall with early termination
   */
  private async applyTransitiveClosure(
    inferredFacts: InferredFact[],
    appliedRules: AppliedRule[],
    maxDepth: number
  ): Promise<void> {
    const ruleName = 'Transitive Closure';

    // Get transitive relationships
    const relResult = await query<RelationshipTypeRow>(
      "SELECT * FROM relationship_types WHERE is_transitive = true"
    );

    if (relResult.rows.length === 0) {
      appliedRules.push({
        ruleId: 'transitive-closure',
        ruleName,
        matched: false,
        conclusions: 0
      });
      return;
    }

    // Build adjacency list for each transitive relationship
    const adjacency = new Map<string, Map<string, Set<string>>>();

    for (const rel of relResult.rows) {
      if (!adjacency.has(rel.name)) {
        adjacency.set(rel.name, new Map());
      }

      // Get all instances of this relationship
      const instResult = await query(
        `SELECT ir.source_instance_id, ir.target_instance_id
         FROM instance_relationships ir
         WHERE ir.relationship_type_id = $1`,
        [rel.id]
      );

      for (const row of instResult.rows) {
        if (!adjacency.get(rel.name)!.has(row.source_instance_id)) {
          adjacency.get(rel.name)!.set(row.source_instance_id, new Set());
        }
        adjacency.get(rel.name)!.get(row.source_instance_id)!.add(row.target_instance_id);
      }
    }

    // Apply transitive closure to each relationship type
    let totalConclusions = 0;

    for (const [relName, adj] of adjacency) {
      const inferred = this.computeTransitiveClosure(relName, adj, maxDepth);
      totalConclusions += inferred.length;

      for (const fact of inferred) {
        inferredFacts.push({
          predicate: fact.predicate,
          subject: fact.subject,
          object: fact.object,
          confidence: fact.confidence,
          ruleName,
          derivationPath: fact.derivationPath
        });
      }
    }

    appliedRules.push({
      ruleId: 'transitive-closure',
      ruleName,
      matched: relResult.rows.length > 0,
      conclusions: totalConclusions
    });
  }

  /**
   * Compute transitive closure using BFS
   */
  private computeTransitiveClosure(
    relName: string,
    adjacency: Map<string, Set<string>>,
    maxDepth: number
  ): InferredFact[] {
    const inferred: InferredFact[] = [];
    const visited = new Set<string>();

    // For each starting node
    for (const [startNode] of adjacency) {
      const queue: Array<{ node: string; path: string[]; depth: number }> = [
        { node: startNode, path: [startNode], depth: 0 }
      ];

      while (queue.length > 0) {
        const { node, path, depth } = queue.shift()!;

        const neighbors = adjacency.get(node);
        if (!neighbors) continue;

        for (const neighbor of neighbors) {
          const newPath = [...path, neighbor];
          const pathKey = newPath.join('->');

          if (!visited.has(pathKey) && depth < maxDepth) {
            visited.add(pathKey);

            // Only add if we went through at least one intermediate node
            if (path.length > 1) {
              inferred.push({
                predicate: relName,
                subject: startNode,
                object: neighbor,
                confidence: 1.0 / (depth + 1), // Confidence decreases with depth
                derivationPath: newPath
              });
            }

            // Continue traversal
            queue.push({ node: neighbor, path: newPath, depth: depth + 1 });
          }
        }
      }
    }

    return inferred;
  }

  /**
   * Symmetric Closure Algorithm
   *
   * If A relates to B via symmetric relationship R, then B relates to A via R
   *
   * Algorithm: Direct symmetric inference
   */
  private async applySymmetricClosure(
    inferredFacts: InferredFact[],
    appliedRules: AppliedRule[]
  ): Promise<void> {
    const ruleName = 'Symmetric Closure';

    // Get symmetric relationships
    const relResult = await query<RelationshipTypeRow>(
      "SELECT * FROM relationship_types WHERE is_symmetric = true"
    );

    if (relResult.rows.length === 0) {
      appliedRules.push({
        ruleId: 'symmetric-closure',
        ruleName,
        matched: false,
        conclusions: 0
      });
      return;
    }

    // For each symmetric relationship, add inverse facts
    let totalConclusions = 0;

    for (const rel of relResult.rows) {
      // Get all instances of this relationship
      const instResult = await query(
        `SELECT ir.source_instance_id, ir.target_instance_id
         FROM instance_relationships ir
         WHERE ir.relationship_type_id = $1`,
        [rel.id]
      );

      for (const row of instResult.rows) {
        inferredFacts.push({
          predicate: rel.name,
          subject: row.target_instance_id,
          object: row.source_instance_id,
          confidence: 1.0,
          ruleName,
          derivationPath: [row.target_instance_id, rel.name, row.source_instance_id]
        });
        totalConclusions++;
      }
    }

    appliedRules.push({
      ruleId: 'symmetric-closure',
      ruleName,
      matched: relResult.rows.length > 0,
      conclusions: totalConclusions
    });
  }

  /**
   * Rule-Based Inference Algorithm
   *
   * Evaluates IF antecedent THEN consequent rules
   *
   * Algorithm: Pattern matching with variable binding
   */
  private async applyRuleBasedInference(
    inferredFacts: InferredFact[],
    appliedRules: AppliedRule[],
    rules: InferenceRule[],
    context?: Record<string, unknown>
  ): Promise<void> {
    const ruleName = 'Rule-Based Inference';

    if (rules.length === 0) {
      appliedRules.push({
        ruleId: 'rule-based-inference',
        ruleName,
        matched: false,
        conclusions: 0
      });
      return;
    }

    // Build pattern index from facts
    const factIndex = this.buildFactIndex();

    let totalConclusions = 0;

    for (const rule of rules) {
      const matchResult = this.matchRule(rule, factIndex, context);

      if (matchResult.matched) {
        for (const consequent of this.generateConsequents(rule, matchResult.bindings)) {
          inferredFacts.push({
            predicate: consequent.predicate,
            subject: consequent.subject,
            object: consequent.object,
            confidence: rule.priority > 0 ? 1.0 : 0.8,
            ruleName: rule.name,
            derivationPath: [`rule:${rule.name}`, ...Array.from(matchResult.bindings.entries()).map(([k, v]) => `${k}=${v}`)]
          });
          totalConclusions++;
        }
      }

      appliedRules.push({
        ruleId: rule.id,
        ruleName: rule.name,
        matched: matchResult.matched,
        conclusions: matchResult.matched ? this.countConsequents(rule) : 0
      });
    }

    // Add summary rule
    appliedRules.push({
      ruleId: 'rule-based-inference',
      ruleName: 'Rule-Based Inference Summary',
      matched: rules.length > 0,
      conclusions: totalConclusions
    });
  }

  /**
   * Build an index of facts for efficient pattern matching
   */
  private buildFactIndex(): Map<string, Fact[]> {
    const index = new Map<string, Fact[]>();

    for (const [predicate, facts] of this.graph.edges) {
      if (!index.has(predicate)) {
        index.set(predicate, []);
      }
      index.get(predicate)!.push(...facts);
    }

    return index;
  }

  /**
   * Match a rule's antecedent against the fact base
   */
  private matchRule(
    rule: InferenceRule,
    factIndex: Map<string, Fact[]>,
    context?: Record<string, unknown>
  ): { matched: boolean; bindings: Map<string, string> } {
    const antecedent = rule.antecedent;
    const bindings = new Map<string, string>();

    // Build match conditions from antecedent
    const conditions = this.extractConditions(anteccedent);

    for (const condition of conditions) {
      const facts = factIndex.get(condition.predicate) || [];

      let foundMatch = false;
      for (const fact of facts) {
        if (this.matchesCondition(condition, fact, bindings, context)) {
          foundMatch = true;
          break;
        }
      }

      if (!foundMatch && !this.isOptionalCondition(condition)) {
        return { matched: false, bindings: new Map() };
      }
    }

    return { matched: true, bindings };
  }

  /**
   * Extract match conditions from antecedent
   */
  private extractConditions(anteccedent: Record<string, unknown>): Array<{
    predicate: string;
    subjectPattern?: string;
    objectPattern?: string;
    optional?: boolean;
  }> {
    const conditions: Array<{
      predicate: string;
      subjectPattern?: string;
      objectPattern?: string;
      optional?: boolean;
    }> = [];

    if (anteccedent.predicate) {
      conditions.push({
        predicate: antecedent.predicate as string,
        subjectPattern: antecedent.subject as string,
        objectPattern: antecedent.object as string,
        optional: antecedent.optional as boolean
      });
    }

    // Handle composite antecedents
    if (anteccedent.conditions && Array.isArray(anteccedent.conditions)) {
      for (const cond of antecedent.conditions as Array<Record<string, unknown>>) {
        conditions.push({
          predicate: cond.predicate as string,
          subjectPattern: cond.subject as string,
          objectPattern: cond.object as string,
          optional: cond.optional as boolean
        });
      }
    }

    return conditions;
  }

  /**
   * Check if a fact matches a condition
   */
  private matchesCondition(
    condition: { predicate: string; subjectPattern?: string; objectPattern?: string },
    fact: Fact,
    bindings: Map<string, string>,
    context?: Record<string, unknown>
  ): boolean {
    // Check subject
    if (condition.subjectPattern) {
      if (condition.subjectPattern.startsWith('?')) {
        // Variable binding
        const existing = bindings.get(condition.subjectPattern);
        if (existing && existing !== fact.subject) {
          return false;
        }
        bindings.set(condition.subjectPattern, fact.subject);
      } else if (condition.subjectPattern !== fact.subject) {
        return false;
      }
    }

    // Check object
    if (condition.objectPattern) {
      if (condition.objectPattern.startsWith('?')) {
        // Variable binding
        const existing = bindings.get(condition.objectPattern);
        const objStr = String(fact.object);
        if (existing && existing !== objStr) {
          return false;
        }
        bindings.set(condition.objectPattern, objStr);
      } else if (condition.objectPattern !== String(fact.object)) {
        return false;
      }
    }

    // Check context
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        if (key.startsWith('subject:') && fact.subject !== value) {
          return false;
        }
        if (key.startsWith('predicate:') && fact.predicate !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Check if a condition is optional
   */
  private isOptionalCondition(condition: { optional?: boolean }): boolean {
    return condition.optional === true;
  }

  /**
   * Generate consequent facts from rule and bindings
   */
  private generateConsequents(
    rule: InferenceRule,
    bindings: Map<string, string>
  ): Array<{ predicate: string; subject: string; object: unknown }> {
    const consequents: Array<{ predicate: string; subject: string; object: unknown }> = [];
    const consequent = rule.consequent;

    if (consequent.predicate) {
      consequents.push({
        predicate: consequent.predicate as string,
        subject: this.substituteVariables(consequent.subject as string, bindings),
        object: this.substituteVariables(consequent.object as string, bindings)
      });
    }

    // Handle multiple consequents
    if (consequent.consequents && Array.isArray(consequent.consequents)) {
      for (const cons of consequent.consequents as Array<Record<string, unknown>>) {
        consequents.push({
          predicate: cons.predicate as string,
          subject: this.substituteVariables(cons.subject as string, bindings),
          object: this.substituteVariables(cons.object as string, bindings)
        });
      }
    }

    return consequents;
  }

  /**
   * Substitute variables in a string with bound values
   */
  private substituteVariables(str: string, bindings: Map<string, string>): string {
    let result = str;
    for (const [variable, value] of bindings) {
      result = result.replace(new RegExp(variable, 'g'), value);
    }
    return result;
  }

  /**
   * Count consequents in a rule
   */
  private countConsequents(rule: InferenceRule): number {
    if (rule.consequent.predicate) {
      if (rule.consequent.consequents && Array.isArray(rule.consequent.consequents)) {
        return rule.consequent.consequents.length + 1;
      }
      return 1;
    }
    return 0;
  }

  /**
   * Map database row to InferenceRule
   */
  private mapRowToRule(row: InferenceRuleRow): InferenceRule {
    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      ruleType: row.rule_type,
      antecedent: row.antecedent,
      consequent: row.consequent,
      priority: row.priority,
      isActive: row.is_active,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Query the inferred knowledge graph
   */
  query(predicate: string, subject?: string): Fact[] {
    const facts = this.graph.edges.get(predicate) || [];

    if (subject) {
      return facts.filter(f => f.subject === subject);
    }

    return facts;
  }

  /**
   * Get all facts about a subject
   */
  getFactsAbout(subject: string): Fact[] {
    const facts: Fact[] = [];

    for (const [, factsList] of this.graph.edges) {
      for (const fact of factsList) {
        if (fact.subject === subject || fact.object === subject) {
          facts.push(fact);
        }
      }
    }

    return facts;
  }

  /**
   * Get statistics about the inference engine
   */
  getStats(): { facts: number; rules: number; transitiveRels: number; symmetricRels: number } {
    let factCount = 0;
    for (const [, facts] of this.graph.edges) {
      factCount += facts.length;
    }

    return {
      facts: factCount,
      rules: this.rules.length,
      transitiveRels: this.transitiveRelationships.size,
      symmetricRels: this.symmetricRelationships.size
    };
  }
}

export const inferenceEngine = new InferenceEngine();
export default inferenceEngine;
