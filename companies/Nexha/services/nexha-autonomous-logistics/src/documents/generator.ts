/**
 * Shipping document generators.
 *
 * Generates 4 standard shipping documents:
 *   - commercial-invoice   — required by all customs authorities
 *   - packing-list         — itemized contents
 *   - bill-of-lading       — carrier contract
 *   - customs-declaration  — entry summary (CBP Form 7501 equivalent)
 *
 * Output formats: JSON (structured) and HTML (printable).
 */

import type { BookingLegResult, ShipmentStatus } from '../types.js';

export type DocumentType = 'commercial-invoice' | 'packing-list' | 'bill-of-lading' | 'customs-declaration';

export interface ShipmentRecord {
  shipmentId: string;
  bookings: BookingLegResult[];
  createdAt: string;
  planId: string;
}

export interface DocumentInput {
  shipment: ShipmentRecord;
  seller?: { name: string; address?: string; taxId?: string };
  buyer?: { name: string; address?: string; taxId?: string };
  generatedAt: string;
}

/**
 * Generate a structured shipping document.
 */
export function generateShippingDocument(type: DocumentType, input: DocumentInput): any {
  switch (type) {
    case 'commercial-invoice':
      return generateCommercialInvoice(input);
    case 'packing-list':
      return generatePackingList(input);
    case 'bill-of-lading':
      return generateBillOfLading(input);
    case 'customs-declaration':
      return generateCustomsDeclaration(input);
    default:
      throw new Error(`Unknown document type: ${type}`);
  }
}

function generateCommercialInvoice(input: DocumentInput): any {
  const { shipment, seller, buyer, generatedAt } = input;
  const firstLeg = shipment.bookings[0];
  return {
    documentType: 'commercial-invoice',
    invoiceNumber: `INV-${shipment.shipmentId.slice(-8).toUpperCase()}`,
    issuedAt: generatedAt,
    relatedShipmentId: shipment.shipmentId,
    seller: seller || { name: 'HOJAI Logistics Seller' },
    buyer: buyer || { name: 'HOJAI Logistics Buyer' },
    carrier: firstLeg.carrierId,
    trackingNumber: firstLeg.trackingNumber,
    origin: 'Per shipment plan',
    destination: 'Per shipment plan',
    items: [{
      description: 'Cargo (per shipment)',
      quantity: shipment.bookings.length,
      unitPrice: shipment.bookings.reduce((s, b) => s + b.costUsd, 0),
      totalPrice: shipment.bookings.reduce((s, b) => s + b.costUsd, 0),
      currency: 'USD'
    }],
    subtotal: shipment.bookings.reduce((s, b) => s + b.costUsd, 0),
    total: shipment.bookings.reduce((s, b) => s + b.costUsd, 0),
    currency: 'USD',
    terms: 'Net 30',
    signature: {
      authorizedBy: seller?.name || 'HOJAI Logistics',
      signedAt: generatedAt
    }
  };
}

function generatePackingList(input: DocumentInput): any {
  const { shipment, seller, buyer, generatedAt } = input;
  const totalWeight = shipment.bookings.length * 10; // estimated; full impl reads plan
  return {
    documentType: 'packing-list',
    packingListNumber: `PL-${shipment.shipmentId.slice(-8).toUpperCase()}`,
    issuedAt: generatedAt,
    relatedShipmentId: shipment.shipmentId,
    shipper: seller?.name || 'HOJAI Logistics',
    consignee: buyer?.name || 'HOJAI Logistics',
    packages: shipment.bookings.map((b, i) => ({
      packageNumber: i + 1,
      description: 'Package contents',
      weight: `${totalWeight / shipment.bookings.length} kg`,
      dimensions: 'Per plan',
      trackingNumber: b.trackingNumber
    })),
    totalPackages: shipment.bookings.length,
    totalWeightKg: totalWeight,
    notes: 'Handle with care'
  };
}

function generateBillOfLading(input: DocumentInput): any {
  const { shipment, seller, buyer, generatedAt } = input;
  return {
    documentType: 'bill-of-lading',
    bolNumber: `BOL-${shipment.shipmentId.slice(-8).toUpperCase()}`,
    issuedAt: generatedAt,
    relatedShipmentId: shipment.shipmentId,
    shipper: seller?.name || 'HOJAI Logistics',
    consignee: buyer?.name || 'HOJAI Logistics',
    carrier: shipment.bookings[0].carrierId,
    trackingNumber: shipment.bookings[0].trackingNumber,
    legs: shipment.bookings.map((b) => ({
      carrier: b.carrierId,
      trackingNumber: b.trackingNumber,
      pickup: b.pickupTime,
      delivery: b.deliveryTime,
      costUsd: b.costUsd,
      status: b.status
    })),
    totalCostUsd: shipment.bookings.reduce((s, b) => s + b.costUsd, 0),
    termsAndConditions: [
      'Carrier assumes liability from pickup to delivery per standard BOL terms.',
      'Claims must be filed within 30 days of delivery.',
      'Subject to the Carmack Amendment (US) / CMR Convention (international road) / Montreal Convention (air).'
    ]
  };
}

function generateCustomsDeclaration(input: DocumentInput): any {
  const { shipment, seller, buyer, generatedAt } = input;
  return {
    documentType: 'customs-declaration',
    declarationNumber: `CD-${shipment.shipmentId.slice(-8).toUpperCase()}`,
    issuedAt: generatedAt,
    relatedShipmentId: shipment.shipmentId,
    // Simplified CBP Form 7501 structure
    entryType: 'Formal Entry',
    importerOfRecord: buyer?.name || 'HOJAI Logistics Buyer',
    consignee: buyer?.name || 'HOJAI Logistics Buyer',
    seller: seller?.name || 'HOJAI Logistics Seller',
    countryOfOrigin: 'Per shipment',
    portOfEntry: 'Per shipment',
    items: shipment.bookings.map((b) => ({
      lineNumber: shipment.bookings.indexOf(b) + 1,
      description: 'Cargo',
      htsCode: 'Per customs check',
      quantity: 1,
      valueUsd: b.costUsd,
      countryOfOrigin: 'Per shipment'
    })),
    totalValueUsd: shipment.bookings.reduce((s, b) => s + b.costUsd, 0),
    declarationStatement: 'I declare that the information above is true and correct.',
    signedBy: seller?.name || 'HOJAI Logistics',
    notes: 'Pair with commercial invoice + packing list for full submission'
  };
}

/**
 * Render an HTML representation of a shipping document.
 * Simple but print-friendly. Suitable for PDF export via browser print.
 */
export function renderDocumentHTML(type: DocumentType, document: any): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${type} - ${document.invoiceNumber || document.packingListNumber || document.bolNumber || document.declarationNumber}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #111; }
  h1 { border-bottom: 2px solid #111; padding-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th, td { text-align: left; padding: 8px; border-bottom: 1px solid #ddd; }
  th { background: #f5f5f5; font-weight: 600; }
  .meta { display: flex; justify-content: space-between; margin: 16px 0; }
  .meta > div { flex: 1; }
  .label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
  .value { font-size: 14px; }
  .total { font-weight: 700; font-size: 18px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  @media print { body { margin: 0; } }
</style></head><body>
${renderDocumentBodyHTML(type, document)}
</body></html>`;
}

function renderDocumentBodyHTML(type: DocumentType, doc: any): string {
  switch (type) {
    case 'commercial-invoice':
      return `
<h1>Commercial Invoice</h1>
<div class="meta">
  <div><span class="label">Invoice #</span><div class="value">${doc.invoiceNumber}</div></div>
  <div><span class="label">Issued</span><div class="value">${new Date(doc.issuedAt).toLocaleString()}</div></div>
  <div><span class="label">Shipment</span><div class="value">${doc.relatedShipmentId}</div></div>
</div>
<h2>Parties</h2>
<div class="meta">
  <div><span class="label">Seller</span><div class="value">${doc.seller.name}</div></div>
  <div><span class="label">Buyer</span><div class="value">${doc.buyer.name}</div></div>
</div>
<h2>Items</h2>
<table>
  <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
  <tbody>
    ${doc.items.map((i: any) => `<tr><td>${i.description}</td><td>${i.quantity}</td><td>$${i.unitPrice}</td><td>$${i.totalPrice}</td></tr>`).join('')}
    <tr><td colspan="3" style="text-align:right"><strong>Total</strong></td><td class="total">$${doc.total} ${doc.currency}</td></tr>
  </tbody>
</table>
<div class="footer">Generated by HOJAI nexha-autonomous-logistics on ${doc.issuedAt}</div>`;
    case 'packing-list':
      return `
<h1>Packing List</h1>
<div class="meta">
  <div><span class="label">PL #</span><div class="value">${doc.packingListNumber}</div></div>
  <div><span class="label">Shipment</span><div class="value">${doc.relatedShipmentId}</div></div>
  <div><span class="label">Total</span><div class="value">${doc.totalPackages} pkgs, ${doc.totalWeightKg} kg</div></div>
</div>
<h2>Shipper / Consignee</h2>
<div class="meta">
  <div><span class="label">Shipper</span><div class="value">${doc.shipper}</div></div>
  <div><span class="label">Consignee</span><div class="value">${doc.consignee}</div></div>
</div>
<h2>Packages</h2>
<table>
  <thead><tr><th>#</th><th>Tracking</th><th>Weight</th><th>Dimensions</th></tr></thead>
  <tbody>${doc.packages.map((p: any) => `<tr><td>${p.packageNumber}</td><td>${p.trackingNumber}</td><td>${p.weight}</td><td>${p.dimensions}</td></tr>`).join('')}</tbody>
</table>
<div class="footer">${doc.notes}</div>`;
    case 'bill-of-lading':
      return `
<h1>Bill of Lading</h1>
<div class="meta">
  <div><span class="label">BOL #</span><div class="value">${doc.bolNumber}</div></div>
  <div><span class="label">Carrier</span><div class="value">${doc.carrier}</div></div>
  <div><span class="label">Tracking</span><div class="value">${doc.trackingNumber}</div></div>
</div>
<h2>Parties</h2>
<div class="meta">
  <div><span class="label">Shipper</span><div class="value">${doc.shipper}</div></div>
  <div><span class="label">Consignee</span><div class="value">${doc.consignee}</div></div>
</div>
<h2>Legs</h2>
<table>
  <thead><tr><th>Carrier</th><th>Tracking</th><th>Pickup</th><th>Delivery</th><th>Cost</th></tr></thead>
  <tbody>${doc.legs.map((l: any) => `<tr><td>${l.carrier}</td><td>${l.trackingNumber}</td><td>${l.pickup}</td><td>${l.delivery}</td><td>$${l.costUsd}</td></tr>`).join('')}
  <tr><td colspan="4" style="text-align:right"><strong>Total</strong></td><td class="total">$${doc.totalCostUsd}</td></tr>
</tbody>
</table>
<h2>Terms</h2>
<ul>${doc.termsAndConditions.map((t: string) => `<li>${t}</li>`).join('')}</ul>
<div class="footer">Generated by HOJAI nexha-autonomous-logistics</div>`;
    case 'customs-declaration':
      return `
<h1>Customs Declaration</h1>
<div class="meta">
  <div><span class="label">Declaration #</span><div class="value">${doc.declarationNumber}</div></div>
  <div><span class="label">Type</span><div class="value">${doc.entryType}</div></div>
  <div><span class="label">Shipment</span><div class="value">${doc.relatedShipmentId}</div></div>
</div>
<h2>Parties</h2>
<div class="meta">
  <div><span class="label">Importer of Record</span><div class="value">${doc.importerOfRecord}</div></div>
  <div><span class="label">Consignee</span><div class="value">${doc.consignee}</div></div>
  <div><span class="label">Seller</span><div class="value">${doc.seller}</div></div>
</div>
<h2>Items</h2>
<table>
  <thead><tr><th>#</th><th>Description</th><th>HTS</th><th>Qty</th><th>Value USD</th></tr></thead>
  <tbody>${doc.items.map((i: any) => `<tr><td>${i.lineNumber}</td><td>${i.description}</td><td>${i.htsCode}</td><td>${i.quantity}</td><td>$${i.valueUsd}</td></tr>`).join('')}
  <tr><td colspan="4" style="text-align:right"><strong>Total Value</strong></td><td class="total">$${doc.totalValueUsd}</td></tr>
</tbody>
</table>
<p><em>${doc.declarationStatement}</em></p>
<div class="footer">Signed by ${doc.signedBy} on ${doc.issuedAt}<br>${doc.notes}</div>`;
    default:
      return `<pre>${JSON.stringify(doc, null, 2)}</pre>`;
  }
}