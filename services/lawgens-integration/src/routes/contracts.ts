import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { legalProfileStore, Contract } from '../models/LegalProfile';
import { CustomerOpsBridge } from '../services/customerOpsBridge';
import { LegalSyncService } from '../services/legalSync';
import winston from 'winston';

export function contractsRouter(
  customerOpsBridge: CustomerOpsBridge,
  legalSyncService: LegalSyncService,
  logger: winston.Logger
): Router {
  const router = Router();

  // Get all contracts
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { profileId, status, type } = req.query;
      let contracts = legalProfileStore.getAllContracts();

      if (profileId) {
        contracts = contracts.filter(c => c.profileId === profileId);
      }
      if (status) {
        contracts = contracts.filter(c => c.status === status);
      }
      if (type) {
        contracts = contracts.filter(c => c.type === type);
      }

      res.json({ contracts, count: contracts.length });
    } catch (error) {
      logger.error('Error fetching contracts:', error);
      res.status(500).json({ error: 'Failed to fetch contracts' });
    }
  });

  // Get contract by ID
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const contract = legalProfileStore.getContract(req.params.id);
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }
      res.json(contract);
    } catch (error) {
      logger.error('Error fetching contract:', error);
      res.status(500).json({ error: 'Failed to fetch contract' });
    }
  });

  // Create new contract
  router.post('/', async (req: Request, res: Response) => {
    try {
      const contractData = req.body;

      // Validate required fields
      if (!contractData.profileId || !contractData.title || !contractData.type) {
        return res.status(400).json({
          error: 'Missing required fields: profileId, title, type'
        });
      }

      // Create contract
      const contract = legalProfileStore.createContract({
        ...contractData,
        status: 'draft',
        parties: contractData.parties || [],
        terms: contractData.terms || {},
        documents: [],
        milestones: contractData.milestones || [],
        complianceRequirements: contractData.complianceRequirements || [],
        metadata: contractData.metadata || {}
      });

      // Sync to Knowledge Twin
      await legalSyncService.syncContractToKnowledgeTwin(contract);

      // Sync to Journey Twin for legal milestones
      await legalSyncService.syncContractToJourneyTwin(contract);

      // Publish event to event bus
      await customerOpsBridge.publishEvent('contract.created', {
        contractId: contract.id,
        profileId: contract.profileId,
        type: contract.type,
        title: contract.title
      });

      logger.info(`Contract created: ${contract.id}`);
      res.status(201).json(contract);
    } catch (error) {
      logger.error('Error creating contract:', error);
      res.status(500).json({ error: 'Failed to create contract' });
    }
  });

  // Update contract
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const existing = legalProfileStore.getContract(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      const updated = legalProfileStore.updateContract(req.params.id, req.body);
      if (!updated) {
        return res.status(500).json({ error: 'Failed to update contract' });
      }

      // Sync updates
      await legalSyncService.syncContractToKnowledgeTwin(updated);
      await legalSyncService.syncContractToJourneyTwin(updated);

      // Publish update event
      await customerOpsBridge.publishEvent('contract.updated', {
        contractId: updated.id,
        changes: Object.keys(req.body)
      });

      logger.info(`Contract updated: ${updated.id}`);
      res.json(updated);
    } catch (error) {
      logger.error('Error updating contract:', error);
      res.status(500).json({ error: 'Failed to update contract' });
    }
  });

  // Add milestone to contract
  router.post('/:id/milestones', async (req: Request, res: Response) => {
    try {
      const contract = legalProfileStore.getContract(req.params.id);
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      const milestone = {
        id: `MS-${uuidv4()}`,
        name: req.body.name,
        description: req.body.description,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
        status: 'pending' as const,
        notificationSent: false
      };

      const updated = legalProfileStore.updateContract(req.params.id, {
        milestones: [...contract.milestones, milestone]
      });

      // Sync to journey twin
      await legalSyncService.syncMilestoneToJourneyTwin(contract.profileId, milestone);

      logger.info(`Milestone added to contract ${contract.id}: ${milestone.name}`);
      res.status(201).json(milestone);
    } catch (error) {
      logger.error('Error adding milestone:', error);
      res.status(500).json({ error: 'Failed to add milestone' });
    }
  });

  // Update milestone status
  router.patch('/:id/milestones/:milestoneId', async (req: Request, res: Response) => {
    try {
      const contract = legalProfileStore.getContract(req.params.id);
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      const milestoneIndex = contract.milestones.findIndex(
        m => m.id === req.params.milestoneId
      );
      if (milestoneIndex === -1) {
        return res.status(404).json({ error: 'Milestone not found' });
      }

      contract.milestones[milestoneIndex] = {
        ...contract.milestones[milestoneIndex],
        ...req.body,
        id: contract.milestones[milestoneIndex].id
      };

      const updated = legalProfileStore.updateContract(req.params.id, {
        milestones: contract.milestones
      });

      await customerOpsBridge.publishEvent('contract.milestone.updated', {
        contractId: contract.id,
        milestoneId: req.params.milestoneId,
        status: req.body.status
      });

      res.json(contract.milestones[milestoneIndex]);
    } catch (error) {
      logger.error('Error updating milestone:', error);
      res.status(500).json({ error: 'Failed to update milestone' });
    }
  });

  // Add party to contract
  router.post('/:id/parties', async (req: Request, res: Response) => {
    try {
      const contract = legalProfileStore.getContract(req.params.id);
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      const party = {
        id: `PTY-${uuidv4()}`,
        ...req.body,
        signedAt: undefined,
        signature: undefined
      };

      const updated = legalProfileStore.updateContract(req.params.id, {
        parties: [...contract.parties, party]
      });

      // Fetch party info from Customer Ops
      if (party.email) {
        const customerData = await customerOpsBridge.getCustomerData(party.email);
        if (customerData) {
          await legalSyncService.syncPartyToKnowledgeTwin(contract.id, party, customerData);
        }
      }

      res.status(201).json(party);
    } catch (error) {
      logger.error('Error adding party:', error);
      res.status(500).json({ error: 'Failed to add party' });
    }
  });

  // Sign contract
  router.post('/:id/sign', async (req: Request, res: Response) => {
    try {
      const { partyId, signature } = req.body;
      const contract = legalProfileStore.getContract(req.params.id);
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      const partyIndex = contract.parties.findIndex(p => p.id === partyId);
      if (partyIndex === -1) {
        return res.status(404).json({ error: 'Party not found' });
      }

      contract.parties[partyIndex].signedAt = new Date();
      contract.parties[partyIndex].signature = signature;

      // Check if all parties have signed
      const allSigned = contract.parties.every(p => p.signedAt);

      const updated = legalProfileStore.updateContract(req.params.id, {
        parties: contract.parties,
        status: allSigned ? 'active' : 'pending_signature'
      });

      // Publish signature event
      await customerOpsBridge.publishEvent('contract.signed', {
        contractId: contract.id,
        partyId,
        allPartiesSigned: allSigned
      });

      logger.info(`Contract ${contract.id} signed by party ${partyId}`);
      res.json({ contract: updated, allPartiesSigned: allSigned });
    } catch (error) {
      logger.error('Error signing contract:', error);
      res.status(500).json({ error: 'Failed to sign contract' });
    }
  });

  // Get contract analytics
  router.get('/:id/analytics', async (req: Request, res: Response) => {
    try {
      const contract = legalProfileStore.getContract(req.params.id);
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      const analytics = {
        contractId: contract.id,
        status: contract.status,
        parties: {
          total: contract.parties.length,
          signed: contract.parties.filter(p => p.signedAt).length,
          pending: contract.parties.filter(p => !p.signedAt).length
        },
        milestones: {
          total: contract.milestones.length,
          completed: contract.milestones.filter(m => m.status === 'completed').length,
          pending: contract.milestones.filter(m => m.status === 'pending').length,
          overdue: contract.milestones.filter(m => m.status === 'overdue').length
        },
        documents: {
          count: contract.documents.length
        },
        value: contract.value,
        duration: contract.expirationDate && contract.effectiveDate
          ? Math.ceil((new Date(contract.expirationDate).getTime() - new Date(contract.effectiveDate).getTime()) / (1000 * 60 * 60 * 24))
          : null
      };

      res.json(analytics);
    } catch (error) {
      logger.error('Error fetching analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });

  // Delete contract
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const contract = legalProfileStore.getContract(req.params.id);
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      // Archive instead of hard delete
      legalProfileStore.updateContract(req.params.id, {
        status: 'terminated',
        metadata: { ...contract.metadata, deletedAt: new Date() }
      });

      await customerOpsBridge.publishEvent('contract.terminated', {
        contractId: contract.id,
        profileId: contract.profileId
      });

      logger.info(`Contract terminated: ${contract.id}`);
      res.json({ status: 'contract_terminated', id: contract.id });
    } catch (error) {
      logger.error('Error terminating contract:', error);
      res.status(500).json({ error: 'Failed to terminate contract' });
    }
  });

  return router;
}
