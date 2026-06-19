/**
 * RTMN Industry AI Company Platform Template
 * 
 * This is the base template for all Industry OS services.
 * Each industry gets 15 layers of RTMN ecosystem integration.
 */

const express = require('express');
const app = express();

// Configuration
const LAYER_CONFIG = {
  industry: process.env.INDUSTRY || 'restaurant',
  layers: process.env.LAYERS ? process.env.LAYERS.split(',') : 'all',
};

// Service URLs for Layer Integration
const SERVICES = {
  // Layer 1: Intelligence
  genie: process.env.GENIE_URL || 'http://localhost:4701',
  copilot: process.env.COPILOT_URL || 'http://localhost:4600',
  agentMarketplace: process.env.AGENT_URL || 'http://localhost:4580',
  
  // Layer 2: Customer Growth
  crmHub: process.env.CRM_HUB_URL || 'http://localhost:4056',
  
  // Layer 3: Commerce
  nexha: process.env.NEXHA_URL || 'http://localhost:5002',
  procurement: process.env.PROCUREMENT_URL || 'http://localhost:4320',
  
  // Layer 4: Financial
  wallet: process.env.WALLET_URL || 'http://localhost:4004',
  auth: process.env.AUTH_URL || 'http://localhost:4002',
  
  // Layer 10: Identity
  corpid: process.env.CORPID_URL || 'http://localhost:4702',
  
  // Layer 11: Memory
  memory: process.env.MEMORY_URL || 'http://localhost:4703',
  
  // Layer 12: Twins
  twinos: process.env.TWINOS_URL || 'http://localhost:4705',
  
  // Layer 14: Autonomous
  sutar: process.env.SUTAR_URL || 'http://localhost:4140',
  goalOS: process.env.GOAL_URL || 'http://localhost:4242',
  decision: process.env.DECISION_URL || 'http://localhost:4240',
};

// Auth + DB code...
// Layer endpoints...
// Industry-specific code...

module.exports = { app, LAYER_CONFIG, SERVICES };
