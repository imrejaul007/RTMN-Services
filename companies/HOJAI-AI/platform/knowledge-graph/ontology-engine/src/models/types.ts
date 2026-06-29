/**
 * Ontology Engine - Domain Models and Types
 */

// Constraint types
export type ConstraintType = 'required' | 'type' | 'cardinality' | 'range' | 'pattern' | 'custom';
export type CardinalityType = 'one' | 'many' | 'zero_or_one' | 'zero_or_many';
export type PropertyDataType = 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'array' | 'object' | 'uri' | 'enum';
export type RelationshipDirection = 'outbound' | 'inbound' | 'undirected';
export type RuleType = 'property_inheritance' | 'transitive' | 'symmetric' | 'reflexive' | 'rule_based' | 'custom';

// Base interface with common fields
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

// Class (ontological concept)
export interface OntologyClass extends BaseEntity {
  name: string;
  description?: string;
  parentClassId?: string;
  isAbstract: boolean;
  properties?: Property[];
  relationshipTypes?: RelationshipType[];
  inheritedProperties?: Property[];
  childClasses?: OntologyClass[];
}

// Property (attribute of a class)
export interface Property extends BaseEntity {
  name: string;
  classId: string;
  dataType: PropertyDataType;
  description?: string;
  defaultValue?: unknown;
  isInherited: boolean;
  sourceClassId?: string;
  constraints?: Constraint[];
}

// Relationship type (links between classes)
export interface RelationshipType extends BaseEntity {
  name: string;
  sourceClassId: string;
  targetClassId: string;
  description?: string;
  direction: RelationshipDirection;
  isTransitive: boolean;
  isSymmetric: boolean;
  inverseRelationshipId?: string;
}

// Constraint
export interface Constraint extends BaseEntity {
  propertyId?: string;
  relationshipTypeId?: string;
  constraintType: ConstraintType;
  value: unknown;
  errorMessage?: string;
}

// Inference rule
export interface InferenceRule extends BaseEntity {
  name: string;
  description?: string;
  ruleType: RuleType;
  antecedent: Record<string, unknown>;
  consequent: Record<string, unknown>;
  priority: number;
  isActive: boolean;
}

// Taxonomy node
export interface TaxonomyNode extends BaseEntity {
  name: string;
  slug: string;
  parentId?: string;
  classId?: string;
  depth: number;
  path: string;
  children?: TaxonomyNode[];
  ancestors?: TaxonomyNode[];
  descendants?: TaxonomyNode[];
}

// Instance (entity that conforms to a class)
export interface Instance extends BaseEntity {
  classId: string;
  data: Record<string, unknown>;
  className?: string;
}

// Instance relationship
export interface InstanceRelationship extends BaseEntity {
  relationshipTypeId: string;
  sourceInstanceId: string;
  targetInstanceId: string;
  properties?: Record<string, unknown>;
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  constraintType?: ConstraintType;
  expected?: unknown;
  actual?: unknown;
}

export interface ValidationWarning {
  path: string;
  message: string;
  suggestion?: string;
}

// Inference result
export interface InferenceResult {
  inferredFacts: InferredFact[];
  appliedRules: AppliedRule[];
  executionTimeMs: number;
}

export interface InferredFact {
  predicate: string;
  subject: string;
  object: unknown;
  confidence: number;
  ruleName?: string;
  derivationPath?: string[];
}

export interface AppliedRule {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  conclusions: number;
}

// Taxonomy traversal options
export interface TraversalOptions {
  maxDepth?: number;
  includeAncestors?: boolean;
  includeDescendants?: boolean;
  direction?: 'up' | 'down' | 'both';
  filter?: (node: TaxonomyNode) => boolean;
}

// Class hierarchy options
export interface HierarchyOptions {
  includeProperties?: boolean;
  includeRelationships?: boolean;
  includeInherited?: boolean;
}

// API request/response types
export interface CreateClassRequest {
  name: string;
  description?: string;
  parentClassId?: string;
  isAbstract?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateClassRequest {
  name?: string;
  description?: string;
  parentClassId?: string;
  isAbstract?: boolean;
  metadata?: Record<string, unknown>;
}

export interface CreatePropertyRequest {
  name: string;
  classId: string;
  dataType: PropertyDataType;
  description?: string;
  defaultValue?: unknown;
  metadata?: Record<string, unknown>;
}

export interface UpdatePropertyRequest {
  name?: string;
  dataType?: PropertyDataType;
  description?: string;
  defaultValue?: unknown;
  metadata?: Record<string, unknown>;
}

export interface CreateConstraintRequest {
  propertyId?: string;
  relationshipTypeId?: string;
  constraintType: ConstraintType;
  value: unknown;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface ValidateEntityRequest {
  classId: string;
  data: Record<string, unknown>;
  strict?: boolean;
}

export interface InferRequest {
  facts: Record<string, unknown>[];
  rules?: string[];
  maxDepth?: number;
  context?: Record<string, unknown>;
}

export interface TaxonomyCreateRequest {
  name: string;
  slug?: string;
  parentId?: string;
  classId?: string;
  metadata?: Record<string, unknown>;
}

export interface TaxonomyUpdateRequest {
  name?: string;
  slug?: string;
  parentId?: string;
  metadata?: Record<string, unknown>;
}

// JWT Auth types
export interface JwtPayload {
  sub: string;
  type: 'user' | 'service';
  roles: string[];
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest {
  user?: JwtPayload;
}

// Database row types (for mapping SQL results)
export interface ClassRow {
  id: string;
  name: string;
  description: string | null;
  parent_class_id: string | null;
  is_abstract: boolean;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface PropertyRow {
  id: string;
  name: string;
  class_id: string;
  data_type: PropertyDataType;
  description: string | null;
  default_value: unknown;
  is_inherited: boolean;
  source_class_id: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface RelationshipTypeRow {
  id: string;
  name: string;
  source_class_id: string;
  target_class_id: string;
  description: string | null;
  direction: RelationshipDirection;
  is_transitive: boolean;
  is_symmetric: boolean;
  inverse_relationship_id: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface ConstraintRow {
  id: string;
  property_id: string | null;
  relationship_type_id: string | null;
  constraint_type: ConstraintType;
  value: unknown;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface InferenceRuleRow {
  id: string;
  name: string;
  description: string | null;
  rule_type: RuleType;
  antecedent: Record<string, unknown>;
  consequent: Record<string, unknown>;
  priority: number;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface TaxonomyNodeRow {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  class_id: string | null;
  depth: number;
  path: string;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface InstanceRow {
  id: string;
  class_id: string;
  data: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}
