import mongoose from 'mongoose';
import { CompanyNode, CompanyEdge } from '../models/intercompany.model';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rtnm_intercompany_graph_test';

beforeAll(async () => {
  await mongoose.connect(MONGODB_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

beforeEach(async () => {
  await CompanyNode.deleteMany({});
  await CompanyEdge.deleteMany({});
});

describe('Intercompany Models', () => {
  describe('CompanyNode', () => {
    it('should create a company node with required fields', async () => {
      const companyData = {
        corpId: 'hojai-ai',
        name: 'HOJAI-AI',
        type: 'holding' as const,
        role: 'AI Company',
        trustScore: 95,
        monthlyRevenue: 10000000,
        employees: 500,
      };

      const company = new CompanyNode(companyData);
      const savedCompany = await company.save();

      expect(savedCompany._id).toBeDefined();
      expect(savedCompany.corpId).toBe('hojai-ai');
      expect(savedCompany.name).toBe('HOJAI-AI');
      expect(savedCompany.type).toBe('holding');
      expect(savedCompany.role).toBe('AI Company');
      expect(savedCompany.trustScore).toBe(95);
      expect(savedCompany.monthlyRevenue).toBe(10000000);
      expect(savedCompany.employees).toBe(500);
      expect(savedCompany.status).toBe('active');
      expect(savedCompany.createdAt).toBeDefined();
      expect(savedCompany.updatedAt).toBeDefined();
    });

    it('should create a company node with optional fields', async () => {
      const companyData = {
        corpId: 'rez-consumer',
        name: 'REZ-Consumer',
        type: 'subsidiary' as const,
        role: 'B2C Apps',
        trustScore: 80,
        monthlyRevenue: 5000000,
        employees: 200,
        properties: {
          industry: 'Consumer Technology',
          sector: 'Mobile Apps',
          headquarters: 'Bangalore, India',
        },
        tags: ['mobile', 'consumer', 'ai'],
      };

      const company = new CompanyNode(companyData);
      const savedCompany = await company.save();

      expect(savedCompany.properties?.industry).toBe('Consumer Technology');
      expect(savedCompany.properties?.sector).toBe('Mobile Apps');
      expect(savedCompany.tags).toContain('mobile');
      expect(savedCompany.tags).toContain('consumer');
    });

    it('should enforce unique corpId', async () => {
      const companyData = {
        corpId: 'duplicate-test',
        name: 'Test Company',
        type: 'partner' as const,
        role: 'Test Role',
      };

      const company1 = new CompanyNode(companyData);
      await company1.save();

      const company2 = new CompanyNode(companyData);
      await expect(company2.save()).rejects.toThrow();
    });

    it('should validate trustScore range (0-100)', async () => {
      const company = new CompanyNode({
        corpId: 'validation-test',
        name: 'Validation Test',
        type: 'partner' as const,
        role: 'Test',
        trustScore: 150, // Invalid - should be 0-100
      });

      await expect(company.save()).rejects.toThrow();
    });

    it('should set default values', async () => {
      const company = new CompanyNode({
        corpId: 'defaults-test',
        name: 'Defaults Test',
        type: 'vendor' as const,
        role: 'Vendor',
      });

      const savedCompany = await company.save();

      expect(savedCompany.trustScore).toBe(50);
      expect(savedCompany.monthlyRevenue).toBe(0);
      expect(savedCompany.employees).toBe(0);
      expect(savedCompany.status).toBe('active');
      expect(savedCompany.tags).toEqual([]);
    });

    it('should reject invalid type enum', async () => {
      const company = new CompanyNode({
        corpId: 'invalid-type',
        name: 'Invalid Type Company',
        type: 'invalid_type' as any,
        role: 'Test',
      });

      await expect(company.save()).rejects.toThrow();
    });
  });

  describe('CompanyEdge', () => {
    beforeEach(async () => {
      // Create companies for edge tests
      const company1 = new CompanyNode({
        corpId: 'company-a',
        name: 'Company A',
        type: 'holding',
        role: 'Parent',
      });
      const company2 = new CompanyNode({
        corpId: 'company-b',
        name: 'Company B',
        type: 'subsidiary',
        role: 'Child',
      });
      await Promise.all([company1.save(), company2.save()]);
    });

    it('should create an edge with required fields', async () => {
      const edgeData = {
        edgeId: 'edge-1',
        sourceId: 'company-a',
        targetId: 'company-b',
        relationship: 'pays' as const,
      };

      const edge = new CompanyEdge(edgeData);
      const savedEdge = await edge.save();

      expect(savedEdge._id).toBeDefined();
      expect(savedEdge.edgeId).toBe('edge-1');
      expect(savedEdge.sourceId).toBe('company-a');
      expect(savedEdge.targetId).toBe('company-b');
      expect(savedEdge.relationship).toBe('pays');
      expect(savedEdge.direction).toBe('unidirectional');
      expect(savedEdge.status).toBe('active');
    });

    it('should create an edge with properties', async () => {
      const edgeData = {
        edgeId: 'edge-2',
        sourceId: 'company-a',
        targetId: 'company-b',
        relationship: 'provides' as const,
        direction: 'bidirectional' as const,
        properties: {
          monthlyVolume: 100000,
          paymentTerms: 'Net 30',
          creditLimit: 500000,
          description: 'AI services',
        },
      };

      const edge = new CompanyEdge(edgeData);
      const savedEdge = await edge.save();

      expect(savedEdge.properties?.monthlyVolume).toBe(100000);
      expect(savedEdge.properties?.paymentTerms).toBe('Net 30');
      expect(savedEdge.properties?.creditLimit).toBe(500000);
      expect(savedEdge.direction).toBe('bidirectional');
    });

    it('should validate relationship enum', async () => {
      const edge = new CompanyEdge({
        edgeId: 'edge-invalid',
        sourceId: 'company-a',
        targetId: 'company-b',
        relationship: 'invalid_rel' as any,
      });

      await expect(edge.save()).rejects.toThrow();
    });

    it('should enforce unique edgeId', async () => {
      const edgeData = {
        edgeId: 'duplicate-edge',
        sourceId: 'company-a',
        targetId: 'company-b',
        relationship: 'pays' as const,
      };

      const edge1 = new CompanyEdge(edgeData);
      await edge1.save();

      const edge2 = new CompanyEdge(edgeData);
      await expect(edge2.save()).rejects.toThrow();
    });
  });

  describe('Indexes', () => {
    it('should create indexes on CompanyNode', async () => {
      const indexes = await CompanyNode.schema.indexes();
      const corpIdIndex = indexes.find(
        (idx: any) => idx[0].corpId !== undefined && idx[1].unique === true
      );
      expect(corpIdIndex).toBeDefined();
    });

    it('should create indexes on CompanyEdge', async () => {
      const indexes = await CompanyEdge.schema.indexes();
      const edgeIdIndex = indexes.find(
        (idx: any) => idx[0].edgeId !== undefined && idx[1].unique === true
      );
      expect(edgeIdIndex).toBeDefined();
    });
  });
});

describe('Intercompany Service', () => {
  // Import service after models are ready
  const { IntercompanyService } = require('../services/intercompany.service');
  let service: InstanceType<typeof IntercompanyService>;

  beforeEach(() => {
    service = new IntercompanyService();
  });

  describe('addCompany', () => {
    it('should add a new company', async () => {
      const company = await service.addCompany({
        corpId: 'test-company',
        name: 'Test Company',
        type: 'partner',
        role: 'Test Role',
        trustScore: 75,
        monthlyRevenue: 1000000,
        employees: 50,
      });

      expect(company.corpId).toBe('test-company');
      expect(company.name).toBe('Test Company');
      expect(company.status).toBe('active');
    });

    it('should throw error for duplicate corpId', async () => {
      await service.addCompany({
        corpId: 'duplicate',
        name: 'Company 1',
        type: 'partner',
        role: 'Test',
      });

      await expect(
        service.addCompany({
          corpId: 'duplicate',
          name: 'Company 2',
          type: 'partner',
          role: 'Test',
        })
      ).rejects.toThrow('already exists');
    });
  });

  describe('getCompany', () => {
    it('should return company by corpId', async () => {
      await service.addCompany({
        corpId: 'get-test',
        name: 'Get Test Company',
        type: 'subsidiary',
        role: 'Test',
      });

      const company = await service.getCompany('get-test');
      expect(company).not.toBeNull();
      expect(company?.corpId).toBe('get-test');
      expect(company?.name).toBe('Get Test Company');
    });

    it('should return null for non-existent company', async () => {
      const company = await service.getCompany('non-existent');
      expect(company).toBeNull();
    });
  });

  describe('addRelationship', () => {
    beforeEach(async () => {
      await Promise.all([
        service.addCompany({
          corpId: 'source-corp',
          name: 'Source Company',
          type: 'holding',
          role: 'Parent',
        }),
        service.addCompany({
          corpId: 'target-corp',
          name: 'Target Company',
          type: 'subsidiary',
          role: 'Child',
        }),
      ]);
    });

    it('should add a relationship between companies', async () => {
      const edge = await service.addRelationship({
        sourceId: 'source-corp',
        targetId: 'target-corp',
        relationship: 'pays',
        properties: {
          monthlyVolume: 50000,
          paymentTerms: 'Net 30',
        },
      });

      expect(edge.sourceId).toBe('source-corp');
      expect(edge.targetId).toBe('target-corp');
      expect(edge.relationship).toBe('pays');
      expect(edge.properties?.monthlyVolume).toBe(50000);
    });

    it('should throw error for non-existent source company', async () => {
      await expect(
        service.addRelationship({
          sourceId: 'non-existent-source',
          targetId: 'target-corp',
          relationship: 'pays',
        })
      ).rejects.toThrow('does not exist');
    });

    it('should throw error for non-existent target company', async () => {
      await expect(
        service.addRelationship({
          sourceId: 'source-corp',
          targetId: 'non-existent-target',
          relationship: 'pays',
        })
      ).rejects.toThrow('does not exist');
    });
  });

  describe('getFullGraph', () => {
    it('should return empty graph when no data', async () => {
      const graph = await service.getFullGraph();

      expect(graph.nodes).toEqual([]);
      expect(graph.edges).toEqual([]);
      expect(graph.statistics.totalCompanies).toBe(0);
      expect(graph.statistics.totalRelationships).toBe(0);
    });

    it('should return graph with companies and relationships', async () => {
      // Add companies
      await Promise.all([
        service.addCompany({ corpId: 'corp-1', name: 'Corp 1', type: 'holding', role: 'Parent' }),
        service.addCompany({ corpId: 'corp-2', name: 'Corp 2', type: 'subsidiary', role: 'Child' }),
      ]);

      // Add relationship
      await service.addRelationship({
        sourceId: 'corp-1',
        targetId: 'corp-2',
        relationship: 'owns',
        properties: { monthlyVolume: 100000 },
      });

      const graph = await service.getFullGraph();

      expect(graph.nodes.length).toBe(2);
      expect(graph.edges.length).toBe(1);
      expect(graph.statistics.totalCompanies).toBe(2);
      expect(graph.statistics.totalRelationships).toBe(1);
      expect(graph.statistics.totalMonthlyVolume).toBe(100000);
      expect(graph.statistics.companiesByType.holding).toBe(1);
      expect(graph.statistics.companiesByType.subsidiary).toBe(1);
      expect(graph.statistics.relationshipsByType.owns).toBe(1);
    });
  });

  describe('findPath', () => {
    beforeEach(async () => {
      // Create a chain of companies: A -> B -> C -> D
      await Promise.all([
        service.addCompany({ corpId: 'a', name: 'Company A', type: 'holding', role: 'Parent' }),
        service.addCompany({ corpId: 'b', name: 'Company B', type: 'subsidiary', role: 'Child' }),
        service.addCompany({ corpId: 'c', name: 'Company C', type: 'subsidiary', role: 'Child' }),
        service.addCompany({ corpId: 'd', name: 'Company D', type: 'partner', role: 'Partner' }),
      ]);

      await Promise.all([
        service.addRelationship({ sourceId: 'a', targetId: 'b', relationship: 'owns' }),
        service.addRelationship({ sourceId: 'b', targetId: 'c', relationship: 'owns' }),
        service.addRelationship({ sourceId: 'c', targetId: 'd', relationship: 'provides' }),
      ]);
    });

    it('should find path between connected companies', async () => {
      const result = await service.findPath('a', 'd');

      expect(result.exists).toBe(true);
      expect(result.hops).toBe(3);
      expect(result.path?.length).toBe(4);
      expect(result.path?.[0].corpId).toBe('a');
      expect(result.path?.[3].corpId).toBe('d');
    });

    it('should return same company for self path', async () => {
      const result = await service.findPath('a', 'a');

      expect(result.exists).toBe(true);
      expect(result.hops).toBe(0);
      expect(result.path?.length).toBe(1);
      expect(result.path?.[0].corpId).toBe('a');
    });

    it('should return no path for disconnected companies', async () => {
      await service.addCompany({ corpId: 'isolated', name: 'Isolated', type: 'partner', role: 'Partner' });

      const result = await service.findPath('a', 'isolated');

      expect(result.exists).toBe(false);
      expect(result.hops).toBe(-1);
    });
  });

  describe('deleteCompany', () => {
    it('should delete company and its relationships', async () => {
      await Promise.all([
        service.addCompany({ corpId: 'delete-test-1', name: 'Delete Test 1', type: 'holding', role: 'Parent' }),
        service.addCompany({ corpId: 'delete-test-2', name: 'Delete Test 2', type: 'subsidiary', role: 'Child' }),
      ]);

      await service.addRelationship({
        sourceId: 'delete-test-1',
        targetId: 'delete-test-2',
        relationship: 'owns',
      });

      await service.deleteCompany('delete-test-1');

      const company = await service.getCompany('delete-test-1');
      expect(company).toBeNull();
    });

    it('should throw error for non-existent company', async () => {
      await expect(service.deleteCompany('non-existent')).rejects.toThrow('not found');
    });
  });
});