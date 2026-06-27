/**
 * Slack Users API
 * User listing, lookup, and profile management
 */

import { SlackClient } from './client.js';
import type {
  SlackUser,
  SlackUserPresence,
  SlackUserConversations,
  SlackCursorPagination,
} from '../types/index.js';

export interface ListUsersParams extends SlackCursorPagination {
  includeLocale?: boolean;
  limit?: number;
}

export interface GetUserConversationsParams extends SlackCursorPagination {
  types?: string[];
  excludeArchived?: boolean;
  user?: string;
}

/**
 * User operations using Slack Web API
 */
export class SlackUsersAPI {
  constructor(private client: SlackClient) {}

  /**
   * List all users in the workspace
   */
  async listUsers(params?: ListUsersParams): Promise<{
    users: SlackUser[];
    nextCursor?: string;
  }> {
    const result = await this.client.call<{
      ok: boolean;
      members: SlackUser[];
      response_metadata?: { next_cursor?: string };
    }>('users.list', {
      limit: params?.limit || 200,
      cursor: params?.cursor,
      include_locale: params?.includeLocale ?? false,
    });

    return {
      users: result.members || [],
      nextCursor: result.response_metadata?.next_cursor,
    };
  }

  /**
   * Get a user by their ID
   */
  async getUser(userId: string): Promise<SlackUser> {
    const result = await this.client.call<{
      ok: boolean;
      user: SlackUser;
    }>('users.info', {
      user: userId,
    });

    return result.user;
  }

  /**
   * Look up a user by their email address
   */
  async getUserByEmail(email: string): Promise<SlackUser | null> {
    try {
      const result = await this.client.call<{
        ok: boolean;
        user?: SlackUser;
      }>('users.lookupByEmail', {
        email,
      });

      if (!result.ok || !result.user) {
        return null;
      }

      return result.user;
    } catch {
      return null;
    }
  }

  /**
   * Get a user's presence status
   */
  async getUserPresence(userId: string): Promise<SlackUserPresence> {
    return this.client.call<SlackUserPresence>('users.getPresence', {
      user: userId,
    });
  }

  /**
   * Set the authenticated user's custom status
   */
  async setUserStatus(
    status: string,
    emoji: string,
    duration?: number // Unix timestamp when status should expire
  ): Promise<boolean> {
    const profileUpdate: Record<string, unknown> = {
      status_text: status,
      status_emoji: emoji.startsWith(':') ? emoji : `:${emoji}:`,
    };

    if (duration) {
      profileUpdate.status_expiration = duration;
    }

    const result = await this.client.call<{ ok: boolean }>(
      'users.profile.set',
      {
        profile: profileUpdate,
      }
    );

    return result.ok;
  }

  /**
   * Clear the authenticated user's status
   */
  async clearUserStatus(): Promise<boolean> {
    const result = await this.client.call<{ ok: boolean }>(
      'users.profile.set',
      {
        profile: {
          status_text: '',
          status_emoji: '',
          status_expiration: 0,
        },
      }
    );

    return result.ok;
  }

  /**
   * Get the authenticated user's profile
   */
  async getMyProfile(): Promise<{
    ok: boolean;
    profile: Partial<SlackUser>;
  }> {
    return this.client.call<{ ok: boolean; profile: Partial<SlackUser> }>(
      'users.profile.get',
      {}
    );
  }

  /**
   * Set the authenticated user's profile
   */
  async setMyProfile(profile: {
    firstName?: string;
    lastName?: string;
    displayName?: string;
    statusText?: string;
    statusEmoji?: string;
    statusExpiration?: number;
    phone?: string;
    skype?: string;
    customFields?: Record<string, string>;
  }): Promise<boolean> {
    const profileUpdate: Record<string, unknown> = {};

    if (profile.firstName) profileUpdate.first_name = profile.firstName;
    if (profile.lastName) profileUpdate.last_name = profile.lastName;
    if (profile.displayName) profileUpdate.display_name = profile.displayName;
    if (profile.statusText !== undefined) profileUpdate.status_text = profile.statusText;
    if (profile.statusEmoji !== undefined) profileUpdate.status_emoji = profile.statusEmoji;
    if (profile.statusExpiration) profileUpdate.status_expiration = profile.statusExpiration;
    if (profile.phone) profileUpdate.phone = profile.phone;
    if (profile.skype) profileUpdate.skype = profile.skype;

    if (profile.customFields) {
      profileUpdate.fields = profile.customFields;
    }

    const result = await this.client.call<{ ok: boolean }>(
      'users.profile.set',
      {
        profile: profileUpdate,
      }
    );

    return result.ok;
  }

  /**
   * Get conversations for a user (DMs and MPDMs)
   */
  async getUserConversations(
    params?: GetUserConversationsParams
  ): Promise<{
    channels: Array<{
      id: string;
      created: number;
      is_open: boolean;
      is_im: boolean;
      is_mpim: boolean;
      is_shared: boolean;
      unread_count?: number;
      unread_count_display?: number;
    }>;
    nextCursor?: string;
  }> {
    const result = await this.client.call<{
      ok: boolean;
      channels: Array<{
        id: string;
        created: number;
        is_open: boolean;
        is_im: boolean;
        is_mpim: boolean;
        is_shared: boolean;
        unread_count?: number;
        unread_count_display?: number;
      }>;
      response_metadata?: { next_cursor?: string };
    }>('conversations.list', {
      types: params?.types || ['im', 'mpim'],
      limit: params?.limit || 200,
      cursor: params?.cursor,
      exclude_archived: params?.excludeArchived ?? true,
      user: params?.user,
    });

    return {
      channels: result.channels || [],
      nextCursor: result.response_metadata?.next_cursor,
    };
  }

  /**
   * Get user by their workspace ID and user ID (for cross-workspace lookups)
   */
  async getUserByTeam(teamId: string, userId: string): Promise<SlackUser> {
    const result = await this.client.call<{
      ok: boolean;
      user: SlackUser;
    }>('admin.users.list', {
      team_id: teamId,
      user: userId,
    });

    return result.user;
  }

  /**
   * Invite users to the workspace (requires admin permissions)
   */
  async inviteUsers(
    email: string,
    channels?: string[],
    realName?: string
  ): Promise<{ ok: boolean; userId?: string }> {
    const result = await this.client.call<{
      ok: boolean;
      user_id?: string;
    }>('admin.users.invite', {
      email,
      channels: channels?.join(','),
      real_name: realName,
    });

    return { ok: result.ok, userId: result.user_id };
  }

  /**
   * Search for users by name or email
   */
  async searchUsers(query: string): Promise<SlackUser[]> {
    const result = await this.client.call<{
      ok: boolean;
      users: SlackUser[];
    }>('users.lookupByEmail', {
      email: query, // Note: This method is email-only, for name search we need to filter listUsers
    }).catch(() => ({ ok: false, users: [] as SlackUser[] }));

    // If email lookup didn't work, try filtering from user list
    if (!result.ok || result.users.length === 0) {
      const { users } = await this.listUsers({ limit: 200 });
      const lowerQuery = query.toLowerCase();
      return users.filter(
        (user) =>
          !user.deleted &&
          (user.name.toLowerCase().includes(lowerQuery) ||
            user.real_name.toLowerCase().includes(lowerQuery) ||
            user.email?.toLowerCase().includes(lowerQuery))
      );
    }

    return result.users;
  }
}

export default SlackUsersAPI;