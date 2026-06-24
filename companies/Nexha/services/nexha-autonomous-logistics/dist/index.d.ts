/**
 * nexha-autonomous-logistics — HTTP API
 *
 * Port: 4293
 * Endpoints (per spec §C):
 *   POST /api/v1/shipments/plan      - Generate shipment plan
 *   POST /api/v1/shipments/book      - Book a planned shipment
 *   GET  /api/v1/shipments/:id/track - Track shipment
 *   POST /api/v1/shipments/:id/reroute - Reroute
 *   POST /api/v1/shipments/:id/cancel  - Cancel
 *   GET  /api/v1/carriers              - List 12 built-in carriers
 *   POST /api/v1/customs/check         - Check customs requirements
 *   POST /api/v1/insurance/bind        - Bind cargo insurance
 *   GET  /api/v1/routes                - Multi-modal routing options
 *   POST /api/v1/carbon/calculate      - Calculate carbon footprint
 *   GET  /health, /ready
 */
declare const app: import("express-serve-static-core").Express;
export default app;
