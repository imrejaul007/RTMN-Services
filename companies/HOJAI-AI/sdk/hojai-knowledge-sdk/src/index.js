/**
 * KnowledgeOS SDK
 * ===============
 * Unified SDK for Knowledge, Ontology, and Reasoning.
 *
 * Usage:
 * import { KnowledgeSDK } from '@hojai/knowledge-sdk';
 *
 * const knowledge = new KnowledgeSDK({
 *   ontologyUrl: 'http://localhost:4751',
 *   reasoningUrl: 'http://localhost:4753'
 * });
 *
 * await knowledge.ontology.validate({ schema: 'Person', data: {...} });
 */

import axios from 'axios';

// Default service URLs
const DEFAULTS = {
  ontologyUrl: process.env.ONTOLOGY_URL || 'http://localhost:4751',
  reasoningUrl: process.env.REASONING_URL || 'http://localhost:4753',
  knowledgeUrl: process.env.KNOWLEDGE_URL || 'http://localhost:4750'
};

/**
 * KnowledgeSDK Client
 */
export class KnowledgeSDK {
  constructor(options = {}) {
    this.config = { ...DEFAULTS, ...options };
    this.ontology = new OntologyClient(this.config);
    this.reasoning = new ReasoningClient(this.config);
    this.knowledge = new KnowledgeClient(this.config);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Ontology Client
// ─────────────────────────────────────────────────────────────────────────────

export class OntologyClient {
  constructor(config) {
    this.baseUrl = config.ontologyUrl;
  }

  async createSchema({ name, properties, parent }) {
    const response = await axios.post(`${this.baseUrl}/schema`, { name, properties, parent });
    return response.data;
  }

  async validate({ schema, data }) {
    const response = await axios.post(`${this.baseUrl}/validate`, { schema, data });
    return response.data;
  }

  async query({ schema, filters }) {
    const response = await axios.post(`${this.baseUrl}/query`, { schema, filters });
    return response.data;
  }

  async getSchema(schemaId) {
    const response = await axios.get(`${this.baseUrl}/schema/${schemaId}`);
    return response.data;
  }

  async getTaxonomy({ root }) {
    const response = await axios.get(`${this.baseUrl}/taxonomy`, { params: { root } });
    return response.data;
  }

  async searchTaxonomy(query) {
    const response = await axios.get(`${this.baseUrl}/taxonomy/search`, { params: { q: query } });
    return response.data;
  }

  async createRelationship({ from, to, type, properties }) {
    const response = await axios.post(`${this.baseUrl}/relationship`, { from, to, type, properties });
    return response.data;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Reasoning Client
// ─────────────────────────────────────────────────────────────────────────────

export class ReasoningClient {
  constructor(config) {
    this.baseUrl = config.reasoningUrl;
  }

  async deductive({ premise, rules }) {
    const response = await axios.post(`${this.baseUrl}/deductive`, { premise, rules });
    return response.data;
  }

  async inductive({ observations }) {
    const response = await axios.post(`${this.baseUrl}/inductive`, { observations });
    return response.data;
  }

  async abductive({ observation, hypotheses }) {
    const response = await axios.post(`${this.baseUrl}/abductive`, { observation, hypotheses });
    return response.data;
  }

  async chainOfThought({ query }) {
    const response = await axios.post(`${this.baseUrl}/chain-of-thought`, { query });
    return response.data;
  }

  async scoreReasoning({ reasoning }) {
    const response = await axios.post(`${this.baseUrl}/score`, { reasoning });
    return response.data;
  }

  async evaluate({ context, options }) {
    const response = await axios.post(`${this.baseUrl}/evaluate`, { context, options });
    return response.data;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Knowledge Client
// ─────────────────────────────────────────────────────────────────────────────

export class KnowledgeClient {
  constructor(config) {
    this.baseUrl = config.knowledgeUrl;
  }

  async addFact({ entity, predicate, value, context }) {
    const response = await axios.post(`${this.baseUrl}/fact`, { entity, predicate, value, context });
    return response.data;
  }

  async query({ entity, predicates, depth }) {
    const response = await axios.post(`${this.baseUrl}/query`, { entity, predicates, depth });
    return response.data;
  }

  async resolveEntity({ identifier, type }) {
    const response = await axios.post(`${this.baseUrl}/resolve`, { identifier, type });
    return response.data;
  }

  async getKnowledgeGraph({ entity, hops }) {
    const response = await axios.get(`${this.baseUrl}/graph/${entity}`, { params: { hops } });
    return response.data;
  }

  async search({ query, filters }) {
    const response = await axios.get(`${this.baseUrl}/search`, { params: { q: query, ...filters } });
    return response.data;
  }
}

// Named exports
export { OntologyClient, ReasoningClient, KnowledgeClient };
export default KnowledgeSDK;
