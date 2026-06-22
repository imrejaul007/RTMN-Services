/**
 * GENIE Drive Connector - Business Logic
 */
import { DriveConnection, DriveDocument, IDriveConnection, IDriveDocument } from '../models/index.js';
import { GoogleDriveService, getGoogleDriveService } from './googleDriveService.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('drive-connector');

export class DriveConnectorService {
  private driveService: GoogleDriveService;

  constructor() { this.driveService = getGoogleDriveService(); }

  async connect(tenantId: string, userId: string, email: string, accessToken: string, refreshToken: string, expiryDate: number): Promise<IDriveConnection> {
    const connection = await DriveConnection.findOneAndUpdate(
      { tenant_id: tenantId, user_id: userId },
      { tenant_id: tenantId, user_id: userId, email, access_token: accessToken, refresh_token: refreshToken, token_expiry: new Date(expiryDate) },
      { upsert: true, new: true }
    );
    logger.info('drive_connected', { tenantId, userId, email });
    return connection;
  }

  async disconnect(tenantId: string, userId: string): Promise<boolean> {
    await DriveConnection.deleteOne({ tenant_id: tenantId, user_id: userId });
    await DriveDocument.deleteMany({ tenant_id: tenantId, linked_user_id: userId });
    logger.info('drive_disconnected', { tenantId, userId });
    return true;
  }

  async sync(tenantId: string, userId: string): Promise<{ synced: number; errors: string[] }> {
    const connection = await DriveConnection.findOne({ tenant_id: tenantId, user_id: userId });
    if (!connection) throw new Error('No connection found');

    this.driveService.setCredentials(connection.access_token!, connection.refresh_token!, connection.token_expiry.getTime());
    const query = this.driveService.buildQuery(connection.settings);
    const files = await this.driveService.listFiles(query);

    let synced = 0;
    const errors: string[] = [];

    for (const file of files) {
      try {
        const content = await this.driveService.getFileContent(file.id!);
        await DriveDocument.findOneAndUpdate(
          { tenant_id: tenantId, linked_user_id: userId, drive_file_id: file.id },
          {
            tenant_id: tenantId, linked_user_id: userId, connection_id: connection._id.toString(),
            drive_file_id: file.id!, name: file.name!, mime_type: this.driveService.getMimeTypeCategory(file.mimeType!),
            parent_id: file.parents?.[0], path: file.name!,
            content: content || undefined, size: parseInt(file.size || '0'),
            created_time: new Date(file.createdTime!), modified_time: new Date(file.modifiedTime!),
            last_synced: new Date(),
          },
          { upsert: true, new: true }
        );
        synced++;
      } catch (error) {
        errors.push(`Failed to sync ${file.name}: ${error}`);
      }
    }

    connection.last_sync = new Date();
    await connection.save();
    logger.info('drive_synced', { tenantId, userId, synced, errors: errors.length });
    return { synced, errors };
  }

  async getDocuments(tenantId: string, userId: string, type?: string): Promise<IDriveDocument[]> {
    const query: Record<string, unknown> = { tenant_id: tenantId, linked_user_id: userId };
    if (type) query.mime_type = type;
    return DriveDocument.find(query).sort({ modified_time: -1 });
  }

  async searchDocuments(tenantId: string, userId: string, query: string): Promise<IDriveDocument[]> {
    return DriveDocument.find({
      tenant_id: tenantId, linked_user_id: userId,
      $or: [{ name: { $regex: query, $options: 'i' } }, { content: { $regex: query, $options: 'i' } }],
    });
  }

  async getConnection(tenantId: string, userId: string): Promise<IDriveConnection | null> {
    return DriveConnection.findOne({ tenant_id: tenantId, user_id: userId });
  }
}

let instance: DriveConnectorService | null = null;
export function getDriveConnectorService(): DriveConnectorService {
  if (!instance) instance = new DriveConnectorService();
  return instance;
}
