export const typeDefs = `#graphql
  scalar DateTime
  scalar JSON

  # Enums
  enum HealthTrend {
    improving
    stable
    declining
  }

  enum GoalStatus {
    active
    completed
    paused
    failed
  }

  enum EventImportance {
    low
    medium
    high
    critical
  }

  enum AgentStatus {
    idle
    busy
    offline
    error
  }

  enum MemoryEntityType {
    company
    merchant
    restaurant
    hotel
    healthcare
    realestate
    retail
  }

  enum KnowledgeCategory {
    strategy
    operations
    customers
    products
    competitors
    processes
  }

  enum KnowledgeSource {
    manual
    ai_generated
    extracted
  }

  # Metric Types
  type MetricValue {
    value: Float!
    previousValue: Float
    changePercent: Float
    trend: String!
    period: String!
  }

  type CompanyMetrics {
    revenue: MetricValue
    customers: MetricValue
    orders: MetricValue
    conversionRate: MetricValue
    avgOrderValue: MetricValue
    retentionRate: MetricValue
    customMetrics: JSON
  }

  # Goal Types
  type Goal {
    id: ID!
    description: String!
    targetMetric: String
    targetValue: Float
    currentValue: Float
    progress: Int!
    deadline: DateTime
    status: GoalStatus!
    createdAt: DateTime!
  }

  # Decision Types
  type Decision {
    id: ID!
    type: String!
    description: String!
    outcome: String
    impactScore: Float!
    date: DateTime!
  }

  # Company Type
  type Company {
    id: ID!
    entityType: MemoryEntityType!
    entityId: String!
    name: String!
    healthScore: Int!
    healthTrend: HealthTrend!
    activeGoals: [Goal!]!
    recentDecisions: [Decision!]!
    metrics: CompanyMetrics!
    preferences: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # Memory Types
  type MemoryEvent {
    id: ID!
    entityId: String!
    eventType: String!
    description: String!
    data: JSON
    source: String!
    importance: EventImportance!
    timestamp: DateTime!
    createdAt: DateTime!
  }

  type BusinessKnowledge {
    id: ID!
    entityId: String!
    category: KnowledgeCategory!
    topic: String!
    content: String!
    source: KnowledgeSource!
    confidence: Float!
    lastVerified: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Memory {
    entityType: MemoryEntityType!
    entityId: String!
    name: String!
    healthScore: Int!
    healthTrend: HealthTrend!
    activeGoals: [Goal!]!
    recentDecisions: [Decision!]!
    metrics: CompanyMetrics!
    knowledge: [BusinessKnowledge!]!
    events: [MemoryEvent!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # Agent Types
  type AgentCapability {
    name: String!
    description: String
    enabled: Boolean!
  }

  type Agent {
    id: ID!
    name: String!
    description: String
    capabilities: [AgentCapability!]!
    status: AgentStatus!
    lastActiveAt: DateTime
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # Intelligence Types
  type Prediction {
    id: ID!
    type: String!
    description: String!
    confidence: Float!
    timeframe: String
    impact: String
    data: JSON
    createdAt: DateTime!
  }

  type Recommendation {
    id: ID!
    category: String!
    title: String!
    description: String!
    priority: Int!
    actionItems: [String!]!
    expectedOutcome: String
    confidence: Float!
    createdAt: DateTime!
  }

  type Signal {
    id: ID!
    type: String!
    name: String!
    description: String!
    value: Float!
    unit: String
    source: String!
    timestamp: DateTime!
    metadata: JSON
  }

  type Intelligence {
    predictions: [Prediction!]!
    recommendations: [Recommendation!]!
    signals: [Signal!]!
    lastUpdated: DateTime!
  }

  # Health Response Type
  type ServiceHealth {
    name: String!
    status: String!
    latencyMs: Int
    error: String
  }

  type GatewayHealth {
    status: String!
    version: String!
    uptime: Float!
    services: [ServiceHealth!]!
    timestamp: DateTime!
  }

  # Pagination Types
  type PaginatedMemory {
    items: [Memory!]!
    total: Int!
    page: Int!
    limit: Int!
    hasMore: Boolean!
  }

  type PaginatedEvents {
    items: [MemoryEvent!]!
    total: Int!
    page: Int!
    limit: Int!
    hasMore: Boolean!
  }

  type PaginatedAgents {
    items: [Agent!]!
    total: Int!
    page: Int!
    limit: Int!
    hasMore: Boolean!
  }

  # Input Types
  input MetricValueInput {
    value: Float!
    previousValue: Float
    changePercent: Float
    trend: String!
    period: String!
  }

  input GoalInput {
    description: String!
    targetMetric: String
    targetValue: Float
    deadline: DateTime
  }

  input DecisionInput {
    type: String!
    description: String!
    outcome: String
    impactScore: Float!
  }

  input MemoryInput {
    entityType: MemoryEntityType!
    entityId: String!
    name: String!
    healthScore: Int
    metrics: JSON
    preferences: JSON
  }

  input EventInput {
    entityId: String!
    eventType: String!
    description: String!
    data: JSON
    source: String
    importance: EventImportance
  }

  input KnowledgeInput {
    entityId: String!
    category: KnowledgeCategory!
    topic: String!
    content: String!
    source: KnowledgeSource
    confidence: Float
  }

  input AgentInput {
    name: String!
    description: String
    capabilities: [AgentCapabilityInput!]
  }

  input AgentCapabilityInput {
    name: String!
    description: String
    enabled: Boolean
  }

  input MemoryFilter {
    entityType: MemoryEntityType
    entityId: String
    search: String
    minHealthScore: Int
    maxHealthScore: Int
  }

  input EventFilter {
    entityId: String
    eventType: String
    importance: EventImportance
    startDate: DateTime
    endDate: DateTime
  }

  # Forensics Input Types
  input InvestigationInput {
    title: String!
    description: String
    type: InvestigationType!
    priority: InvestigationPriority
    query: String!
    mcpServices: [String!]
  }

  input EvidenceInput {
    type: EvidenceType!
    filename: String!
    fileData: String!
    source: String!
    metadata: JSON
    investigationId: String
  }

  input DeepfakeInput {
    fileId: String!
    fileType: String!
    analysisType: String
  }

  input CustodyTransferInput {
    evidenceId: ID!
    fromCustodian: String!
    toCustodian: String!
    purpose: String!
    notes: String
  }

  input FinancialInput {
    caseId: String!
    analysisType: String!
    transactionData: JSON
  }

  input LocationInput {
    type: String!
    identifier: String!
  }

  # Query
  type Query {
    # Company/Memory queries
    company(entityId: String!): Company
    companies(filter: MemoryFilter, page: Int, limit: Int): PaginatedMemory!
    memory(entityType: MemoryEntityType!, entityId: String!): Memory

    # Memory Events
    memoryEvents(filter: EventFilter, page: Int, limit: Int): PaginatedEvents!
    memoryEvent(id: ID!): MemoryEvent

    # Business Knowledge
    businessKnowledge(entityId: String!, category: KnowledgeCategory): [BusinessKnowledge!]!
    businessKnowledgeItem(id: ID!): BusinessKnowledge

    # Agent queries
    agents(page: Int, limit: Int): PaginatedAgents!
    agent(id: ID!): Agent
    agentByName(name: String!): Agent

    # Intelligence queries
    intelligence(entityId: String!): Intelligence
    predictions(entityId: String!, type: String): [Prediction!]!
    recommendations(entityId: String!): [Recommendation!]!
    signals(entityId: String!, type: String): [Signal!]!

    # Health
    health: GatewayHealth!
  }

  # Mutations
  type Mutation {
    # Memory/Memory mutations
    createMemory(input: MemoryInput!): Memory!
    updateMemory(entityType: MemoryEntityType!, entityId: String!, input: MemoryInput!): Memory!
    updateHealthScore(entityType: MemoryEntityType!, entityId: String!, score: Int!, trend: HealthTrend): Memory!
    addGoal(entityType: MemoryEntityType!, entityId: String!, input: GoalInput!): Goal!
    updateGoalProgress(entityType: MemoryEntityType!, entityId: String!, goalId: ID!, progress: Int!): Goal!
    addDecision(entityType: MemoryEntityType!, entityId: String!, input: DecisionInput!): Decision!

    # Event mutations
    createMemoryEvent(input: EventInput!): MemoryEvent!
    markEventImportance(id: ID!, importance: EventImportance!): MemoryEvent!

    # Knowledge mutations
    createBusinessKnowledge(input: KnowledgeInput!): BusinessKnowledge!
    updateBusinessKnowledge(id: ID!, input: KnowledgeInput!): BusinessKnowledge!
    deleteBusinessKnowledge(id: ID!): Boolean!

    # Agent mutations
    createAgent(input: AgentInput!): Agent!
    updateAgent(id: ID!, input: AgentInput!): Agent!
    updateAgentStatus(id: ID!, status: AgentStatus!): Agent!
    deleteAgent(id: ID!): Boolean!

    # Intelligence mutations
    addPrediction(entityId: String!, type: String!, description: String!, confidence: Float!, timeframe: String, impact: String, data: JSON): Prediction!
    addRecommendation(entityId: String!, category: String!, title: String!, description: String!, priority: Int!, actionItems: [String!]!, expectedOutcome: String, confidence: Float): Recommendation!
    addSignal(entityId: String!, type: String!, name: String!, description: String!, value: Float!, unit: String, metadata: JSON): Signal!

    # Batch operations
    syncFromRestService(service: String!, entityType: MemoryEntityType!, entityId: String!): Memory!

    # ===== FORENSICS QUERIES =====
    # Investigation queries
    investigation(id: ID!): Investigation
    investigations(filter: InvestigationFilter, page: Int, limit: Int): PaginatedInvestigations!

    # Evidence queries
    evidence(id: ID!): Evidence
    evidenceByHash(hash: String!): Evidence
    evidenceList(filter: EvidenceFilter, page: Int, limit: Int): PaginatedEvidence!

    # Deepfake queries
    deepfakeAnalysis(id: ID!): DeepfakeAnalysis
    deepfakeAnalyses(filter: DeepfakeFilter, page: Int, limit: Int): PaginatedDeepfake!

    # Chain of Custody queries
    custodyChain(evidenceId: ID!): CustodyChain
    custodyTransfer(id: ID!): CustodyTransfer

    # Financial forensics
    financialAnalysis(id: ID!): FinancialAnalysis
    financialAnomalies(filter: FinancialFilter, page: Int, limit: Int): PaginatedFinancial!

    # Social/OSINT queries
    socialProfile(identifier: String!): SocialProfile
    socialConnections(identifier: String!): [SocialConnection!]!

    # Location queries
    locationData(identifier: String!): LocationData

    # Forensics tools
    forensicsTools: [ForensicsTool!]!
  }

  # ===== FORENSICS TYPES =====
  enum InvestigationStatus {
    pending
    in_progress
    completed
    failed
  }

  enum InvestigationPriority {
    low
    medium
    high
    critical
  }

  enum InvestigationType {
    evidence
    deepfake
    osint
    financial
    location
    full
  }

  type Investigation {
    id: ID!
    title: String!
    description: String
    type: InvestigationType!
    status: InvestigationStatus!
    priority: InvestigationPriority!
    query: String!
    results: JSON
    mcpResults: JSON
    reportId: String
    createdBy: String!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type PaginatedInvestigations {
    items: [Investigation!]!
    total: Int!
    page: Int!
    limit: Int!
    hasMore: Boolean!
  }

  input InvestigationFilter {
    status: InvestigationStatus
    type: InvestigationType
    priority: InvestigationPriority
    search: String
    startDate: DateTime
    endDate: DateTime
  }

  enum EvidenceType {
    whatsapp
    email
    cctv
    document
    image
    video
    audio
    other
  }

  type Evidence {
    id: ID!
    type: EvidenceType!
    filename: String!
    fileSize: Int!
    mimeType: String!
    sha256Hash: String!
    metadata: JSON
    source: String!
    importedBy: String!
    investigationId: String
    createdAt: DateTime!
  }

  type PaginatedEvidence {
    items: [Evidence!]!
    total: Int!
    page: Int!
    limit: Int!
    hasMore: Boolean!
  }

  input EvidenceFilter {
    type: EvidenceType
    source: String
    startDate: DateTime
    endDate: DateTime
  }

  type DeepfakeAnalysis {
    id: ID!
    fileId: String!
    fileType: String!
    analysisType: String!
    confidence: Float!
    verdict: String!
    details: JSON
    examinedBy: String!
    examinedAt: DateTime!
  }

  type PaginatedDeepfake {
    items: [DeepfakeAnalysis!]!
    total: Int!
    page: Int!
    limit: Int!
    hasMore: Boolean!
  }

  input DeepfakeFilter {
    verdict: String
    minConfidence: Float
  }

  type CustodyChain {
    evidenceId: ID!
    chain: [CustodyTransfer!]!
    isIntact: Boolean!
    createdAt: DateTime!
  }

  type CustodyTransfer {
    id: ID!
    evidenceId: String!
    fromCustodian: String!
    toCustodian: String!
    purpose: String!
    hashVerified: Boolean!
    transferredAt: DateTime!
    notes: String
  }

  type FinancialAnalysis {
    id: ID!
    caseId: String!
    analysisType: String!
    findings: [FinancialFinding!]!
    anomalies: [FinancialAnomaly!]!
    summary: String
    createdAt: DateTime!
  }

  type FinancialFinding {
    type: String!
    description: String!
    severity: String!
    details: JSON
  }

  type FinancialAnomaly {
    type: String!
    description: String!
    confidence: Float!
    affectedTransactions: Int
  }

  type PaginatedFinancial {
    items: [FinancialAnalysis!]!
    total: Int!
    page: Int!
    limit: Int!
    hasMore: Boolean!
  }

  input FinancialFilter {
    analysisType: String
    minConfidence: Float
  }

  type SocialProfile {
    identifier: String!
    platform: String
    profileData: JSON
    riskScore: Float
    lastUpdated: DateTime
  }

  type SocialConnection {
    identifier: String!
    platform: String
    relationship: String
    strength: Float
  }

  type LocationData {
    identifier: String!
    type: String!
    coordinates: JSON
    address: String
    confidence: Float!
    timestamp: DateTime
    metadata: JSON
  }

  type ForensicsTool {
    name: String!
    description: String!
    endpoint: String!
    capabilities: [String!]!
    mcpPort: Int!
  }

  # ===== FORENSICS MUTATIONS =====
  # Investigation mutations
  createInvestigation(input: InvestigationInput!): Investigation!
  updateInvestigation(id: ID!, input: InvestigationInput!): Investigation!
  deleteInvestigation(id: ID!): Boolean!

  # Evidence mutations
  ingestEvidence(input: EvidenceInput!): Evidence!
  verifyEvidence(hash: String!): Evidence!

  # Deepfake mutations
  analyzeDeepfake(input: DeepfakeInput!): DeepfakeAnalysis!

  # Chain of Custody mutations
  createCustodyChain(evidenceId: ID!): CustodyChain!
  transferCustody(input: CustodyTransferInput!): CustodyTransfer!
  verifyChain(evidenceId: ID!): CustodyChain!

  # Financial mutations
  analyzeFinancial(input: FinancialInput!): FinancialAnalysis!

  # Social mutations
  lookupSocialProfile(identifier: String!, platform: String): SocialProfile!
  analyzeSocialConnections(identifier: String!): [SocialConnection!]!

  # Location mutations
  lookupLocation(input: LocationInput!): LocationData!

  # Report mutations
  generateForensicsReport(investigationId: ID!, type: String!, format: String): Investigation!

  # Batch operations
  runFullInvestigation(query: String!, priority: InvestigationPriority): Investigation!
`;
