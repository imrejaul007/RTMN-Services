"use strict";
/**
 * Composition Engine Types
 *
 * Core types for company composition in CompanyOS.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCompanyId = createCompanyId;
exports.createTwinId = createTwinId;
exports.createWorkerId = createWorkerId;
const uuid_1 = require("uuid");
// ============================================
// Factory Functions
// ============================================
function createCompanyId(prefix = 'company') {
    return `${prefix}_${(0, uuid_1.v4)().slice(0, 8)}`;
}
function createTwinId(companyId, type) {
    return `twin_${type}_${companyId}`;
}
function createWorkerId(department, workerType) {
    return `worker_${workerType}_${department}`;
}
//# sourceMappingURL=types.js.map