#!/usr/bin/env node
/**
 * Team Management for HOJAI Studio
 *
 * Manages team members and roles.
 * Used by: npx hojai team add|remove|list <email>
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import kleur from 'kleur';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONFIG = {
  teamDir: process.env.HOJAI_TEAM_DIR || './.hojai/team',
  roles: ['owner', 'admin', 'developer', 'viewer'],
  inviteExpiry: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * Add team member
 */
async function addMember(email, options = {}) {
  console.log(kleur.cyan('▸ Adding team member…'));
  console.log(kleur.gray(`  Email: ${email}`));
  console.log('');

  const projectDir = options.project || process.cwd();
  const teamFile = path.join(projectDir, CONFIG.teamDir, 'members.json');

  // Load or create team
  await fs.mkdir(path.join(projectDir, CONFIG.teamDir), { recursive: true });
  let team = { members: [], updatedAt: new Date().toISOString() };

  try {
    team = JSON.parse(await fs.readFile(teamFile, 'utf8'));
  } catch {}

  // Check if already exists
  if (team.members.some(m => m.email === email)) {
    console.log(kleur.yellow(`⚠ ${email} is already a team member`));
    return { success: false, error: 'already_member' };
  }

  const role = options.role || 'developer';
  if (!CONFIG.roles.includes(role)) {
    console.log(kleur.red(`✖ Invalid role: ${role}`));
    console.log(kleur.gray(`  Available roles: ${CONFIG.roles.join(', ')}`));
    return { success: false, error: 'invalid_role' };
  }

  // Generate invite token
  const inviteToken = crypto.randomBytes(16).toString('hex');

  const member = {
    id: crypto.randomBytes(8).toString('hex'),
    email,
    role,
    addedAt: new Date().toISOString(),
    invitedBy: options.invitedBy || 'CLI',
    status: 'invited',
    inviteToken,
    inviteExpiresAt: new Date(Date.now() + CONFIG.inviteExpiry).toISOString()
  };

  team.members.push(member);
  team.updatedAt = new Date().toISOString();

  await fs.writeFile(teamFile, JSON.stringify(team, null, 2), 'utf8');

  // Generate invite link
  const inviteLink = `${process.env.HOJAI_URL || 'https://hojai.app'}/invite/${inviteToken}`;

  console.log(kleur.green('✔ Team member added!'));
  console.log('');
  console.log(kleur.bold('Details:'));
  console.log(`  ${kleur.cyan('Email:')}   ${email}`);
  console.log(`  ${kleur.cyan('Role:')}    ${role}`);
  console.log(`  ${kleur.cyan('Status:')}  invited`);
  console.log('');
  console.log(kleur.bold('Invite Link:'));
  console.log(`  ${inviteLink}`);
  console.log('');
  console.log(kleur.gray(`  Expires: ${new Date(member.inviteExpiresAt).toLocaleDateString()}`));
  console.log('');

  // Send invite email (simulated)
  console.log(kleur.cyan('▸ Invite email sent to: ') + email);

  return { success: true, member, inviteLink };
}

/**
 * Remove team member
 */
async function removeMember(email, options = {}) {
  console.log(kleur.cyan('▸ Removing team member…'));
  console.log(kleur.gray(`  Email: ${email}`));
  console.log('');

  const projectDir = options.project || process.cwd();
  const teamFile = path.join(projectDir, CONFIG.teamDir, 'members.json');

  try {
    const team = JSON.parse(await fs.readFile(teamFile, 'utf8'));

    const index = team.members.findIndex(m => m.email === email);
    if (index === -1) {
      console.log(kleur.red(`✖ ${email} is not a team member`));
      return { success: false, error: 'not_member' };
    }

    // Check if trying to remove owner
    const member = team.members[index];
    if (member.role === 'owner') {
      console.log(kleur.red('✖ Cannot remove the owner'));
      return { success: false, error: 'cannot_remove_owner' };
    }

    // Ask for confirmation
    const readline = await import('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const question = () => new Promise(resolve => rl.question(`Remove ${email}? (y/N): `, resolve));
    const answer = await question();
    rl.close();

    if (answer.toLowerCase() !== 'y') {
      console.log(kleur.gray('Cancelled.'));
      return { success: false, error: 'cancelled' };
    }

    team.members.splice(index, 1);
    team.updatedAt = new Date().toISOString();

    await fs.writeFile(teamFile, JSON.stringify(team, null, 2), 'utf8');

    console.log(kleur.green(`✔ ${email} removed from team`));
    return { success: true, email };

  } catch (error) {
    console.log(kleur.red(`✖ Failed to remove member: ${error.message}`));
    return { success: false, error: error.message };
  }
}

/**
 * Update member role
 */
async function updateMemberRole(email, newRole, options = {}) {
  console.log(kleur.cyan('▸ Updating member role…'));
  console.log(kleur.gray(`  Email: ${email}`));
  console.log(kleur.gray(`  New role: ${newRole}`));
  console.log('');

  if (!CONFIG.roles.includes(newRole)) {
    console.log(kleur.red(`✖ Invalid role: ${newRole}`));
    return { success: false, error: 'invalid_role' };
  }

  const projectDir = options.project || process.cwd();
  const teamFile = path.join(projectDir, CONFIG.teamDir, 'members.json');

  try {
    const team = JSON.parse(await fs.readFile(teamFile, 'utf8'));
    const member = team.members.find(m => m.email === email);

    if (!member) {
      console.log(kleur.red(`✖ ${email} is not a team member`));
      return { success: false, error: 'not_member' };
    }

    const oldRole = member.role;
    member.role = newRole;
    member.updatedAt = new Date().toISOString();
    team.updatedAt = new Date().toISOString();

    await fs.writeFile(teamFile, JSON.stringify(team, null, 2), 'utf8');

    console.log(kleur.green('✔ Role updated!'));
    console.log(`  ${email}: ${oldRole} → ${newRole}`);

    return { success: true, member, oldRole, newRole };

  } catch (error) {
    console.log(kleur.red(`✖ Failed to update role: ${error.message}`));
    return { success: false, error: error.message };
  }
}

/**
 * List team members
 */
async function listMembers(projectDir = process.cwd()) {
  const teamFile = path.join(projectDir, CONFIG.teamDir, 'members.json');

  console.log(kleur.bold('Team Members'));
  console.log(kleur.gray('═'.repeat(60)));
  console.log('');

  try {
    const team = JSON.parse(await fs.readFile(teamFile, 'utf8'));

    if (team.members.length === 0) {
      console.log(kleur.yellow('  No team members yet.'));
      console.log('');
      console.log(kleur.gray('  Add a member:'));
      console.log(kleur.gray(`  ${kleur.cyan('npx hojai team add member@myapp.com --role=developer')}`));
      return team;
    }

    console.log(`  ${kleur.bold('Email').padEnd(30)} ${kleur.bold('Role').padEnd(12)} ${kleur.bold('Status')}`);
    console.log('  ' + '─'.repeat(60));

    for (const member of team.members) {
      const statusColor = member.status === 'active' ? kleur.green :
                         member.status === 'invited' ? kleur.yellow : kleur.gray;
      console.log(
        `  ${member.email.padEnd(30)} ${member.role.padEnd(12)} ${statusColor(member.status)}`
      );
    }

    console.log('');
    console.log(kleur.gray(`  Total: ${team.members.length} member(s)`));
    console.log('');

    return team;

  } catch {
    console.log(kleur.yellow('  No team configured yet.'));
    return { members: [] };
  }
}

/**
 * Accept invite
 */
async function acceptInvite(token, options = {}) {
  console.log(kleur.cyan('▸ Accepting invite…'));

  const projectDir = options.project || process.cwd();
  const teamFile = path.join(projectDir, CONFIG.teamDir, 'members.json');

  try {
    const team = JSON.parse(await fs.readFile(teamFile, 'utf8'));
    const member = team.members.find(m => m.inviteToken === token);

    if (!member) {
      console.log(kleur.red('✖ Invalid invite token'));
      return { success: false, error: 'invalid_token' };
    }

    if (new Date(member.inviteExpiresAt) < new Date()) {
      console.log(kleur.red('✖ Invite has expired'));
      return { success: false, error: 'expired' };
    }

    member.status = 'active';
    member.inviteToken = null;
    member.acceptedAt = new Date().toISOString();
    team.updatedAt = new Date().toISOString();

    await fs.writeFile(teamFile, JSON.stringify(team, null, 2), 'utf8');

    console.log(kleur.green('✔ Invite accepted!'));
    console.log(`  You are now a ${member.role} on this project.`));

    return { success: true, member };

  } catch (error) {
    console.log(kleur.red(`✖ Failed to accept invite: ${error.message}`));
    return { success: false, error: error.message };
  }
}

/**
 * Get member permissions
 */
function getRolePermissions(role) {
  const permissions = {
    owner: ['*'],
    admin: [
      'deploy', 'rollback', 'preview', 'domain',
      'team.add', 'team.remove', 'team.update',
      'audit.view', 'settings.manage',
      'api.read', 'api.write'
    ],
    developer: [
      'deploy', 'preview',
      'api.read', 'api.write',
      'audit.view'
    ],
    viewer: [
      'api.read',
      'audit.view'
    ]
  };

  return permissions[role] || [];
}

/**
 * Main function
 */
export async function runTeam({ args = [], flags = {} } = {}) {
  const subcommand = args[0];
  const email = args[1];
  const project = flags.project || flags.p;

  if (subcommand === 'help' || !subcommand || flags.help) {
    console.log(kleur.bold('Usage:'));
    console.log('  ' + kleur.cyan('npx hojai team add') + ' <email> [--role=<role>]');
    console.log('  ' + kleur.cyan('npx hojai team remove') + ' <email>');
    console.log('  ' + kleur.cyan('npx hojai team update') + ' <email> [--role=<role>]');
    console.log('  ' + kleur.cyan('npx hojai team list'));
    console.log('  ' + kleur.cyan('npx hojai team accept') + ' <token>');
    console.log('  ' + kleur.cyan('npx hojai team roles'));
    console.log('');
    console.log(kleur.bold('Roles:'));
    for (const role of CONFIG.roles) {
      const perms = getRolePermissions(role);
      console.log(`  ${kleur.cyan(role.padEnd(10))} ${perms.slice(0, 3).join(', ')}${perms.length > 3 ? '...' : ''}`);
    }
    console.log('');
    console.log(kleur.bold('Examples:'));
    console.log('  npx hojai team add alice@myapp.com --role=developer');
    console.log('  npx hojai team add bob@myapp.com --role=admin');
    console.log('  npx hojai team update alice@myapp.com --role=admin');
    console.log('  npx hojai team remove alice@myapp.com');
    console.log('  npx hojai team list');
    return;
  }

  const projectDir = project || process.cwd();

  if (subcommand === 'add') {
    if (!email) {
      console.log(kleur.red('✖ Email required'));
      console.log(kleur.gray('  Usage: npx hojai team add <email> [--role=<role>]'));
      return;
    }
    return addMember(email, { project: projectDir, role: flags.role });
  }

  if (subcommand === 'remove' || subcommand === 'rm') {
    if (!email) {
      console.log(kleur.red('✖ Email required'));
      console.log(kleur.gray('  Usage: npx hojai team remove <email>'));
      return;
    }
    return removeMember(email, { project: projectDir });
  }

  if (subcommand === 'update') {
    if (!email) {
      console.log(kleur.red('✖ Email required'));
      return;
    }
    return updateMemberRole(email, flags.role || 'developer', { project: projectDir });
  }

  if (subcommand === 'list' || subcommand === 'ls') {
    return listMembers(projectDir);
  }

  if (subcommand === 'accept') {
    const token = args[1];
    if (!token) {
      console.log(kleur.red('✖ Invite token required'));
      return;
    }
    return acceptInvite(token, { project: projectDir });
  }

  if (subcommand === 'roles') {
    console.log(kleur.bold('Available Roles & Permissions'));
    console.log(kleur.gray('═'.repeat(50)));
    console.log('');

    for (const role of CONFIG.roles) {
      const perms = getRolePermissions(role);
      console.log(kleur.bold(`${role}:`));
      if (perms[0] === '*') {
        console.log('  All permissions');
      } else {
        for (const perm of perms) {
          console.log(`  • ${perm}`);
        }
      }
      console.log('');
    }

    return CONFIG.roles.map(role => ({ role, permissions: getRolePermissions(role) }));
  }

  console.log(kleur.red(`✖ Unknown command: ${subcommand}`));
  console.log(kleur.gray('  Available: add, remove, update, list, accept, roles'));
}
