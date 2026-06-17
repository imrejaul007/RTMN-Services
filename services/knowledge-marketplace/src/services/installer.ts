import { v4 as uuidv4 } from 'uuid';
import { Knowledge } from '../models/Knowledge';
import { Installation } from '../models/Installation';
import { InstallRequest, InstallationDocument, Industry } from '../types';

class InstallerService {
  /**
   * Install knowledge to a client
   */
  async install(request: InstallRequest): Promise<InstallationDocument> {
    const { knowledgeId, clientId, clientName } = request;

    // Get knowledge to determine industry
    const knowledge = await Knowledge.findOne({ knowledgeId });
    if (!knowledge) {
      throw new Error('Knowledge not found');
    }

    // Check for existing installation that might be paused or uninstalled
    const existingInstallation = await Installation.findOne({
      knowledgeId,
      clientId
    });

    if (existingInstallation) {
      // Reactivate existing installation
      existingInstallation.status = 'active';
      existingInstallation.installedAt = new Date();
      existingInstallation.lastUsedAt = new Date();
      return await existingInstallation.save();
    }

    // Create new installation
    const installation = new Installation({
      installationId: `INST-${uuidv4().slice(0, 8).toUpperCase()}`,
      knowledgeId,
      clientId,
      clientName,
      industry: knowledge.industry as Industry,
      installedAt: new Date(),
      status: 'active',
      lastUsedAt: new Date(),
      usageCount: 0
    });

    await installation.save();
    return installation;
  }

  /**
   * Uninstall knowledge from a client
   */
  async uninstall(knowledgeId: string, clientId: string): Promise<InstallationDocument | null> {
    const installation = await Installation.findOneAndUpdate(
      { knowledgeId, clientId, status: 'active' },
      {
        $set: { status: 'uninstalled' }
      },
      { new: true }
    );

    return installation;
  }

  /**
   * Pause an installation
   */
  async pause(knowledgeId: string, clientId: string): Promise<InstallationDocument | null> {
    const installation = await Installation.findOneAndUpdate(
      { knowledgeId, clientId, status: 'active' },
      {
        $set: { status: 'paused' }
      },
      { new: true }
    );

    return installation;
  }

  /**
   * Resume a paused installation
   */
  async resume(knowledgeId: string, clientId: string): Promise<InstallationDocument | null> {
    const installation = await Installation.findOneAndUpdate(
      { knowledgeId, clientId, status: 'paused' },
      {
        $set: { status: 'active', lastUsedAt: new Date() }
      },
      { new: true }
    );

    return installation;
  }

  /**
   * Track usage of installed knowledge
   */
  async trackUsage(knowledgeId: string, clientId: string): Promise<void> {
    await Installation.updateOne(
      { knowledgeId, clientId, status: 'active' },
      {
        $inc: { usageCount: 1 },
        $set: { lastUsedAt: new Date() }
      }
    );
  }

  /**
   * Get installation statistics
   */
  async getStats(knowledgeId: string): Promise<{
    totalInstalls: number;
    activeInstalls: number;
    pausedInstalls: number;
    totalUsage: number;
  }> {
    const installations = await Installation.find({ knowledgeId });

    return {
      totalInstalls: installations.length,
      activeInstalls: installations.filter(i => i.status === 'active').length,
      pausedInstalls: installations.filter(i => i.status === 'paused').length,
      totalUsage: installations.reduce((sum, i) => sum + i.usageCount, 0)
    };
  }

  /**
   * Get all clients using a specific knowledge
   */
  async getClients(knowledgeId: string): Promise<InstallationDocument[]> {
    return await Installation.find({ knowledgeId }).sort({ installedAt: -1 });
  }
}

export const installerService = new InstallerService();
