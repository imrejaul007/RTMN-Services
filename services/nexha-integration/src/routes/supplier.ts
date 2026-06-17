import { Router, Request, Response } from 'express';
import winston from 'winston';
import {
  Supplier,
  SupplierCertification,
  SupplierRating,
  createSupplier
} from '../models/NexhaProfile';
import { CustomerOpsBridge } from '../services/customerOpsBridge';

export interface SupplierDependencies {
  customerOpsBridge: CustomerOpsBridge;
  logger: winston.Logger;
}

// In-memory store (replace with database in production)
const suppliers: Map<string, Supplier> = new Map();

// Initialize with sample suppliers
const sampleSuppliers: Supplier[] = [
  {
    id: 'sup-001',
    type: 'supplier',
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'active',
    companyName: 'Fresh Farms India',
    tradingName: 'FreshFarms',
    registrationNumber: 'UP123456',
    taxId: 'TAX987654',
    email: 'orders@freshfarms.in',
    phone: '+91-9876543210',
    address: {
      street: '123 Agricultural Lane',
      city: 'Lucknow',
      state: 'Uttar Pradesh',
      postalCode: '226001',
      country: 'India',
      coordinates: { lat: 26.8467, lng: 80.9462 }
    },
    contacts: [
      { name: 'Ramesh Verma', email: 'ramesh@freshfarms.in', phone: '+91-9876543211', role: 'Sales Manager' }
    ],
    categories: ['Fruits', 'Vegetables', 'Organic Products'],
    certifications: [
      {
        type: 'FSSAI License',
        issuer: 'Food Safety and Standards Authority',
        issuedDate: new Date('2024-01-15'),
        expiryDate: new Date('2027-01-14'),
        documentUrl: 'https://example.com/fssai/001'
      }
    ],
    rating: { average: 4.5, totalReviews: 120, deliveryRating: 4.7, qualityRating: 4.8, communicationRating: 4.3 },
    paymentTerms: 'NET30',
    minimumOrderValue: 5000,
    leadTimeDays: 3,
    tags: ['organic', 'fresh', 'local']
  },
  {
    id: 'sup-002',
    type: 'supplier',
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'active',
    companyName: 'Steel Works Manufacturing',
    tradingName: 'SteelWorks',
    registrationNumber: 'MH987654',
    taxId: 'TAX123456',
    email: 'sales@steelworks.in',
    phone: '+91-9876543220',
    address: {
      street: '456 Industrial Estate',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      country: 'India',
      coordinates: { lat: 19.0760, lng: 72.8777 }
    },
    contacts: [
      { name: 'Vikram Singh', email: 'vikram@steelworks.in', phone: '+91-9876543221', role: 'Business Head' }
    ],
    categories: ['Steel', 'Metal Products', 'Industrial Supplies'],
    certifications: [
      {
        type: 'ISO 9001:2015',
        issuer: 'Bureau of Indian Standards',
        issuedDate: new Date('2023-06-01'),
        expiryDate: new Date('2026-05-31'),
        documentUrl: 'https://example.com/iso/9001-001'
      }
    ],
    rating: { average: 4.2, totalReviews: 85, deliveryRating: 4.0, qualityRating: 4.5, communicationRating: 4.1 },
    paymentTerms: 'NET45',
    minimumOrderValue: 25000,
    leadTimeDays: 7,
    tags: ['manufacturing', 'bulk', 'industrial']
  },
  {
    id: 'sup-003',
    type: 'supplier',
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'pending',
    companyName: 'Tech Components Ltd',
    tradingName: 'TechComp',
    registrationNumber: 'TN456789',
    taxId: 'TAX456789',
    email: 'procurement@techcomp.in',
    phone: '+91-9876543230',
    address: {
      street: '789 Electronics Park',
      city: 'Chennai',
      state: 'Tamil Nadu',
      postalCode: '600001',
      country: 'India',
      coordinates: { lat: 13.0827, lng: 80.2707 }
    },
    contacts: [
      { name: 'Lakshmi Narayanan', email: 'lakshmi@techcomp.in', phone: '+91-9876543231', role: 'Procurement Head' }
    ],
    categories: ['Electronics', 'Components', 'Semiconductors'],
    certifications: [],
    rating: { average: 0, totalReviews: 0, deliveryRating: 0, qualityRating: 0, communicationRating: 0 },
    paymentTerms: 'NET30',
    minimumOrderValue: 10000,
    leadTimeDays: 5,
    tags: ['electronics', 'tech', 'components']
  }
];

sampleSuppliers.forEach(supplier => suppliers.set(supplier.id, supplier));

export default function supplierRoutes(
  bridge: CustomerOpsBridge,
  logger: winston.Logger
): Router {
  const router = Router();

  // List all suppliers
  router.get('/', async (req: Request, res: Response) => {
    try {
      let supplierList = Array.from(suppliers.values());

      // Filter by status if provided
      if (req.query.status) {
        supplierList = supplierList.filter(s => s.status === req.query.status);
      }

      // Filter by category if provided
      if (req.query.category) {
        supplierList = supplierList.filter(s =>
          s.categories.some(c => c.toLowerCase().includes(String(req.query.category).toLowerCase()))
        );
      }

      // Search by name if provided
      if (req.query.search) {
        const searchTerm = String(req.query.search).toLowerCase();
        supplierList = supplierList.filter(s =>
          s.companyName.toLowerCase().includes(searchTerm) ||
          s.tags.some(t => t.toLowerCase().includes(searchTerm))
        );
      }

      res.json({
        success: true,
        count: supplierList.length,
        data: supplierList
      });
    } catch (error) {
      logger.error('Error listing suppliers:', error);
      res.status(500).json({ success: false, error: 'Failed to list suppliers' });
    }
  });

  // Get single supplier
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const supplier = suppliers.get(req.params.id);
      if (!supplier) {
        return res.status(404).json({ success: false, error: 'Supplier not found' });
      }
      res.json({ success: true, data: supplier });
    } catch (error) {
      logger.error('Error getting supplier:', error);
      res.status(500).json({ success: false, error: 'Failed to get supplier' });
    }
  });

  // Create new supplier
  router.post('/', async (req: Request, res: Response) => {
    try {
      const {
        companyName,
        email,
        phone,
        address,
        categories,
        paymentTerms,
        minimumOrderValue,
        leadTimeDays,
        tags
      } = req.body;

      if (!companyName || !email || !phone) {
        return res.status(400).json({
          success: false,
          error: 'Company name, email, and phone are required'
        });
      }

      const supplier = createSupplier({
        companyName,
        email,
        phone,
        address,
        categories,
        paymentTerms,
        minimumOrderValue,
        leadTimeDays,
        tags,
        status: 'pending'
      });

      suppliers.set(supplier.id, supplier);
      logger.info(`Created supplier: ${supplier.companyName}`);

      // Sync to twins
      try {
        await bridge.syncToSupplierTwin(supplier);
      } catch (syncError) {
        logger.warn('Supplier Twin sync warning:', syncError);
      }

      res.status(201).json({ success: true, data: supplier });
    } catch (error) {
      logger.error('Error creating supplier:', error);
      res.status(500).json({ success: false, error: 'Failed to create supplier' });
    }
  });

  // Update supplier
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const supplier = suppliers.get(req.params.id);
      if (!supplier) {
        return res.status(404).json({ success: false, error: 'Supplier not found' });
      }

      const updatedSupplier: Supplier = {
        ...supplier,
        ...req.body,
        id: supplier.id,
        type: 'supplier',
        updatedAt: new Date()
      };

      suppliers.set(supplier.id, updatedSupplier);
      logger.info(`Updated supplier: ${updatedSupplier.companyName}`);

      // Sync to twins
      try {
        await bridge.syncToSupplierTwin(updatedSupplier);
      } catch (syncError) {
        logger.warn('Supplier Twin sync warning:', syncError);
      }

      res.json({ success: true, data: updatedSupplier });
    } catch (error) {
      logger.error('Error updating supplier:', error);
      res.status(500).json({ success: false, error: 'Failed to update supplier' });
    }
  });

  // Update supplier status
  router.patch('/:id/status', async (req: Request, res: Response) => {
    try {
      const supplier = suppliers.get(req.params.id);
      if (!supplier) {
        return res.status(404).json({ success: false, error: 'Supplier not found' });
      }

      const { status } = req.body;
      const validStatuses = ['active', 'inactive', 'pending', 'suspended'];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }

      supplier.status = status as Supplier['status'];
      supplier.updatedAt = new Date();

      suppliers.set(supplier.id, supplier);
      logger.info(`Updated supplier status: ${supplier.companyName} -> ${status}`);

      // Publish status change event
      try {
        await bridge.publishEvent({
          type: 'supplier.status_changed',
          source: 'supplier',
          entityType: 'supplier',
          entityId: supplier.id,
          action: 'status_changed',
          data: { companyName: supplier.companyName, newStatus: status }
        });
      } catch (eventError) {
        logger.warn('Event publish warning:', eventError);
      }

      res.json({ success: true, data: supplier });
    } catch (error) {
      logger.error('Error updating supplier status:', error);
      res.status(500).json({ success: false, error: 'Failed to update status' });
    }
  });

  // Add supplier contact
  router.post('/:id/contacts', async (req: Request, res: Response) => {
    try {
      const supplier = suppliers.get(req.params.id);
      if (!supplier) {
        return res.status(404).json({ success: false, error: 'Supplier not found' });
      }

      const { name, email, phone, role } = req.body;

      if (!name || !email || !phone) {
        return res.status(400).json({
          success: false,
          error: 'Name, email, and phone are required'
        });
      }

      supplier.contacts.push({ name, email, phone, role: role || 'Contact' });
      supplier.updatedAt = new Date();

      suppliers.set(supplier.id, supplier);
      logger.info(`Added contact to supplier: ${supplier.companyName}`);

      res.json({ success: true, data: supplier });
    } catch (error) {
      logger.error('Error adding supplier contact:', error);
      res.status(500).json({ success: false, error: 'Failed to add contact' });
    }
  });

  // Add supplier certification
  router.post('/:id/certifications', async (req: Request, res: Response) => {
    try {
      const supplier = suppliers.get(req.params.id);
      if (!supplier) {
        return res.status(404).json({ success: false, error: 'Supplier not found' });
      }

      const { type, issuer, issuedDate, expiryDate, documentUrl } = req.body;

      if (!type || !issuer || !issuedDate || !expiryDate) {
        return res.status(400).json({
          success: false,
          error: 'Type, issuer, issued date, and expiry date are required'
        });
      }

      const certification: SupplierCertification = {
        type,
        issuer,
        issuedDate: new Date(issuedDate),
        expiryDate: new Date(expiryDate),
        documentUrl
      };

      supplier.certifications.push(certification);
      supplier.updatedAt = new Date();

      suppliers.set(supplier.id, supplier);
      logger.info(`Added certification to supplier: ${supplier.companyName}`);

      res.json({ success: true, data: supplier });
    } catch (error) {
      logger.error('Error adding supplier certification:', error);
      res.status(500).json({ success: false, error: 'Failed to add certification' });
    }
  });

  // Update supplier rating
  router.patch('/:id/rating', async (req: Request, res: Response) => {
    try {
      const supplier = suppliers.get(req.params.id);
      if (!supplier) {
        return res.status(404).json({ success: false, error: 'Supplier not found' });
      }

      const { deliveryRating, qualityRating, communicationRating } = req.body;

      // Update individual ratings
      if (typeof deliveryRating === 'number') supplier.rating.deliveryRating = deliveryRating;
      if (typeof qualityRating === 'number') supplier.rating.qualityRating = qualityRating;
      if (typeof communicationRating === 'number') supplier.rating.communicationRating = communicationRating;

      // Recalculate average
      const { deliveryRating: d, qualityRating: q, communicationRating: c } = supplier.rating;
      supplier.rating.average = (d + q + c) / 3;
      supplier.rating.totalReviews++;
      supplier.updatedAt = new Date();

      suppliers.set(supplier.id, supplier);
      logger.info(`Updated ratings for supplier: ${supplier.companyName}`);

      res.json({ success: true, data: supplier });
    } catch (error) {
      logger.error('Error updating supplier rating:', error);
      res.status(500).json({ success: false, error: 'Failed to update rating' });
    }
  });

  // Get suppliers by category
  router.get('/category/:category', async (req: Request, res: Response) => {
    try {
      const categorySuppliers = Array.from(suppliers.values())
        .filter(s => s.categories.some(c => c.toLowerCase() === req.params.category.toLowerCase()));

      res.json({
        success: true,
        count: categorySuppliers.length,
        data: categorySuppliers
      });
    } catch (error) {
      logger.error('Error listing suppliers by category:', error);
      res.status(500).json({ success: false, error: 'Failed to list suppliers' });
    }
  });

  // Get supplier analytics
  router.get('/analytics/summary', async (_req: Request, res: Response) => {
    try {
      const supplierList = Array.from(suppliers.values());

      const summary = {
        totalSuppliers: supplierList.length,
        byStatus: {} as Record<string, number>,
        byCategory: {} as Record<string, number>,
        topRated: [] as { id: string; companyName: string; rating: number }[],
        averageRating: 0
      };

      let totalRating = 0;
      let ratedCount = 0;

      supplierList.forEach(supplier => {
        // Count by status
        summary.byStatus[supplier.status] = (summary.byStatus[supplier.status] || 0) + 1;

        // Count by category
        supplier.categories.forEach(cat => {
          summary.byCategory[cat] = (summary.byCategory[cat] || 0) + 1;
        });

        // Sum ratings
        if (supplier.rating.totalReviews > 0) {
          totalRating += supplier.rating.average;
          ratedCount++;
        }
      });

      // Calculate average rating
      summary.averageRating = ratedCount > 0 ? totalRating / ratedCount : 0;

      // Get top 5 rated suppliers
      summary.topRated = supplierList
        .filter(s => s.rating.totalReviews > 0)
        .sort((a, b) => b.rating.average - a.rating.average)
        .slice(0, 5)
        .map(s => ({ id: s.id, companyName: s.companyName, rating: s.rating.average }));

      res.json({ success: true, data: summary });
    } catch (error) {
      logger.error('Error getting supplier analytics:', error);
      res.status(500).json({ success: false, error: 'Failed to get analytics' });
    }
  });

  // Delete supplier
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const supplier = suppliers.get(req.params.id);
      if (!supplier) {
        return res.status(404).json({ success: false, error: 'Supplier not found' });
      }

      // Only allow deletion of inactive or pending suppliers
      if (supplier.status !== 'inactive' && supplier.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Only inactive or pending suppliers can be deleted'
        });
      }

      suppliers.delete(req.params.id);
      logger.info(`Deleted supplier: ${supplier.companyName}`);

      res.json({ success: true, message: 'Supplier deleted' });
    } catch (error) {
      logger.error('Error deleting supplier:', error);
      res.status(500).json({ success: false, error: 'Failed to delete supplier' });
    }
  });

  return router;
}

export { suppliers };
