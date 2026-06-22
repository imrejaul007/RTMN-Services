import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { Signature, ISignature } from '../models/Signature';
import { Contract } from '../models/Contract';
import { logger } from '../utils/logger';
import { emailService } from './emailService';

export interface SignatureRequestDto {
  contractId: string;
  parties: {
    name: string;
    email: string;
    role: 'signer' | 'witness' | 'approver';
  }[];
  tenantId: string;
  requestedBy: string;
  expiryDays?: number;
}

export interface SignContractDto {
  signatureToken: string;
  signatureData: string;
  ipAddress: string;
  userAgent?: string;
}

export interface DeclineSignatureDto {
  signatureToken: string;
  reason: string;
}

export class SignatureService {
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async sendForSignature(dto: SignatureRequestDto): Promise<{
    signatures: ISignature[];
    contractId: string;
  }> {
    const contract = await Contract.findOne({
      contractId: dto.contractId,
      tenantId: dto.tenantId
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    if (contract.status === 'signed') {
      throw new Error('Contract is already fully signed');
    }

    const expiryDays = dto.expiryDays || parseInt(process.env.CONTRACT_SIGNATURE_EXPIRY_DAYS || '30', 10);
    const tokenExpiry = new Date();
    tokenExpiry.setDate(tokenExpiry.getDate() + expiryDays);

    const signatures: ISignature[] = [];

    for (const party of dto.parties) {
      const existingSignature = await Signature.findOne({
        contractId: dto.contractId,
        partyEmail: party.email,
        status: 'pending'
      });

      if (existingSignature) {
        signatures.push(existingSignature);
        continue;
      }

      const signatureId = `SIG-${uuidv4().substring(0, 8).toUpperCase()}`;
      const signatureToken = this.generateToken();

      const signature = new Signature({
        signatureId,
        contractId: dto.contractId,
        partyName: party.name,
        partyEmail: party.email,
        partyRole: party.role,
        status: 'pending',
        signatureToken,
        tokenExpiry,
        sentAt: new Date(),
        reminderCount: 0,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date()
        },
        tenantId: dto.tenantId
      });

      await signature.save();
      signatures.push(signature);

      await emailService.sendSignatureRequestEmail({
        to: party.email,
        name: party.name,
        contractTitle: contract.title,
        contractId: dto.contractId,
        signatureUrl: `${process.env.FRONTEND_URL}/sign/${signatureToken}`,
        expiryDate: tokenExpiry
      });

      logger.info(`Signature request sent to ${party.email} for contract ${dto.contractId}`, {
        signatureId,
        contractId: dto.contractId,
        tenantId: dto.tenantId
      });
    }

    await Contract.updateOne(
      { contractId: dto.contractId, tenantId: dto.tenantId },
      {
        $set: {
          status: 'pending_signature',
          signatureToken: signatures[0]?.signatureToken,
          signatureTokenExpiry: tokenExpiry
        },
        $push: {
          auditTrail: {
            $each: [{
              action: 'signature_requested',
              performedBy: dto.requestedBy,
              performedAt: new Date(),
              details: `Signature requests sent to ${dto.parties.map(p => p.email).join(', ')}`
            }]
          }
        }
      }
    );

    return { signatures, contractId: dto.contractId };
  }

  async getSignaturesByContract(contractId: string, tenantId: string): Promise<ISignature[]> {
    return Signature.find({ contractId, tenantId })
      .sort({ sentAt: -1 })
      .lean() as unknown as ISignature[];
  }

  async getSignatureByToken(token: string): Promise<ISignature | null> {
    return Signature.findOne({ signatureToken: token });
  }

  async signContract(dto: SignContractDto): Promise<{
    success: boolean;
    contractId: string;
    remainingSignatures: number;
  }> {
    const signature = await Signature.findOne({
      signatureToken: dto.signatureToken,
      status: 'pending'
    });

    if (!signature) {
      throw new Error('Signature request not found or already processed');
    }

    const isValid = signature.status === 'pending' && new Date() < signature.tokenExpiry;
    if (!isValid) {
      signature.status = 'expired';
      await signature.save();
      throw new Error('Signature link has expired');
    }

    signature.status = 'signed';
    signature.signatureData = dto.signatureData;
    signature.signedAt = new Date();
    signature.ipAddress = dto.ipAddress;
    signature.userAgent = dto.userAgent;
    signature.metadata.updatedAt = new Date();
    await signature.save();

    const contract = await Contract.findOne({ contractId: signature.contractId });
    if (contract) {
      const partyIndex = contract.parties.findIndex(p => p.email === signature.partyEmail);
      if (partyIndex !== -1) {
        contract.parties[partyIndex].signedAt = signature.signedAt;
        contract.parties[partyIndex].signatureData = dto.signatureData;
        contract.parties[partyIndex].ipAddress = dto.ipAddress;
        contract.parties[partyIndex].userAgent = dto.userAgent;
      }

      const allSignatures = await Signature.find({
        contractId: signature.contractId,
        tenantId: signature.tenantId
      });

      const pendingSignatures = allSignatures.filter(s => s.status === 'pending').length;
      const signedSignatures = allSignatures.filter(s => s.status === 'signed').length;

      if (pendingSignatures === 0) {
        contract.status = 'signed';
        contract.metadata.signedAt = new Date();
      } else {
        contract.status = 'partially_signed';
      }

      contract.auditTrail.push({
        action: 'signed',
        performedBy: signature.partyEmail,
        performedAt: new Date(),
        details: `${signature.partyName} (${signature.partyRole}) signed the contract`
      });

      await contract.save();

      if (contract.status === 'signed') {
        await emailService.sendContractSignedNotification({
          contractId: contract.contractId,
          title: contract.title,
          parties: contract.parties,
          tenantId: contract.tenantId
        });
      }

      logger.info(`Contract signed by ${signature.partyEmail}`, {
        signatureId: signature.signatureId,
        contractId: signature.contractId,
        tenantId: signature.tenantId
      });

      return {
        success: true,
        contractId: signature.contractId,
        remainingSignatures: pendingSignatures
      };
    }

    throw new Error('Contract not found');
  }

  async declineSignature(dto: DeclineSignatureDto): Promise<void> {
    const signature = await Signature.findOne({
      signatureToken: dto.signatureToken,
      status: 'pending'
    });

    if (!signature) {
      throw new Error('Signature request not found or already processed');
    }

    signature.status = 'declined';
    signature.declineReason = dto.reason;
    signature.metadata.updatedAt = new Date();
    await signature.save();

    const contract = await Contract.findOne({ contractId: signature.contractId });
    if (contract) {
      contract.auditTrail.push({
        action: 'signature_declined',
        performedBy: signature.partyEmail,
        performedAt: new Date(),
        details: `${signature.partyName} declined to sign: ${dto.reason}`
      });
      await contract.save();
    }

    logger.info(`Signature declined by ${signature.partyEmail}`, {
      signatureId: signature.signatureId,
      contractId: signature.contractId,
      reason: dto.reason
    });

    await emailService.sendSignatureDeclinedNotification({
      contractId: signature.contractId,
      partyName: signature.partyName,
      partyEmail: signature.partyEmail,
      reason: dto.reason,
      tenantId: signature.tenantId
    });
  }

  async resendSignatureRequest(signatureId: string, tenantId: string): Promise<void> {
    const signature = await Signature.findOne({ signatureId, tenantId, status: 'pending' });
    if (!signature) {
      throw new Error('Pending signature request not found');
    }

    const expiryDays = parseInt(process.env.CONTRACT_SIGNATURE_EXPIRY_DAYS || '30', 10);
    signature.tokenExpiry = new Date();
    signature.tokenExpiry.setDate(signature.tokenExpiry.getDate() + expiryDays);
    signature.reminderCount += 1;
    signature.lastReminderAt = new Date();
    await signature.save();

    const contract = await Contract.findOne({ contractId: signature.contractId });

    await emailService.sendSignatureRequestEmail({
      to: signature.partyEmail,
      name: signature.partyName,
      contractTitle: contract?.title || 'Contract',
      contractId: signature.contractId,
      signatureUrl: `${process.env.FRONTEND_URL}/sign/${signature.signatureToken}`,
      expiryDate: signature.tokenExpiry,
      isReminder: true
    });

    logger.info(`Signature reminder sent to ${signature.partyEmail}`, {
      signatureId,
      reminderCount: signature.reminderCount
    });
  }

  async expireOldSignatures(): Promise<number> {
    const result = await Signature.updateMany(
      {
        status: 'pending',
        tokenExpiry: { $lt: new Date() }
      },
      {
        $set: { status: 'expired' }
      }
    );

    if (result.modifiedCount > 0) {
      logger.info(`Expired ${result.modifiedCount} signature requests`);
    }

    return result.modifiedCount;
  }

  async getSignatureStatus(contractId: string, tenantId: string): Promise<{
    contractId: string;
    status: string;
    totalParties: number;
    signedParties: number;
    pendingParties: number;
    declinedParties: number;
    expiredParties: number;
    parties: {
      name: string;
      email: string;
      role: string;
      status: string;
      signedAt?: Date;
    }[];
  }> {
    const signatures = await Signature.find({ contractId, tenantId }).lean();

    const contract = await Contract.findOne({ contractId, tenantId });
    const parties = contract?.parties || [];

    return {
      contractId,
      status: contract?.status || 'unknown',
      totalParties: parties.length,
      signedParties: signatures.filter(s => s.status === 'signed').length,
      pendingParties: signatures.filter(s => s.status === 'pending').length,
      declinedParties: signatures.filter(s => s.status === 'declined').length,
      expiredParties: signatures.filter(s => s.status === 'expired').length,
      parties: parties.map(p => {
        const sig = signatures.find(s => s.partyEmail === p.email);
        return {
          name: p.name,
          email: p.email,
          role: p.role,
          status: sig?.status || 'not_sent',
          signedAt: sig?.signedAt
        };
      })
    };
  }
}

export const signatureService = new SignatureService();
