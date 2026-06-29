/**
 * HOJAI Agent Factory
 */

import { Agent, AgentDefinition, SDRAgent, SupportAgent } from './agent';
import { Skill, SkillDefinition, LeadQualificationSkill, EmailOutreachSkill } from './skill';
import { Department, DepartmentDefinition, SalesDepartment, SupportDepartment } from './department';

// Agent factory
export function createAgent(definition: AgentDefinition): Agent {
  const agents: Record<string, new (id?: string) => Agent> = {
    'sdr': SDRAgent,
    'support': SupportAgent,
  };

  const AgentClass = agents[definition.role];
  if (AgentClass) {
    return new AgentClass(definition.id);
  }

  return new Agent(definition);
}

// Skill factory
export function createSkill(definition: SkillDefinition): Skill {
  const skills: Record<string, () => Skill> = {
    'lead-qualification': () => new LeadQualificationSkill(),
    'email-outreach': () => new EmailOutreachSkill(),
  };

  const SkillClass = skills[definition.id];
  if (SkillClass) {
    return SkillClass();
  }

  return new Skill(definition);
}

// Department factory
export function createDepartment(definition: DepartmentDefinition): Department {
  const departments: Record<string, () => Department> = {
    'sales': () => new SalesDepartment(),
    'support': () => new SupportDepartment(),
  };

  const DepartmentClass = departments[definition.type];
  if (DepartmentClass) {
    return DepartmentClass();
  }

  return new Department(definition);
}

// Pre-built agents for quick use
export { SDRAgent, SupportAgent };
export { LeadQualificationSkill, EmailOutreachSkill };
export { SalesDepartment, SupportDepartment };
