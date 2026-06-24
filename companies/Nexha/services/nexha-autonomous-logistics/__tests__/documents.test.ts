import { describe, it, expect } from 'vitest';
import {
  generateShippingDocument,
  renderDocumentHTML,
  type DocumentInput
} from '../src/documents/generator.js';

const sampleShipment = {
  shipmentId: 'SHP-ABC12345',
  bookings: [
    {
      carrierId: 'dhl-express',
      shipmentId: 'SHP-DHL-XYZ',
      trackingNumber: 'DHL-XYZ-123',
      pickupTime: '2026-07-01T10:00:00Z',
      deliveryTime: '2026-07-03T18:00:00Z',
      costUsd: 250.5,
      status: 'confirmed' as const
    },
    {
      carrierId: 'bluedart',
      shipmentId: 'SHP-BLUE-ABC',
      trackingNumber: 'BLUE-ABC-456',
      pickupTime: '2026-07-03T18:00:00Z',
      deliveryTime: '2026-07-04T12:00:00Z',
      costUsd: 45.0,
      status: 'confirmed' as const
    }
  ],
  createdAt: '2026-06-30T10:00:00Z',
  planId: 'PLN-XYZ789'
};

const baseInput: DocumentInput = {
  shipment: sampleShipment,
  seller: { name: 'Acme Corp', address: '123 Main St, NY', taxId: 'TAX-123' },
  buyer: { name: 'Beta LLC', address: '456 Park Ave, London', taxId: 'VAT-UK-456' },
  generatedAt: '2026-06-30T12:00:00Z'
};

describe('generateShippingDocument — commercial-invoice', () => {
  it('produces a structured invoice with all required fields', () => {
    const doc = generateShippingDocument('commercial-invoice', baseInput);
    expect(doc.documentType).toBe('commercial-invoice');
    expect(doc.invoiceNumber).toMatch(/^INV-/);
    expect(doc.seller.name).toBe('Acme Corp');
    expect(doc.buyer.name).toBe('Beta LLC');
    expect(doc.currency).toBe('USD');
    expect(doc.items.length).toBeGreaterThan(0);
    expect(doc.total).toBe(295.5); // 250.5 + 45
  });

  it('uses default parties when not provided', () => {
    const doc = generateShippingDocument('commercial-invoice', {
      shipment: sampleShipment,
      generatedAt: '2026-06-30T12:00:00Z'
    });
    expect(doc.seller.name).toContain('HOJAI');
    expect(doc.buyer.name).toContain('HOJAI');
  });

  it('links to the shipment', () => {
    const doc = generateShippingDocument('commercial-invoice', baseInput);
    expect(doc.relatedShipmentId).toBe('SHP-ABC12345');
  });
});

describe('generateShippingDocument — packing-list', () => {
  it('produces package breakdown by leg', () => {
    const doc = generateShippingDocument('packing-list', baseInput);
    expect(doc.documentType).toBe('packing-list');
    expect(doc.packingListNumber).toMatch(/^PL-/);
    expect(doc.totalPackages).toBe(2);
    expect(doc.packages.length).toBe(2);
    expect(doc.packages[0].trackingNumber).toBe('DHL-XYZ-123');
  });

  it('includes notes field', () => {
    const doc = generateShippingDocument('packing-list', baseInput);
    expect(doc.notes).toBeTruthy();
  });
});

describe('generateShippingDocument — bill-of-lading', () => {
  it('produces a BOL with carrier terms', () => {
    const doc = generateShippingDocument('bill-of-lading', baseInput);
    expect(doc.documentType).toBe('bill-of-lading');
    expect(doc.bolNumber).toMatch(/^BOL-/);
    expect(doc.carrier).toBe('dhl-express');
    expect(doc.trackingNumber).toBe('DHL-XYZ-123');
    expect(doc.legs.length).toBe(2);
    expect(doc.totalCostUsd).toBe(295.5);
  });

  it('includes standard carrier terms', () => {
    const doc = generateShippingDocument('bill-of-lading', baseInput);
    expect(Array.isArray(doc.termsAndConditions)).toBe(true);
    expect(doc.termsAndConditions.length).toBeGreaterThan(0);
  });
});

describe('generateShippingDocument — customs-declaration', () => {
  it('produces CBP-7501-style entry', () => {
    const doc = generateShippingDocument('customs-declaration', baseInput);
    expect(doc.documentType).toBe('customs-declaration');
    expect(doc.declarationNumber).toMatch(/^CD-/);
    expect(doc.entryType).toBe('Formal Entry');
    expect(doc.importerOfRecord).toBe('Beta LLC');
    expect(doc.items.length).toBe(2);
  });

  it('links to commercial invoice and packing list', () => {
    const doc = generateShippingDocument('customs-declaration', baseInput);
    expect(doc.notes).toMatch(/commercial invoice/i);
  });
});

describe('renderDocumentHTML', () => {
  it('produces a valid HTML document', () => {
    const doc = generateShippingDocument('commercial-invoice', baseInput);
    const html = renderDocumentHTML('commercial-invoice', doc);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Commercial Invoice');
    expect(html).toContain('Acme Corp');
    expect(html).toContain('Beta LLC');
  });

  it('includes print-friendly CSS', () => {
    const doc = generateShippingDocument('commercial-invoice', baseInput);
    const html = renderDocumentHTML('commercial-invoice', doc);
    expect(html).toContain('<style>');
    expect(html).toContain('@media print');
  });

  it('renders each document type', () => {
    for (const type of ['commercial-invoice', 'packing-list', 'bill-of-lading', 'customs-declaration'] as const) {
      const doc = generateShippingDocument(type, baseInput);
      const html = renderDocumentHTML(type, doc);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('</html>');
    }
  });
});

describe('document generation error handling', () => {
  it('throws on unknown document type', () => {
    expect(() => {
      generateShippingDocument('unknown' as any, baseInput);
    }).toThrow(/Unknown document type/);
  });
});