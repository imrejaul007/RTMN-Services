import { v4 as uuidv4 } from 'uuid';
import { Workflow } from '../models/Workflow';
import { Installation, IInstallation } from '../models/Installation';
import logger from '../logger';

export interface InstallOptions {
  clientId: string;
  config?: Record<string, unknown>;
}

export interface InstallResult {
  success: boolean;
  installation?: IInstallation;
  error?: string;
}

export class InstallerService {
  /**
   * Install a workflow for a client
   */
  async installWorkflow(
    workflowId: string,
    options: InstallOptions
  ): Promise<InstallResult> {
    try {
      // Check if workflow exists
      const workflow = await Workflow.findOne({ workflowId });
      if (!workflow) {
        return { success: false, error: 'Workflow not found' };
      }

      // Check if already installed
      const existing = await Installation.findOne({
        workflowId,
        clientId: options.clientId,
      });
      if (existing) {
        return {
          success: false,
          error: 'Workflow already installed for this client',
        };
      }

      // Create installation
      const installation = new Installation({
        installationId: `INST-${uuidv4().substring(0, 8).toUpperCase()}`,
        workflowId,
        clientId: options.clientId,
        config: options.config || {},
        status: 'active',
        installedAt: new Date(),
        triggerCount: 0,
      });

      await installation.save();

      // Increment install count
      await Workflow.findOneAndUpdate(
        { workflowId },
        { $inc: { installs: 1 } }
      );

      logger.info(`Workflow ${workflowId} installed for client ${options.clientId}`);

      return { success: true, installation };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to install workflow: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Uninstall a workflow
   */
  async uninstallWorkflow(
    workflowId: string,
    clientId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await Installation.findOneAndDelete({
        workflowId,
        clientId,
      });

      if (!result) {
        return { success: false, error: 'Installation not found' };
      }

      // Decrement install count
      await Workflow.findOneAndUpdate(
        { workflowId },
        { $inc: { installs: -1 } }
      );

      logger.info(`Workflow ${workflowId} uninstalled for client ${clientId}`);
      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to uninstall workflow: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get all installations for a client
   */
  async getClientInstallations(
    clientId: string
  ): Promise<IInstallation[]> {
    return Installation.find({ clientId }).sort({ installedAt: -1 });
  }

  /**
   * Update installation status
   */
  async updateStatus(
    installationId: string,
    status: 'pending' | 'active' | 'paused' | 'failed'
  ): Promise<IInstallation | null> {
    return Installation.findOneAndUpdate(
      { installationId },
      { status },
      { new: true }
    );
  }

  /**
   * Record workflow trigger
   */
  async recordTrigger(installationId: string): Promise<void> {
    await Installation.findOneAndUpdate(
      { installationId },
      {
        lastTriggered: new Date(),
        $inc: { triggerCount: 1 },
      }
    );
  }
}

export const installerService = new InstallerService();
