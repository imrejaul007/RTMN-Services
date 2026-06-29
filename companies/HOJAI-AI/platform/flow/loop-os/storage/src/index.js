/**
 * LoopOS MongoDB Storage Layer
 * Persistent storage for all LoopOS services
 */

import { MongoClient } from 'mongodb';

const DEFAULT_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DEFAULT_DB = process.env.MONGO_DB || 'loopos';

class StorageLayer {
  constructor(uri = DEFAULT_URI, dbName = DEFAULT_DB) {
    this.uri = uri;
    this.dbName = dbName;
    this.client = null;
    this.db = null;
    this.collections = {};
  }

  async connect() {
    if (this.client) return;

    this.client = new MongoClient(this.uri);
    await this.client.connect();
    this.db = this.client.db(this.dbName);

    // Initialize collections
    this.collections.loops = this.db.collection('loops');
    this.collections.states = this.db.collection('states');
    this.collections.checkpoints = this.db.collection('checkpoints');
    this.collections.budgets = this.db.collection('budgets');
    this.collections.trustProfiles = this.db.collection('trust_profiles');
    this.collections.outcomes = this.db.collection('outcomes');
    this.collections.learnings = this.db.collection('learnings');
    this.collections.certifications = this.db.collection('certifications');
    this.collections.escalations = this.db.collection('escalations');
    this.collections.alerts = this.db.collection('alerts');
    this.collections.graphNodes = this.db.collection('graph_nodes');
    this.collections.graphEdges = this.db.collection('graph_edges');

    // Create indexes
    await this.createIndexes();

    console.log(`Storage connected to ${this.dbName}`);
  }

  async createIndexes() {
    // Loops indexes
    await this.collections.loops.createIndex({ id: 1 }, { unique: true });
    await this.collections.loops.createIndex({ twinId: 1 });
    await this.collections.loops.createIndex({ status: 1 });
    await this.collections.loops.createIndex({ createdAt: -1 });

    // States indexes
    await this.collections.states.createIndex({ id: 1 }, { unique: true });
    await this.collections.states.createIndex({ loopId: 1 });
    await this.collections.states.createIndex({ twinId: 1 });

    // Checkpoints indexes
    await this.collections.checkpoints.createIndex({ id: 1 }, { unique: true });
    await this.collections.checkpoints.createIndex({ loopId: 1 });
    await this.collections.checkpoints.createIndex({ createdAt: -1 });

    // Budgets indexes
    await this.collections.budgets.createIndex({ twinId: 1 }, { unique: true });
    await this.collections.budgets.createIndex({ status: 1 });

    // Trust profiles indexes
    await this.collections.trustProfiles.createIndex({ twinId: 1 }, { unique: true });
    await this.collections.trustProfiles.createIndex({ trustLevel: 1 });

    // Outcomes indexes
    await this.collections.outcomes.createIndex({ id: 1 }, { unique: true });
    await this.collections.outcomes.createIndex({ twinId: 1 });
    await this.collections.outcomes.createIndex({ createdAt: -1 });

    // Learnings indexes
    await this.collections.learnings.createIndex({ id: 1 }, { unique: true });
    await this.collections.learnings.createIndex({ agentId: 1 });
    await this.collections.learnings.createIndex({ tags: 1 });
    await this.collections.learnings.createIndex({ visibility: 1 });
    await this.collections.learnings.createIndex({ createdAt: -1 });

    // Certifications indexes
    await this.collections.certifications.createIndex({ id: 1 }, { unique: true });
    await this.collections.certifications.createIndex({ twinId: 1 });
    await this.collections.certifications.createIndex({ status: 1 });

    // Escalations indexes
    await this.collections.escalations.createIndex({ id: 1 }, { unique: true });
    await this.collections.escalations.createIndex({ twinId: 1 });
    await this.collections.escalations.createIndex({ status: 1 });
    await this.collections.escalations.createIndex({ createdAt: -1 });

    // Alerts indexes
    await this.collections.alerts.createIndex({ id: 1 }, { unique: true });
    await this.collections.alerts.createIndex({ twinId: 1 });
    await this.collections.alerts.createIndex({ type: 1 });
    await this.collections.alerts.createIndex({ severity: 1 });
    await this.collections.alerts.createIndex({ status: 1 });
    await this.collections.alerts.createIndex({ createdAt: -1 });

    // Graph indexes
    await this.collections.graphNodes.createIndex({ id: 1 }, { unique: true });
    await this.collections.graphNodes.createIndex({ type: 1 });
    await this.collections.graphNodes.createIndex({ trustScore: -1 });
    await this.collections.graphEdges.createIndex({ id: 1 }, { unique: true });
    await this.collections.graphEdges.createIndex({ from: 1 });
    await this.collections.graphEdges.createIndex({ to: 1 });
    await this.collections.graphEdges.createIndex({ type: 1 });
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      console.log('Storage disconnected');
    }
  }

  // Generic CRUD operations
  async create(collection, document) {
    const result = await this.collections[collection].insertOne(document);
    return { ...document, _id: result.insertedId };
  }

  async findById(collection, id) {
    return this.collections[collection].findOne({ id });
  }

  async findOne(collection, query) {
    return this.collections[collection].findOne(query);
  }

  async find(collection, query = {}, options = {}) {
    const cursor = this.collections[collection].find(query);
    if (options.sort) cursor.sort(options.sort);
    if (options.limit) cursor.limit(options.limit);
    if (options.skip) cursor.skip(options.skip);
    return cursor.toArray();
  }

  async update(collection, id, updates) {
    const result = await this.collections[collection].updateOne(
      { id },
      { $set: { ...updates, updatedAt: new Date().toISOString() } }
    );
    return result.modifiedCount > 0;
  }

  async delete(collection, id) {
    const result = await this.collections[collection].deleteOne({ id });
    return result.deletedCount > 0;
  }

  async count(collection, query = {}) {
    return this.collections[collection].countDocuments(query);
  }

  async upsert(collection, id, document) {
    const result = await this.collections[collection].updateOne(
      { id },
      { $set: document },
      { upsert: true }
    );
    return result;
  }

  async push(collection, id, field, item) {
    return this.collections[collection].updateOne(
      { id },
      { $push: { [field]: item } }
    );
  }

  async increment(collection, id, field, amount = 1) {
    return this.collections[collection].updateOne(
      { id },
      { $inc: { [field]: amount } }
    );
  }
}

// Singleton instance
let storageInstance = null;

export async function getStorage(uri, dbName) {
  if (!storageInstance) {
    storageInstance = new StorageLayer(uri, dbName);
    await storageInstance.connect();
  }
  return storageInstance;
}

export function getStorageSync() {
  return storageInstance;
}

export { StorageLayer };
export default StorageLayer;
