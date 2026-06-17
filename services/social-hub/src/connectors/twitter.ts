import axios from 'axios';
import crypto from 'crypto';
import { IChannel } from '../models/Channel';
import { SocialMessage } from '../models/SocialMessage';

const TWITTER_API_BASE = 'https://api.twitter.com/2';
const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;

export interface TwitterMessageContent {
  type: 'text' | 'image' | 'video';
  text?: string;
  mediaUrl?: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface TwitterWebhookPayload {
  tweet_create_events?: TweetEvent[];
  direct_message_events?: DMEvents[];
  follow_events?: FollowEvent[];
  unfollow_events?: FollowEvent[];
  friend_events?: FriendEvent[];
  user_event?: UserEvent;
}

export interface TweetEvent {
  id: string;
  id_str: string;
  text: string;
  user: {
    id: string;
    id_str: string;
    name: string;
    screen_name: string;
    profile_image_url_https: string;
  };
  created_at: string;
  entities: {
    hashtags: Array<{ text: string; indices: number[] }>;
    symbols: any[];
    user_mentions: Array<{
      screen_name: string;
      name: string;
      id: number;
      id_str: string;
      indices: number[];
    }>;
    urls: Array<{
      url: string;
      expanded_url: string;
      display_url: string;
      indices: number[];
    }>;
  };
  in_reply_to_status_id_str?: string;
  in_reply_to_user_id_str?: string;
  in_reply_to_screen_name?: string;
  retweeted: boolean;
  is_quote_status: boolean;
  quoted_status_id_str?: string;
  quoted_status?: TweetEvent;
  coordinates?: {
    type: string;
    coordinates: number[];
  };
  place?: {
    id: string;
    place_type: string;
    name: string;
    full_name: string;
    country_code: string;
    country: string;
  };
}

export interface DMEvents {
  type: string;
  id: string;
  created_timestamp: string;
  message_create: {
    sender_id: string;
    target: {
      recipient_id: string;
    };
    message_data: {
      text: string;
      quick_reply_response?: {
        type: string;
        metadata: string;
      };
      attachment?: {
        type: string;
        media: {
          id: string;
          id_str: string;
          media_url_https: string;
        };
      };
    };
  };
}

export interface FollowEvent {
  type: string;
  created_at: string;
  following?: {
    id: string;
    id_str: string;
  };
  follower?: {
    id: string;
    id_str: string;
  };
}

export interface FriendEvent {
  type: string;
  created_at: string;
  friend?: {
    id: string;
    id_str: string;
  };
}

export interface UserEvent {
  type: string;
  created_at: string;
}

/**
 * Verify Twitter webhook CRC
 */
export async function verifyCRC(appSecret: string, crcToken: string): Promise<string> {
  const hmac = crypto
    .createHmac('sha256', appSecret)
    .update(crcToken)
    .digest('base64');

  return `sha256=${hmac}`;
}

/**
 * Register webhook with Twitter
 */
export async function registerWebhook(
  bearerToken: string,
  env: string = 'production',
  webhookUrl: string
): Promise<SendResult> {
  try {
    // Register webhook
    await axios.post(
      `${TWITTER_API_BASE}/account_activity/all/${env}/webhooks`,
      { url: webhookUrl },
      {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Subscribe to events
    await axios.post(
      `${TWITTER_API_BASE}/account_activity/all/${env}/subscriptions`,
      {},
      {
        headers: {
          Authorization: `Bearer ${bearerToken}`
        }
      }
    );

    return { success: true };
  } catch (error: any) {
    console.error('Twitter webhook registration error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.errors?.[0]?.message || error.message
    };
  }
}

/**
 * Send direct message via Twitter
 */
export async function sendDirectMessage(
  channel: IChannel,
  recipientId: string,
  content: TwitterMessageContent
): Promise<SendResult> {
  try {
    const accessToken = channel.credentials.get('accessToken');
    const accessTokenSecret = channel.credentials.get('accessTokenSecret');

    if (!accessToken || !accessTokenSecret) {
      return { success: false, error: 'Missing Twitter credentials' };
    }

    const payload: Record<string, unknown> = {
      event: {
        type: 'message_create',
        message_create: {
          target: {
            recipient_id: recipientId
          },
          message_data: {
            text: content.text || ''
          }
        }
      }
    };

    // Add media if present
    if (content.mediaUrl) {
      // First upload media
      const mediaId = await uploadMedia(channel, content.mediaUrl);
      if (mediaId) {
        payload.event.message_create.message_dataattachment = {
          type: 'media',
          media: { id: mediaId }
        };
      }
    }

    const response = await axios.post(
      `${TWITTER_API_BASE}/direct_messages/events/new`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const messageId = response.data.event?.id;

    return { success: true, messageId };
  } catch (error: any) {
    console.error('Twitter send DM error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.errors?.[0]?.message || error.message
    };
  }
}

/**
 * Upload media to Twitter
 */
async function uploadMedia(
  channel: IChannel,
  mediaUrl: string
): Promise<string | null> {
  try {
    // This would require OAuth 1.0a signing
    // Simplified version - in production, use twitter-api-v2 library
    console.log('Media upload not implemented - requires OAuth signing');
    return null;
  } catch (error) {
    console.error('Twitter media upload error:', error);
    return null;
  }
}

/**
 * Reply to tweet
 */
export async function replyToTweet(
  channel: IChannel,
  tweetId: string,
  text: string
): Promise<SendResult> {
  try {
    // This would require OAuth 1.0a signing
    // Simplified version
    console.log('Tweet reply not implemented - requires OAuth signing');
    return {
      success: false,
      error: 'Tweet reply requires OAuth 1.0a signing'
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handle incoming Twitter webhook
 */
export async function handleWebhook(
  channel: IChannel,
  payload: TwitterWebhookPayload
): Promise<void> {
  try {
    // Handle tweet events
    if (payload.tweet_create_events) {
      for (const tweet of payload.tweet_create_events) {
        await handleTweetEvent(channel, tweet);
      }
    }

    // Handle direct message events
    if (payload.direct_message_events) {
      for (const dm of payload.direct_message_events) {
        await handleDMEvent(channel, dm);
      }
    }

    // Handle follow events
    if (payload.follow_events) {
      for (const follow of payload.follow_events) {
        await handleFollowEvent(channel, follow);
      }
    }
  } catch (error) {
    console.error('Twitter webhook handler error:', error);
  }
}

/**
 * Handle tweet event
 */
async function handleTweetEvent(
  channel: IChannel,
  tweet: TweetEvent
): Promise<void> {
  const senderId = tweet.user.id_str;
  const tweetId = tweet.id_str;
  const threadId = `twitter-tweet-${channel._id}-${senderId}`;

  // Determine if it's a mention or reply
  const isReply = !!tweet.in_reply_to_status_id_str;
  const isMention = tweet.entities.user_mentions.length > 0;

  const message = new SocialMessage({
    platform: 'twitter',
    platformMessageId: tweetId,
    senderId,
    senderName: tweet.user.name,
    senderProfilePicture: tweet.user.profile_image_url_https,
    channelId: channel._id,
    content: {
      type: 'text',
      text: tweet.text
    },
    threadId: isReply
      ? `twitter-tweet-${channel._id}-${tweet.in_reply_to_user_id_str}`
      : threadId,
    direction: 'inbound',
    status: 'received',
    processed: false,
    metadata: {
      platformData: {
        isReply,
        isMention,
        isRetweet: tweet.retweeted,
        hashtags: tweet.entities.hashtags.map((h) => h.text),
        mentions: tweet.entities.user_mentions.map((m) => m.screen_name),
        inReplyToTweetId: tweet.in_reply_to_status_id_str,
        inReplyToUserId: tweet.in_reply_to_user_id_str,
        coordinates: tweet.coordinates?.coordinates,
        place: tweet.place
      }
    }
  });

  await message.save();
  console.log(`Twitter tweet saved: ${tweetId}`);
}

/**
 * Handle direct message event
 */
async function handleDMEvent(
  channel: IChannel,
  dm: DMEvents
): Promise<void> {
  const senderId = dm.message_create.sender_id;
  const messageId = dm.id;
  const recipientId = dm.message_create.target.recipient_id;
  const threadId = `twitter-dm-${channel._id}-${senderId}`;

  const messageData = dm.message_create.message_data;

  let content: any = {
    type: 'text',
    text: messageData.text
  };

  // Handle quick reply
  if (messageData.quick_reply_response) {
    content = {
      type: 'text',
      text: messageData.quick_reply_response.metadata
    };
  }

  // Handle media attachment
  if (messageData.attachment?.media) {
    content = {
      type: 'image',
      mediaUrl: messageData.attachment.media.media_url_https
    };
  }

  const message = new SocialMessage({
    platform: 'twitter',
    platformMessageId: messageId,
    senderId,
    recipientId,
    channelId: channel._id,
    content,
    threadId,
    direction: 'inbound',
    status: 'received',
    processed: false,
    metadata: {
      platformData: {
        isDM: true,
        createdTimestamp: dm.created_timestamp
      }
    }
  });

  await message.save();
  console.log(`Twitter DM saved: ${messageId}`);
}

/**
 * Handle follow event
 */
async function handleFollowEvent(
  channel: IChannel,
  follow: FollowEvent
): Promise<void> {
  const followerId = follow.follower?.id_str;
  const followingId = follow.following?.id_str;

  console.log(`Twitter follow event: ${followerId} followed ${followingId}`);

  // Create a system message for follow event
  const message = new SocialMessage({
    platform: 'twitter',
    platformMessageId: `follow-${Date.now()}`,
    senderId: followerId || 'unknown',
    channelId: channel._id,
    content: {
      type: 'text',
      text: 'New follower'
    },
    threadId: `twitter-follow-${channel._id}`,
    direction: 'inbound',
    status: 'received',
    processed: false,
    metadata: {
      platformData: {
        isFollow: true,
        followedUserId: followingId
      }
    }
  });

  await message.save();

  // Auto-reply with welcome message if enabled
  if (channel.settings.autoReply && followerId) {
    setTimeout(async () => {
      await sendDirectMessage(channel, followerId, {
        type: 'text',
        text: 'Thanks for following! Send me a DM if you need help.'
      });
    }, channel.settings.autoReplyDelay || 5000);
  }
}

/**
 * Get user info from Twitter
 */
export async function getUserInfo(
  bearerToken: string,
  userId: string
): Promise<any> {
  try {
    const response = await axios.get(`${TWITTER_API_BASE}/users/${userId}`, {
      params: {
        'user.fields': 'profile_image_url,name,username,public_metrics'
      },
      headers: {
        Authorization: `Bearer ${bearerToken}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Twitter get user info error:', error);
    return null;
  }
}

/**
 * Send tweet
 */
export async function sendTweet(
  channel: IChannel,
  text: string
): Promise<SendResult> {
  try {
    // This would require OAuth 1.0a signing
    console.log('Send tweet not implemented - requires OAuth signing');
    return {
      success: false,
      error: 'Send tweet requires OAuth 1.0a signing'
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Retweet
 */
export async function retweet(
  channel: IChannel,
  tweetId: string
): Promise<SendResult> {
  try {
    // This would require OAuth 1.0a signing
    console.log('Retweet not implemented - requires OAuth signing');
    return {
      success: false,
      error: 'Retweet requires OAuth 1.0a signing'
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  verifyCRC,
  registerWebhook,
  sendDirectMessage,
  sendTweet,
  replyToTweet,
  retweet,
  handleWebhook,
  getUserInfo
};