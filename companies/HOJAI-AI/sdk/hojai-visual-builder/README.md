# @hojai/visual-builder-sdk

> Visual Workflow Builder SDK

## Install

```bash
npm install @hojai/visual-builder-sdk
```

## Quick Start

```typescript
import { VisualBuilderSDK } from '@hojai/visual-builder-sdk';

const sdk = new VisualBuilderSDK('http://localhost:4600');

// List templates
const { templates } = await sdk.listTemplates('sales');

// Create workflow from template
const workflow = await sdk.createWorkflow({
  templateId: 'sales-lead-qualification',
  name: 'My Lead Pipeline'
});

// Add a node
await sdk.addNode(workflow.id, {
  type: 'ai_agent',
  position: { x: 500, y: 200 },
  config: { agent: 'sdr_agent', task: 'qualify' }
});

// Add connection
await sdk.addConnection(workflow.id, {
  from: 'trigger-1',
  to: 'node-new'
});

// Export as template
const template = await sdk.exportWorkflow(workflow.id, { category: 'sales' });
```

## Node Types

| Type | Icon | Purpose |
|------|------|---------|
| trigger | ⚡ | Starts workflow |
| memory | 🧠 | Load/save memory |
| twin | 👥 | Digital twin ops |
| ai_agent | 🤖 | AI worker |
| intelligence | 📊 | Analytics/scoring |
| sutar | 🤝 | Commerce/negotiation |
| condition | 🔀 | Branch logic |
| action | ⚙️ | Perform action |
| human | 👤 | Human approval |
| integration | 🔌 | External services |
| notification | 📧 | Send notification |
| crm | 📋 | CRM operations |

## API Reference

### Node Types

```typescript
sdk.getNodeTypes()  // Get all node types
```

### Templates

```typescript
sdk.listTemplates(category?)     // List templates
sdk.getTemplate(id)              // Get template
```

### Workflows

```typescript
sdk.createWorkflow(params)       // Create from template
sdk.listWorkflows(projectId?)    // List workflows
sdk.getWorkflow(id)             // Get workflow
sdk.updateWorkflow(id, data)     // Update workflow
sdk.deleteWorkflow(id)          // Delete workflow
```

### Nodes

```typescript
sdk.addNode(workflowId, node)        // Add node
sdk.updateNode(workflowId, nodeId, updates)  // Update node
sdk.deleteNode(workflowId, nodeId)   // Delete node
```

### Connections

```typescript
sdk.addConnection(workflowId, connection)    // Add connection
sdk.deleteConnection(workflowId, connId)   // Delete connection
```

### Undo/Redo

```typescript
sdk.undo(workflowId)    // Undo last action
sdk.redo(workflowId)    // Redo
sdk.history(workflowId)   // Get history status
```

### Export/Import

```typescript
sdk.exportWorkflow(id, options)     // Export as template
sdk.importTemplate(template, name)  // Import template
```

### Validation

```typescript
sdk.validateWorkflow(workflow)  // Validate workflow structure
sdk.serialize(workflow)        // Serialize to JSON
sdk.deserialize(json)           // Deserialize from JSON
```

## Example: Build a Lead Qualification Workflow

```typescript
const sdk = new VisualBuilderSDK();

// 1. Create workflow
const workflow = await sdk.createWorkflow({
  name: 'Lead Qualification'
});

// 2. Add trigger
const trigger = await sdk.addNode(workflow.id, {
  type: 'trigger',
  config: { type: 'webhook', event: 'lead.created' }
});

// 3. Add AI agent
const agent = await sdk.addNode(workflow.id, {
  type: 'ai_agent',
  config: { agent: 'sdr_agent' }
});

// 4. Add condition
const condition = await sdk.addNode(workflow.id, {
  type: 'condition',
  config: { field: 'score', operator: '>=', value: 70 }
});

// 5. Connect nodes
await sdk.addConnection(workflow.id, { from: trigger.id, to: agent.id });
await sdk.addConnection(workflow.id, { from: agent.id, to: condition.id });

// 6. Export
const template = await sdk.exportWorkflow(workflow.id);
```

---

See [service README](../foundry/services/visual-builder/README.md) for full documentation.
