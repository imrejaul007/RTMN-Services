import { Router, Request, Response } from 'express';
import { intercompanyService } from '../services/intercompany.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /nodes - Add a new company node
 */
router.post('/nodes', async (req: Request, res: Response) => {
  try {
    const company = await intercompanyService.addCompany(req.body);
    logger.info('Company created via API', { corpId: company.corpId });
    res.status(201).json({
      success: true,
      data: company,
      message: 'Company added successfully',
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Error creating company', { error: err.message });
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * GET /nodes/:corpId - Get a company by corpId
 */
router.get('/nodes/:corpId', async (req: Request, res: Response) => {
  try {
    const { corpId } = req.params;
    const company = await intercompanyService.getCompany(corpId);
    if (!company) {
      res.status(404).json({
        success: false,
        error: `Company ${corpId} not found`,
      });
      return;
    }
    res.json({
      success: true,
      data: company,
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Error getting company', { error: err.message });
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * GET /nodes - List all companies with optional filters
 */
router.get('/nodes', async (req: Request, res: Response) => {
  try {
    const { type, status, tags } = req.query;
    const filters: {
      type?: string;
      status?: string;
      tags?: string[];
    } = {};

    if (type) filters.type = type as string;
    if (status) filters.status = status as string;
    if (tags) filters.tags = (tags as string).split(',');

    const companies = await intercompanyService.listCompanies(
      filters as Parameters<typeof intercompanyService.listCompanies>[0]
    );
    res.json({
      success: true,
      data: companies,
      count: companies.length,
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Error listing companies', { error: err.message });
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * PUT /nodes/:corpId - Update a company
 */
router.put('/nodes/:corpId', async (req: Request, res: Response) => {
  try {
    const { corpId } = req.params;
    const company = await intercompanyService.updateCompany(corpId, req.body);
    if (!company) {
      res.status(404).json({
        success: false,
        error: `Company ${corpId} not found`,
      });
      return;
    }
    res.json({
      success: true,
      data: company,
      message: 'Company updated successfully',
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Error updating company', { error: err.message });
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * DELETE /nodes/:corpId - Delete a company
 */
router.delete('/nodes/:corpId', async (req: Request, res: Response) => {
  try {
    const { corpId } = req.params;
    await intercompanyService.deleteCompany(corpId);
    res.json({
      success: true,
      message: `Company ${corpId} deleted successfully`,
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Error deleting company', { error: err.message });
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * POST /edges - Add a relationship edge
 */
router.post('/edges', async (req: Request, res: Response) => {
  try {
    const edge = await intercompanyService.addRelationship(req.body);
    logger.info('Relationship created via API', {
      sourceId: edge.sourceId,
      targetId: edge.targetId,
    });
    res.status(201).json({
      success: true,
      data: edge,
      message: 'Relationship added successfully',
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Error creating relationship', { error: err.message });
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * GET /edges/:edgeId - Get a relationship by edgeId
 */
router.get('/edges/:edgeId', async (req: Request, res: Response) => {
  try {
    // This would require adding a method to get single edge
    res.status(501).json({
      success: false,
      error: 'Not implemented',
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Error getting edge', { error: err.message });
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * PUT /edges/:edgeId - Update a relationship
 */
router.put('/edges/:edgeId', async (req: Request, res: Response) => {
  try {
    const { edgeId } = req.params;
    const edge = await intercompanyService.updateRelationship(edgeId, req.body);
    if (!edge) {
      res.status(404).json({
        success: false,
        error: `Relationship ${edgeId} not found`,
      });
      return;
    }
    res.json({
      success: true,
      data: edge,
      message: 'Relationship updated successfully',
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Error updating edge', { error: err.message });
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * DELETE /edges/:edgeId - Delete a relationship
 */
router.delete('/edges/:edgeId', async (req: Request, res: Response) => {
  try {
    const { edgeId } = req.params;
    await intercompanyService.deleteRelationship(edgeId);
    res.json({
      success: true,
      message: `Relationship ${edgeId} deleted successfully`,
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Error deleting edge', { error: err.message });
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * GET /relationships/:corpId - Get all relationships for a company
 */
router.get('/relationships/:corpId', async (req: Request, res: Response) => {
  try {
    const { corpId } = req.params;
    const relationships = await intercompanyService.getRelationships(corpId);
    res.json({
      success: true,
      data: relationships,
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Error getting relationships', { error: err.message });
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * GET /flow/:corpId - Get money flow for a company
 */
router.get('/flow/:corpId', async (req: Request, res: Response) => {
  try {
    const { corpId } = req.params;
    const flow = await intercompanyService.getMoneyFlow(corpId);
    res.json({
      success: true,
      data: flow,
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Error getting money flow', { error: err.message });
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * GET /graph - Get the full economic network graph
 */
router.get('/graph', async (req: Request, res: Response) => {
  try {
    const graph = await intercompanyService.getFullGraph();
    res.json({
      success: true,
      data: graph,
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Error getting graph', { error: err.message });
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * GET /path/:fromId/:toId - Find path between two companies
 */
router.get('/path/:fromId/:toId', async (req: Request, res: Response) => {
  try {
    const { fromId, toId } = req.params;
    const path = await intercompanyService.findPath(fromId, toId);
    res.json({
      success: true,
      data: path,
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Error finding path', { error: err.message });
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * GET /statistics - Get graph statistics
 */
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const graph = await intercompanyService.getFullGraph();
    res.json({
      success: true,
      data: graph.statistics,
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Error getting statistics', { error: err.message });
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

export default router;
