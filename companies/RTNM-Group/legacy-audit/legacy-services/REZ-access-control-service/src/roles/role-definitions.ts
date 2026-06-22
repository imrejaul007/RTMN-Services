import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  permissions: RolePermission[];
  attributes: RoleAttributes;
  constraints: RoleConstraint[];
  createdAt: Date;
  updatedAt: Date;
  deprecated?: boolean;
  deprecationMessage?: string;
}

export interface RolePermission {
  resource: string;
  actions: string[];
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';
  value: any;
}

export interface RoleAttributes {
  level: number;
  category: 'system' | 'business' | 'custom';
  tags: string[];
  color?: string;
  icon?: string;
}

export interface RoleConstraint {
  type: 'time' | 'location' | 'device' | 'custom';
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';
  value: any;
  message?: string;
}

export interface RoleTemplate {
  id: string;
  name: string;
  description: string;
  baseRoleId: string;
  modifications: Partial<RoleDefinition>;
}

export class RoleDefinitions {
  private roles: Map<string, RoleDefinition> = new Map();
  private templates: Map<string, RoleTemplate> = new Map();

  constructor() {
    this.initializeDefaultRoles();
  }

  private initializeDefaultRoles(): void {
    // System Roles
    const systemRoles: RoleDefinition[] = [
      {
        id: 'superadmin',
        name: 'Super Administrator',
        description: 'Unlimited access to all system resources',
        permissions: [
          { resource: '*', actions: ['*'] }
        ],
        attributes: {
          level: 100,
          category: 'system',
          tags: ['admin', 'full-access', 'system-critical'],
          color: '#FF0000',
          icon: 'shield'
        },
        constraints: [],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'admin',
        name: 'Administrator',
        description: 'Administrative access to manage users and settings',
        permissions: [
          { resource: 'users', actions: ['read', 'write', 'update', 'delete'] },
          { resource: 'roles', actions: ['read', 'write', 'update'] },
          { resource: 'settings', actions: ['read', 'write', 'update'] },
          { resource: 'audit', actions: ['read'] },
          { resource: 'documents', actions: ['*'] },
          { resource: 'media', actions: ['*'] }
        ],
        attributes: {
          level: 90,
          category: 'system',
          tags: ['admin', 'user-management'],
          color: '#FF6B00',
          icon: 'admin'
        },
        constraints: [],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'moderator',
        name: 'Moderator',
        description: 'Content moderation and user support',
        permissions: [
          { resource: 'users', actions: ['read', 'update'] },
          { resource: 'documents', actions: ['read', 'write', 'update', 'delete'] },
          { resource: 'comments', actions: ['read', 'update', 'delete'] },
          { resource: 'reports', actions: ['read', 'update'] }
        ],
        attributes: {
          level: 70,
          category: 'system',
          tags: ['moderation', 'content-management'],
          color: '#9B59B6',
          icon: 'mod'
        },
        constraints: [
          {
            type: 'time',
            field: 'environment.workHoursOnly',
            operator: 'eq',
            value: true,
            message: 'Moderator actions should be performed during work hours'
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'editor',
        name: 'Content Editor',
        description: 'Create and edit content',
        permissions: [
          { resource: 'documents', actions: ['read', 'write', 'update'] },
          { resource: 'media', actions: ['read', 'write', 'update'] },
          { resource: 'comments', actions: ['read', 'write'] }
        ],
        attributes: {
          level: 50,
          category: 'business',
          tags: ['content', 'editing'],
          color: '#3498DB',
          icon: 'edit'
        },
        constraints: [],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'viewer',
        name: 'Viewer',
        description: 'Read-only access to content',
        permissions: [
          { resource: 'documents', actions: ['read'] },
          { resource: 'media', actions: ['read'] },
          { resource: 'comments', actions: ['read'] }
        ],
        attributes: {
          level: 10,
          category: 'business',
          tags: ['read-only', 'basic'],
          color: '#95A5A6',
          icon: 'view'
        },
        constraints: [],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'guest',
        name: 'Guest',
        description: 'Minimal access for unauthenticated users',
        permissions: [
          { resource: 'public', actions: ['read'] }
        ],
        attributes: {
          level: 1,
          category: 'system',
          tags: ['guest', 'public'],
          color: '#BDC3C7',
          icon: 'user'
        },
        constraints: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const role of systemRoles) {
      this.roles.set(role.id, role);
    }

    // Initialize templates
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    const templates: RoleTemplate[] = [
      {
        id: 'template-content-manager',
        name: 'Content Manager Template',
        description: 'Template for content management roles',
        baseRoleId: 'editor',
        modifications: {
          description: 'Extended content management capabilities',
          attributes: {
            level: 60,
            category: 'business',
            tags: ['content', 'editing', 'publishing']
          }
        }
      },
      {
        id: 'template-support-agent',
        name: 'Support Agent Template',
        description: 'Template for customer support roles',
        baseRoleId: 'viewer',
        modifications: {
          permissions: [
            { resource: 'tickets', actions: ['read', 'write', 'update'] },
            { resource: 'users', actions: ['read', 'update'] }
          ],
          attributes: {
            level: 40,
            category: 'business',
            tags: ['support', 'customer-service']
          }
        }
      }
    ];

    for (const template of templates) {
      this.templates.set(template.id, template);
    }
  }

  createRole(definition: Omit<RoleDefinition, 'id' | 'createdAt' | 'updatedAt'>): RoleDefinition {
    const role: RoleDefinition = {
      ...definition,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.roles.set(role.id, role);
    logger.info(`Role created: ${role.name} (${role.id})`);
    return role;
  }

  updateRole(roleId: string, updates: Partial<RoleDefinition>): RoleDefinition | null {
    const role = this.roles.get(roleId);
    if (!role) return null;

    const updatedRole: RoleDefinition = {
      ...role,
      ...updates,
      id: roleId,
      updatedAt: new Date()
    };

    this.roles.set(roleId, updatedRole);
    logger.info(`Role updated: ${roleId}`);
    return updatedRole;
  }

  deleteRole(roleId: string): boolean {
    // Prevent deletion of system roles
    const role = this.roles.get(roleId);
    if (!role) return false;

    if (role.attributes.category === 'system') {
      throw new Error('Cannot delete system roles');
    }

    const deleted = this.roles.delete(roleId);
    if (deleted) {
      logger.info(`Role deleted: ${roleId}`);
    }
    return deleted;
  }

  deprecateRole(roleId: string, message: string): boolean {
    const role = this.roles.get(roleId);
    if (!role) return false;

    role.deprecated = true;
    role.deprecationMessage = message;
    role.updatedAt = new Date();

    logger.warn(`Role deprecated: ${roleId} - ${message}`);
    return true;
  }

  getRole(roleId: string): RoleDefinition | undefined {
    return this.roles.get(roleId);
  }

  getAllRoles(includeDeprecated: boolean = false): RoleDefinition[] {
    const roles = Array.from(this.roles.values());
    if (includeDeprecated) {
      return roles;
    }
    return roles.filter(r => !r.deprecated);
  }

  getRolesByCategory(category: string): RoleDefinition[] {
    return Array.from(this.roles.values())
      .filter(r => r.attributes.category === category && !r.deprecated);
  }

  getRolesByLevel(minLevel: number, maxLevel?: number): RoleDefinition[] {
    return Array.from(this.roles.values())
      .filter(r => {
        const level = r.attributes.level;
        if (maxLevel !== undefined) {
          return level >= minLevel && level <= maxLevel;
        }
        return level >= minLevel;
      });
  }

  getRolesByTag(tag: string): RoleDefinition[] {
    return Array.from(this.roles.values())
      .filter(r => r.attributes.tags.includes(tag));
  }

  createFromTemplate(templateId: string, name: string, modifications?: Partial<RoleDefinition>): RoleDefinition | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    const baseRole = this.roles.get(template.baseRoleId);
    if (!baseRole) return null;

    const newRole: RoleDefinition = {
      ...baseRole,
      ...template.modifications,
      ...modifications,
      id: uuidv4(),
      name,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.roles.set(newRole.id, newRole);
    logger.info(`Role created from template: ${name} (${newRole.id})`);
    return newRole;
  }

  createTemplate(template: Omit<RoleTemplate, 'id'>): RoleTemplate {
    const newTemplate: RoleTemplate = {
      ...template,
      id: uuidv4()
    };

    this.templates.set(newTemplate.id, newTemplate);
    logger.info(`Template created: ${newTemplate.name} (${newTemplate.id})`);
    return newTemplate;
  }

  getTemplate(templateId: string): RoleTemplate | undefined {
    return this.templates.get(templateId);
  }

  getAllTemplates(): RoleTemplate[] {
    return Array.from(this.templates.values());
  }

  searchRoles(query: string): RoleDefinition[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.roles.values())
      .filter(r =>
        r.name.toLowerCase().includes(lowerQuery) ||
        r.description.toLowerCase().includes(lowerQuery) ||
        r.attributes.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
  }

  compareRoles(roleId1: string, roleId2: string): {
    role1Only: RolePermission[];
    role2Only: RolePermission[];
    common: RolePermission[];
  } | null {
    const role1 = this.roles.get(roleId1);
    const role2 = this.roles.get(roleId2);

    if (!role1 || !role2) return null;

    const permissions1 = new Map(role1.permissions.map(p => [`${p.resource}:${p.actions.join(',')}`, p]));
    const permissions2 = new Map(role2.permissions.map(p => [`${p.resource}:${p.actions.join(',')}`, p]));

    const common: RolePermission[] = [];
    const role1Only: RolePermission[] = [];
    const role2Only: RolePermission[] = [];

    for (const [key, perm] of permissions1) {
      if (permissions2.has(key)) {
        common.push(perm);
      } else {
        role1Only.push(perm);
      }
    }

    for (const [key, perm] of permissions2) {
      if (!permissions1.has(key)) {
        role2Only.push(perm);
      }
    }

    return { role1Only, role2Only, common };
  }
}
