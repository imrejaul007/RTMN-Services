/**
 * FlowOS SDK - Main Entry Point
 * npm install @hojai/flow-sdk
 */

import axios from 'axios';
import { FlowOSClient, WorkflowClient, ExecutionClient, ConnectorClient, TwinClient, SimulationClient, CheckpointClient, FlowOSError } from './client.js';
import { WorkflowBuilder, Templates } from './builder.js';

export {
  // Client
  FlowOSClient,
  FlowOSError,

  // Sub-clients
  WorkflowClient,
  ExecutionClient,
  ConnectorClient,
  TwinClient,
  SimulationClient,
  CheckpointClient,

  // Builder
  WorkflowBuilder,
  Templates,
};

// Quick usage examples:
// import { FlowOSClient, WorkflowBuilder } from '@hojai/flow-sdk';
//
// const client = new FlowOSClient({ baseUrl: 'http://localhost:4399' });
//
// // Create workflow programmatically
// const workflow = new WorkflowBuilder('My Workflow')
//   .trigger('start', { type: 'manual' })
//   .task('step1', { action: 'hello' })
//   .build();
//
// const created = await client.workflows.create(workflow);
// const execution = await client.workflows.execute(created.id, { userId: '123' });

export default { FlowOSClient, WorkflowBuilder, Templates };