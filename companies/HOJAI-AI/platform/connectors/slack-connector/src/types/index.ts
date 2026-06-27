/**
 * Slack Connector - TypeScript Types
 * Complete type definitions for Slack Web API, OAuth, and webhooks
 */

// ============================================================================
// OAuth Types
// ============================================================================

export interface SlackOAuthToken {
  ok: boolean;
  access_token: string;
  token_type: 'bot' | 'user';
  scope: string;
  app_id: string;
  team_id: string;
  enterprise_id?: string;
  team_name: string;
  bot?: {
    bot_access_token: string;
    bot_user_id: string;
    bot_id: string;
    scopes: string[];
  };
  incoming_webhook?: {
    channel: string;
    channel_id: string;
    configuration_url: string;
    url: string;
  };
  authed_users?: string[];
  error?: string;
}

export interface SlackTokenInfo {
  ok: boolean;
  app_id: string;
  authed_users: string[];
  is_enterprise_install: boolean;
  team: string;
  token_type: 'user' | 'bot' | 'classic';
  scopes: string[];
  expiration?: number;
  error?: string;
}

// ============================================================================
// Team & User Types
// ============================================================================

export interface SlackTeam {
  id: string;
  name: string;
  domain: string;
  email_domain?: string;
  icon?: {
    image_34: string;
    image_44: string;
    image_68: string;
    image_88: string;
    image_102: string;
    image_132: string;
    image_default: boolean;
  };
  enterprise_id?: string;
  enterprise_name?: string;
}

export interface SlackUser {
  id: string;
  team_id: string;
  name: string;
  deleted: boolean;
  real_name: string;
  real_name_normalized: string;
  email?: string;
  phone?: string;
  skype?: string;
  first_name: string;
  last_name: string;
  title?: string;
  bot_id?: string;
  status_text?: string;
  status_emoji?: string;
  status_expiration?: number;
  avatar_hash: string;
  image_24: string;
  image_32: string;
  image_48: string;
  image_72: string;
  image_192: string;
  image_512: string;
  image_1024: string;
  always_online: boolean;
  is_bot: boolean;
  is_admin?: boolean;
  is_owner?: boolean;
  is_primary_owner?: boolean;
  is_restricted?: boolean;
  is_ultra_restricted?: boolean;
  is_app_user?: boolean;
  is_stranger?: boolean;
  is_workflow_bot?: boolean;
  locale?: string;
  presence?: 'active' | 'away' | 'busy' | 'dnd' | 'offline';
}

export interface SlackUserPresence {
  ok: boolean;
  presence: 'active' | 'away' | 'dnd' | 'offline';
  online_away?: boolean;
  auto_away?: boolean;
  connection_count?: number;
  last_activity?: number;
}

export interface SlackUserConversations {
  ok: boolean;
  channels: SlackConversation[];
  response_metadata?: {
    next_cursor?: string;
  };
}

// ============================================================================
// Channel Types
// ============================================================================

export type ChannelType = 'public_channel' | 'private_channel' | 'im' | 'mpim';

export interface SlackChannel {
  id: string;
  name: string;
  name_normalized: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  is_mpim: boolean;
  is_shared: boolean;
  is_ext_shared: boolean;
  is_org_shared: boolean;
  is_private: boolean;
  is_pending_ext_shared?: boolean;
  is_member: boolean;
  is_private: boolean;
  topic?: {
    value: string;
    creator: string;
    last_set: number;
  };
  purpose?: {
    value: string;
    creator: string;
    last_set: number;
  };
  previous_names?: string[];
  num_members?: number;
  created: number;
  creator: string;
  isArchived: boolean;
  unlinked: number;
  parent_conversation?: string;
  slim_members?: boolean;
  pending_connected_team_ids?: string[];
  pending_shared?: string[];
}

export interface SlackConversation {
  id: string;
  created: number;
  is_archived: boolean;
  is_open: boolean;
  is_group: boolean;
  is_im: boolean;
  is_mpim: boolean;
  is_private: boolean;
  is_shared: boolean;
  unlinked: number;
  name_normalized: string;
  name: string;
  pending_connected_team_ids?: string[];
  pending_shared?: string[];
  topic?: string;
  purpose?: string;
  context_team_id?: string;
  updated?: number;
  parent_conversation?: string;
  creator?: string;
  is_ext_shared?: boolean;
  is_org_shared?: boolean;
  shares?: Array<{
    accepted_at: number;
    team_id: string;
  }>;
  dm_count?: number;
  unread_count?: number;
  unread_count_display?: number;
  message_history?: {
    msgs: SlackMessage[];
    latest: number;
  };
  topic?: string;
  purpose?: string;
}

export interface SlackChannelMember {
  ok: boolean;
  members: string[];
  response_metadata?: {
    next_cursor?: string;
  };
}

// ============================================================================
// Message Types
// ============================================================================

export interface SlackMessage {
  ok: boolean;
  channel: string;
  ts: string;
  text?: string;
  user?: string;
  bot_id?: string;
  app_id?: string;
  team?: string;
  subtype?: string;
  thread_ts?: string;
  parent_user_id?: string;
  reply_count?: number;
  reply_users_count?: number;
  latest_reply?: string;
  reply_users?: string[];
  is_locked?: boolean;
  subscribed?: boolean;
  last_read?: string;
  reactions?: SlackReaction[];
  files?: SlackFile[];
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
  edited?: {
    user: string;
    ts: string;
  };
  uploaded?: boolean;
  replaced?: boolean;
  trusted_upload?: boolean;
  error?: string;
}

export interface SlackMessageHistory {
  ok: boolean;
  messages: SlackMessage[];
  has_more: boolean;
  pin_count: number;
  channel_actions_ts?: number;
  channel_actions_count?: number;
  response_metadata?: {
    next_cursor?: string;
  };
  error?: string;
}

export interface SlackScheduledMessage {
  ok: boolean;
  scheduled_message_id: string;
  channel_id: string;
  post_at: string;
  date_created: number;
  text: string;
  attachments?: SlackAttachment[];
  blocks?: SlackBlock[];
  team_id: string;
  rich_text?: unknown;
}

export interface SlackScheduledMessagesList {
  ok: boolean;
  scheduled_messages: SlackScheduledMessage[];
  response_metadata?: {
    next_cursor?: string;
  };
  error?: string;
}

// ============================================================================
// Block Kit Types
// ============================================================================

export type SlackBlockType =
  | 'actions'
  | 'context'
  | 'divider'
  | 'header'
  | 'image'
  | 'input'
  | 'rich_text'
  | 'section'
  | 'video';

export interface SlackBlock {
  type: SlackBlockType;
  block_id?: string;
  // Section block
  text?: SlackTextObject;
  fields?: SlackTextObject[];
  accessory?: SlackBlockElement;
  // Header block
  hash?: string;
  title?: SlackTextObject;
  subtitle?: SlackTextObject;
  video_url?: string;
  thumbnail_url?: string;
  author_name?: string;
  provider_name?: string;
  provider_icon_url?: string;
  // Image block
  image_url?: string;
  alt_text?: string;
  // Actions block
  elements?: SlackBlockElement[];
  // Context block
  // Divider block - no additional properties
  // Input block
  label?: SlackTextObject;
  hint?: SlackTextObject;
  element: SlackBlockElement;
  dispatch_action?: boolean;
  // Video block
  description?: SlackTextObject;
  title_url?: string;
  author_name?: string;
  provider_name?: string;
}

export type SlackTextObjectType = 'plain_text' | 'mrkdwn';

export interface SlackTextObject {
  type: SlackTextObjectType;
  text: string;
  emoji?: boolean;
  verbatim?: boolean;
}

export type SlackBlockElementType =
  | 'button'
  | 'checkboxes'
  | 'datepicker'
  | 'timepicker'
  | 'datetimepicker'
  | 'external_select'
  | 'multi_external_select'
  | 'static_select'
  | 'multi_static_select'
  | 'conversations_select'
  | 'multi_conversations_select'
  | 'channels_select'
  | 'multi_channels_select'
  | 'users_select'
  | 'multi_users_select'
  | 'overflow'
  | 'plain_text_input'
  | 'email_text_input'
  | 'url_text_input'
  | 'number_input'
  | 'image';

export interface SlackBlockElement {
  type: SlackBlockElementType;
  action_id?: string;
  block_id?: string;
  // Button
  text?: SlackTextObject;
  url?: string;
  value?: string;
  style?: 'primary' | 'danger' | 'default';
  confirm?: SlackConfirmationDialog;
  // Select elements
  placeholder?: SlackTextObject;
  initial_channel?: string;
  initial_channels?: string[];
  initial_conversation?: string;
  initial_conversations?: string[];
  initial_date?: string;
  initial_option?: SlackOption;
  initial_options?: SlackOption[];
  initial_text?: string;
  initial_time?: string;
  initial_user?: string;
  initial_users?: string[];
  min_query_length?: number;
  // Checkboxes
  options?: SlackOption[];
  // Overflow
  options: SlackOption[];
  // Text inputs
  multiline?: boolean;
  min_length?: number;
  max_length?: number;
  dispatch_action_config?: {
    trigger_actions_on?: ('on_enter_pressed' | 'on_character_entered')[];
  };
  focus_on_load?: boolean;
}

export interface SlackOption {
  text: SlackTextObject | string;
  value: string;
  description?: SlackTextObject | string;
  url?: string;
}

export interface SlackOptionGroup {
  label: SlackTextObject | string;
  options: SlackOption[];
}

export interface SlackConfirmationDialog {
  title: SlackTextObject | string;
  text: SlackTextObject | string;
  confirm: SlackTextObject | string;
  deny: SlackTextObject | string;
  style?: 'primary' | 'danger';
}

// ============================================================================
// Attachment Types
// ============================================================================

export interface SlackAttachment {
  msg_subtype?: string;
  fallback?: string;
  callback_id?: string;
  color?: string;
  pretext?: string;
  author_name?: string;
  author_link?: string;
  author_icon?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: Array<{
    title: string;
    value: string;
    short: boolean;
  }>;
  image_url?: string;
  image_width?: number;
  image_height?: number;
  image_bytes?: number;
  thumb_url?: string;
  thumb_width?: number;
  thumb_height?: number;
  footer?: string;
  footer_icon?: string;
  ts?: number | string;
  blocks?: SlackBlock[];
  actions?: Array<{
    type: string;
    text: string;
    url?: string;
    style?: string;
  }>;
  filename?: string;
  size?: number;
  mimetype?: string;
  mimetype?: string;
 假日?: string;
  title_text?: string;
}

// ============================================================================
// Reaction & File Types
// ============================================================================

export interface SlackReaction {
  name: string;
  users: string[];
  count: number;
}

export interface SlackFile {
  id: string;
  created: number;
  timestamp: number;
  name: string;
  title: string;
  mimetype: string;
  filetype: string;
  pretty_type: string;
  user: string;
  editable: boolean;
  size: number;
  mode: string;
  is_external: boolean;
  external_type?: string;
  is_public: boolean;
  public_url_shared: boolean;
  display_as_bot: boolean;
  username?: string;
  url_private: string;
  url_private_download: string;
  permalink: string;
  permalink_public: string;
  edit_link?: string;
  preview: string;
  preview_highlight: string;
  lines: number;
  lines_more: number;
  preview_is_truncated: boolean;
  has_rich_preview?: boolean;
  file_access?: string;
  channels?: string[];
  groups?: string[];
  ims?: string[];
  shared_to_ids?: Record<string, unknown>;
  pin_count?: number;
  reactions?: SlackReaction[];
  comments_count?: number;
  thumbs?: {
    total: number;
    users: unknown[];
  };
}

// ============================================================================
// Webhook Types
// ============================================================================

export type SlackWebhookEventType =
  | 'url_verification'
  | 'app_rate_limited'
  | 'app_mention'
  | 'app_home_opened'
  | 'app_uninstalled'
  | 'call_started'
  | 'call_answered'
  | 'call_rejected'
  | 'channel_archive'
  | 'channel_created'
  | 'channel_deleted'
  | 'channel_history_changed'
  | 'channel_left'
  | 'channel_rename'
  | 'channel_shared'
  | 'channel_unarchive'
  | 'channel_unshared'
  | 'dnd_updated'
  | 'dnd_updated_user'
  | 'email_domain_changed'
  | 'emoji_changed'
  | 'file_changed'
  | 'file_comment_added'
  | 'file_comment_deleted'
  | 'file_comment_edited'
  | 'file_created'
  | 'file_deleted'
  | 'file_public'
  | 'file_shared'
  | 'file_unshared'
  | 'grid_migration_finished'
  | 'grid_migration_started'
  | 'group_archive'
  | 'group_close'
  | 'group_deleted'
  | 'group_history_changed'
  | 'group_left'
  | 'group_rename'
  | 'group_shared'
  | 'group_unarchive'
  | 'group_unshared'
  | 'im_close'
  | 'im_created'
  | 'im_history_changed'
  | 'im_open'
  | 'invite_requested'
  | 'link_shared'
  | 'member_joined_channel'
  | 'member_left_channel'
  | 'message'
  | 'message.app_home'
  | 'message.channels'
  | 'message.groups'
  | 'message.im'
  | 'message.mpim'
  | 'message_metadata_deleted'
  | 'message_metadata_updated'
  | 'message_replied'
  | 'messages_shares_changed'
  | 'oauth.code'
  | 'pin_added'
  | 'pin_removed'
  | 'preference_changed'
  | 'presence_change'
  | 'reaction_added'
  | 'reaction_removed'
  | 'resources_added'
  | 'resources_removed'
  | 'rich_text_updated'
  | 'scope_denied'
  | 'scope_granted'
  | 'shared_channel_invite_accepted'
  | 'shared_channel_invite_received'
  | 'shared_channel_invite_requested'
  | 'star_added'
  | 'star_removed'
  | 'subteam_created'
  | 'subteam_updated'
  | 'subteam_users_changed'
  | 'team_access_log_changed'
  | 'team_domain_changed'
  | 'team_enterprise_migration'
  | 'team_join'
  | 'team_rename'
  | 'tokens_revoked'
  | 'user_access_log_changed'
  | 'user_changed'
  | 'user_huddle_changed'
  | 'user_profile_changed'
  | 'user_profile_shortcut_changed'
  | 'user_status_changed'
  | 'workflow_deleted'
  | 'workflow_published'
  | 'workflow_step_executed'
  | 'workflow_unpublished';

export interface SlackWebhookEvent {
  token?: string;
  team_id?: string;
  api_app_id?: string;
  type: 'url_verification' | 'event_callback' | 'app_rate_limited';
  challenge?: string;
  authed_users?: string[];
  authed_teams?: string[];
  event_id?: string;
  event_time?: number;
  event?: {
    type: string;
    [key: string]: unknown;
  };
  // Rate limited
  team_id?: string;
  minute_rate_limited?: number;
  api_app_id?: string;
  // URL verification
  challenge?: string;
}

export interface SlackEventCallback {
  type: 'event_callback';
  token: string;
  team_id: string;
  api_app_id: string;
  authed_users: string[];
  authed_teams: string[];
  event_id: string;
  event_time: number;
  event: SlackEvent;
}

export interface SlackEvent {
  type: SlackWebhookEventType | string;
  user?: string;
  channel?: string;
  channel_id?: string;
  ts?: string;
  text?: string;
  subtype?: string;
  thread_ts?: string;
  parent_user_id?: string;
  files?: SlackFile[];
  reactions?: SlackReaction[];
  item?: {
    type: 'message' | 'file' | 'file_comment';
    channel: string;
    ts: string;
  };
  reaction?: string;
  value?: string;
  name?: string;
  old_name?: string;
  is_private?: boolean;
  bot_id?: string;
  app_id?: string;
  team?: string;
  user_team?: string;
  source_team?: string;
  event_ts?: string;
  invite?: {
    channel: string;
    code: string;
    date_create: number;
    intro_app_state: unknown;
    channel_creator: string;
  };
  accepted_user?: string;
  capability?: string;
}

// ============================================================================
// Pagination Types
// ============================================================================

export interface SlackCursorPagination {
  limit?: number;
  cursor?: string;
}

export interface SlackPaginatedResponse<T> {
  ok: boolean;
  items: T[];
  response_metadata?: {
    next_cursor?: string;
    total_count?: number;
    page_counts?: Record<string, number>;
  };
  error?: string;
}

// ============================================================================
// File Upload Types
// ============================================================================

export interface SlackFileUpload {
  ok: boolean;
  file: SlackFile;
  needed: string[];
  provided: string[];
  error?: string;
}

// ============================================================================
// Error Types
// ============================================================================

export interface SlackAPIError {
  ok: false;
  error: string;
  response_metadata?: {
    messages?: string[];
    scopes?: string[];
    acceptedScopes?: string[];
    retryAfter?: number;
  };
}

export class SlackAPIException extends Error {
  constructor(
    public code: string,
    message: string,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'SlackAPIException';
  }
}

export class SlackRateLimitException extends SlackAPIException {
  constructor(retryAfter: number) {
    super('rate_limited', `Rate limited. Retry after ${retryAfter} seconds.`, retryAfter);
    this.name = 'SlackRateLimitException';
  }
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface SlackConnectorConfig {
  clientId: string;
  clientSecret: string;
  signingSecret: string;
  redirectUri?: string;
  scopes: string[];
  tokenStore?: SlackTokenStore;
  logger?: Logger;
}

export interface SlackTokenStore {
  getToken(teamId: string): Promise<string | null>;
  setToken(teamId: string, token: string): Promise<void>;
  removeToken(teamId: string): Promise<void>;
  getAllTokens(): Promise<Map<string, string>>;
}

export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

// ============================================================================
// Observer Event Types (for TwinOS integration)
// ============================================================================

export interface ObserverEvent {
  source: 'slack';
  type: 'message' | 'reaction' | 'mention' | 'channel_join' | 'channel_leave' | 'status_change';
  employeeId: string;
  timestamp: string;
  data: {
    channel?: string;
    channelName?: string;
    text?: string;
    messageTs?: string;
    threadTs?: string;
    reaction?: string;
    userId?: string;
    userName?: string;
    raw?: Record<string, unknown>;
  };
}

export interface ObserverEventsResponse {
  success: boolean;
  data: {
    events: ObserverEvent[];
    total: number;
    hasMore: boolean;
    nextCursor?: string;
  };
}