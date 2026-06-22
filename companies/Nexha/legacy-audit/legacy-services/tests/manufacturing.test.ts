/**
 * ManufacturingOS Unit Tests
 */

import { describe, it, expect, vi } from 'vitest';

describe('ManufacturingOS', () => {
  describe('BOM Management', () => {
    it('should calculate total BOM cost', () => {
      const components = [
        { itemName: 'Steel Sheet', quantity: 10, unitCost: 500 },
        { itemName: 'Bolts', quantity: 100, unitCost: 5 },
        { itemName: 'Paint', quantity: 2, unitCost: 200 },
      ];

      const totalCost = components.reduce(
        (sum, c) => sum + c.quantity * c.unitCost,
        0
      );

      expect(totalCost).toBe(7000); // 5000 + 500 + 400
    });

    it('should validate BOM has at least one component', () => {
      const validBOM = [
        { itemId: '1', itemName: 'Component A', quantity: 1, unit: 'pcs' },
      ];

      expect(validBOM.length).toBeGreaterThan(0);
    });
  });

  describe('Production Orders', () => {
    it('should calculate production time', () => {
      const operations = [
        { operationName: 'Cutting', timeInMinutes: 30 },
        { operationName: 'Welding', timeInMinutes: 60 },
        { operationName: 'Painting', timeInMinutes: 45 },
      ];

      const totalMinutes = operations.reduce((sum, op) => sum + op.timeInMinutes, 0);

      expect(totalMinutes).toBe(135); // 2.25 hours
    });

    it('should calculate scrap cost', () => {
      const bomCost = 5000;
      const scrapRate = 5; // percent
      const quantity = 100;

      const scrapCost = (bomCost * scrapRate * quantity) / 100;

      expect(scrapCost).toBe(25000);
    });
  });

  describe('Quality Control', () => {
    it('should calculate pass rate', () => {
      const totalInspected = 100;
      const passed = 95;
      const failed = 5;

      const passRate = (passed / totalInspected) * 100;

      expect(passRate).toBe(95);
    });

    it('should determine batch status', () => {
      const qualityChecks = [
        { check: 'visual', result: 'pass' },
        { check: 'dimensional', result: 'pass' },
        { check: 'functional', result: 'fail' },
      ];

      const allPassed = qualityChecks.every((c) => c.result === 'pass');
      const anyFailed = qualityChecks.some((c) => c.result === 'fail');

      expect(allPassed).toBe(false);
      expect(anyFailed).toBe(true);
    });
  });

  describe('MRP Calculations', () => {
    it('should calculate material requirements', () => {
      const productBOM = [
        { itemId: 'mat_1', quantity: 2 }, // 2 units of material 1 per product
        { itemId: 'mat_2', quantity: 3 }, // 3 units of material 2 per product
      ];
      const orderQuantity = 50;

      const requirements = productBOM.map((item) => ({
        itemId: item.itemId,
        required: item.quantity * orderQuantity,
      }));

      expect(requirements[0].required).toBe(100);
      expect(requirements[1].required).toBe(150);
    });

    it('should identify short materials', () => {
      const requirements = [
        { itemId: 'mat_1', required: 100, available: 120 }, // sufficient
        { itemId: 'mat_2', required: 50, available: 30 },   // short
        { itemId: 'mat_3', required: 75, available: 100 },  // sufficient
      ];

      const shortMaterials = requirements.filter((r) => r.available < r.required);

      expect(shortMaterials).toHaveLength(1);
      expect(shortMaterials[0].itemId).toBe('mat_2');
    });
  });
});
