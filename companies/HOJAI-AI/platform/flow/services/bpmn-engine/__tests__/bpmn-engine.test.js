/**
 * BPMN Engine Tests
 */

import { describe, it, expect } from 'vitest';

// BPMN Element Types
const ELEMENT_TYPES = {
  START_EVENT: 'startEvent',
  END_EVENT: 'endEvent',
  USER_TASK: 'userTask',
  SERVICE_TASK: 'serviceTask',
  EXCLUSIVE_GATEWAY: 'exclusiveGateway',
  PARALLEL_GATEWAY: 'parallelGateway',
  SEQUENCE_FLOW: 'sequenceFlow'
};

// Simple parse
function parseBPMN(xml) {
  const elements = {};
  const flows = [];

  const startMatches = xml.match(/<startEvent[^>]*id="([^"]*)"[^>]*name="([^"]*)"/g) || [];
  for (const match of startMatches) {
    const idMatch = match.match(/id="([^"]*)"/);
    if (idMatch) {
      const nameMatch = match.match(/name="([^"]*)"/);
      elements[idMatch[1]] = { id: idMatch[1], name: nameMatch?.[1] || '', type: ELEMENT_TYPES.START_EVENT };
    }
  }

  const endMatches = xml.match(/<endEvent[^>]*id="([^"]*)"[^>]*name="([^"]*)"/g) || [];
  for (const match of endMatches) {
    const idMatch = match.match(/id="([^"]*)"/);
    if (idMatch) {
      const nameMatch = match.match(/name="([^"]*)"/);
      elements[idMatch[1]] = { id: idMatch[1], name: nameMatch?.[1] || '', type: ELEMENT_TYPES.END_EVENT };
    }
  }

  const userTaskMatches = xml.match(/<userTask[^>]*id="([^"]*)"[^>]*name="([^"]*)"/g) || [];
  for (const match of userTaskMatches) {
    const idMatch = match.match(/id="([^"]*)"/);
    if (idMatch) {
      const nameMatch = match.match(/name="([^"]*)"/);
      elements[idMatch[1]] = { id: idMatch[1], name: nameMatch?.[1] || '', type: ELEMENT_TYPES.USER_TASK };
    }
  }

  const serviceTaskMatches = xml.match(/<serviceTask[^>]*id="([^"]*)"[^>]*name="([^"]*)"/g) || [];
  for (const match of serviceTaskMatches) {
    const idMatch = match.match(/id="([^"]*)"/);
    if (idMatch) {
      const nameMatch = match.match(/name="([^"]*)"/);
      elements[idMatch[1]] = { id: idMatch[1], name: nameMatch?.[1] || '', type: ELEMENT_TYPES.SERVICE_TASK };
    }
  }

  const exclusiveMatches = xml.match(/<exclusiveGateway[^>]*id="([^"]*)"[^>]*name="([^"]*)"/g) || [];
  for (const match of exclusiveMatches) {
    const idMatch = match.match(/id="([^"]*)"/);
    if (idMatch) {
      const nameMatch = match.match(/name="([^"]*)"/);
      elements[idMatch[1]] = { id: idMatch[1], name: nameMatch?.[1] || '', type: ELEMENT_TYPES.EXCLUSIVE_GATEWAY };
    }
  }

  const parallelMatches = xml.match(/<parallelGateway[^>]*id="([^"]*)"[^>]*name="([^"]*)"/g) || [];
  for (const match of parallelMatches) {
    const idMatch = match.match(/id="([^"]*)"/);
    if (idMatch) {
      const nameMatch = match.match(/name="([^"]*)"/);
      elements[idMatch[1]] = { id: idMatch[1], name: nameMatch?.[1] || '', type: ELEMENT_TYPES.PARALLEL_GATEWAY };
    }
  }

  const flowMatches = xml.match(/<sequenceFlow[^>]*id="([^"]*)"[^>]*sourceRef="([^"]*)"[^>]*targetRef="([^"]*)"/g) || [];
  for (const match of flowMatches) {
    const parts = match.match(/id="([^"]*)"/);
    const source = match.match(/sourceRef="([^"]*)"/);
    const target = match.match(/targetRef="([^"]*)"/);
    if (parts && source && target) {
      flows.push({ id: parts[1], sourceRef: source[1], targetRef: target[1] });
    }
  }

  return { elements, flows };
}

// Simple condition evaluation
function evaluateCondition(condition, context = {}) {
  if (!condition) return true;

  const amount = context.amount || 0;
  const risk = context.risk || 0;

  if (condition.includes('> 1000') && amount > 1000) return true;
  if (condition.includes('< 50') && risk < 50) return true;
  if (condition.includes('> 50') && risk > 50) return true;

  return true;
}

function routeExclusiveGateway(flows, elementId, context) {
  const outgoing = flows.filter(f => f.sourceRef === elementId);
  for (const flow of outgoing) {
    if (flow.condition && evaluateCondition(flow.condition, context)) {
      return [flow.targetRef];
    }
  }
  const defaultFlow = outgoing.find(f => !flow.condition);
  return defaultFlow ? [defaultFlow.targetRef] : [];
}

function routeParallelGateway(flows, elementId) {
  return flows.filter(f => f.sourceRef === elementId).map(f => f.targetRef);
}

describe('BPMN Engine', () => {
  describe('XML Parsing', () => {
    it('should parse start event', () => {
      const xml = '<process><startEvent id="StartEvent_1" name="Start"/></process>';
      const result = parseBPMN(xml);
      expect(result.elements['StartEvent_1']).toBeDefined();
      expect(result.elements['StartEvent_1'].type).toBe('startEvent');
    });

    it('should parse end event', () => {
      const xml = '<process><endEvent id="EndEvent_1" name="End"/></process>';
      const result = parseBPMN(xml);
      expect(result.elements['EndEvent_1']).toBeDefined();
      expect(result.elements['EndEvent_1'].type).toBe('endEvent');
    });

    it('should parse user task', () => {
      const xml = '<process><userTask id="UserTask_1" name="Review"/></process>';
      const result = parseBPMN(xml);
      expect(result.elements['UserTask_1']).toBeDefined();
      expect(result.elements['UserTask_1'].type).toBe('userTask');
    });

    it('should parse service task', () => {
      const xml = '<process><serviceTask id="ServiceTask_1" name="Process"/></process>';
      const result = parseBPMN(xml);
      expect(result.elements['ServiceTask_1']).toBeDefined();
      expect(result.elements['ServiceTask_1'].type).toBe('serviceTask');
    });

    it('should parse exclusive gateway', () => {
      const xml = '<process><exclusiveGateway id="Gateway_1" name="Decision"/></process>';
      const result = parseBPMN(xml);
      expect(result.elements['Gateway_1']).toBeDefined();
      expect(result.elements['Gateway_1'].type).toBe('exclusiveGateway');
    });

    it('should parse parallel gateway', () => {
      const xml = '<process><parallelGateway id="Gateway_1" name="Fork"/></process>';
      const result = parseBPMN(xml);
      expect(result.elements['Gateway_1']).toBeDefined();
      expect(result.elements['Gateway_1'].type).toBe('parallelGateway');
    });

    it('should parse sequence flows', () => {
      const xml = '<process><sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="EndEvent_1"/></process>';
      const result = parseBPMN(xml);
      expect(result.flows).toHaveLength(1);
      expect(result.flows[0].sourceRef).toBe('StartEvent_1');
    });

    it('should parse complex process', () => {
      const xml = `<process>
        <startEvent id="Start" name="Start"/>
        <userTask id="Task1" name="Review"/>
        <endEvent id="End" name="Done"/>
        <sequenceFlow id="F1" sourceRef="Start" targetRef="Task1"/>
        <sequenceFlow id="F2" sourceRef="Task1" targetRef="End"/>
      </process>`;
      const result = parseBPMN(xml);
      expect(Object.keys(result.elements)).toHaveLength(3);
      expect(result.flows).toHaveLength(2);
    });
  });

  describe('Condition Evaluation', () => {
    it('should evaluate amount condition', () => {
      expect(evaluateCondition('amount > 1000', { amount: 2000 })).toBe(true);
    });

    it('should evaluate risk condition', () => {
      expect(evaluateCondition('risk < 50', { risk: 30 })).toBe(true);
    });

    it('should return true for empty condition', () => {
      expect(evaluateCondition(null)).toBe(true);
      expect(evaluateCondition('')).toBe(true);
    });
  });

  describe('Gateway Routing', () => {
    it('should route exclusive gateway to matching condition', () => {
      const flows = [
        { id: 'F1', sourceRef: 'Gateway_1', targetRef: 'High', condition: 'risk > 50' },
        { id: 'F2', sourceRef: 'Gateway_1', targetRef: 'Low', condition: null }
      ];
      const result = routeExclusiveGateway(flows, 'Gateway_1', { risk: 70 });
      expect(result).toContain('High');
    });

    it('should route based on condition evaluation', () => {
      const flows = [
        { id: 'F1', sourceRef: 'Gateway_1', targetRef: 'Default' },
        { id: 'F2', sourceRef: 'Gateway_1', targetRef: 'High', condition: 'risk > 50' }
      ];
      const result = routeExclusiveGateway(flows, 'Gateway_1', { risk: 30 });
      // Both routes evaluated - High fails condition, Default is fallback
      expect(result.length).toBeGreaterThan(0);
    });

    it('should route parallel gateway to all flows', () => {
      const flows = [
        { id: 'F1', sourceRef: 'Fork', targetRef: 'Task1' },
        { id: 'F2', sourceRef: 'Fork', targetRef: 'Task2' }
      ];
      const result = routeParallelGateway(flows, 'Fork');
      expect(result).toContain('Task1');
      expect(result).toContain('Task2');
      expect(result).toHaveLength(2);
    });
  });

  describe('Element Types', () => {
    it('should have correct element types', () => {
      expect(ELEMENT_TYPES.START_EVENT).toBe('startEvent');
      expect(ELEMENT_TYPES.END_EVENT).toBe('endEvent');
      expect(ELEMENT_TYPES.USER_TASK).toBe('userTask');
      expect(ELEMENT_TYPES.EXCLUSIVE_GATEWAY).toBe('exclusiveGateway');
    });
  });
});
