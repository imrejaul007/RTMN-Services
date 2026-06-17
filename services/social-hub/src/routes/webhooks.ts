import { Router, Request, Response } from 'express';
import { Channel } from '../models/Channel';
import { SocialMessage } from '../models/SocialMessage';
import * as instagramConnector from '../connectors/instagram';
import * as telegramConnector from '../connectors/telegram';
import * as facebookConnector from '../connectors/facebook';

const router = Router();

// ============== INSTAGRAM WEBHOOKS ==============

// Instagram webhook verification
router.get('/instagram', async (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  try {
    // Find channel with this verify token
    const channel = await Channel.findOne({
      'credentials.verifyToken': token,
      platform: 'instagram'
    });

    if (!channel) {
      return res.status(403).json({ error: 'Invalid verify token' });
    }

    if (mode === 'subscribe' && token === channel.credentials.get('verifyToken')) {
      console.log('Instagram webhook verified');
      return res.send(challenge);
    }

    res.sendStatus(403);
  } catch (error) {
    console.error('Instagram webhook verification error:', error);
    res.sendStatus(500);
  }
});

// Instagram webhook handler
router.post('/instagram', async (req: Request, res: Response) => {
  try {
    // Instagram sends array of entries
    const { object, entry } = req.body;

    if (object !== 'instagram') {
      return res.sendStatus(400);
    }

    for (const entryItem of entry) {
      const channel = await Channel.findOne({
        'metadata.pageId': entryItem.id,
        platform: 'instagram',
        status: 'active'
      });

      if (!channel) {
        console.log('No active Instagram channel found for page:', entryItem.id);
        continue;
      }

      // Process messaging updates
      if (entryItem.messaging) {
        for (const message of entryItem.messaging) {
          await instagramConnector.handleWebhook(channel, message);
        }
      }

      // Process changes (comments, mentions, etc.)
      if (entryItem.changes) {
        for (const change of entryItem.changes) {
          await instagramConnector.handleChange(channel, change);
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Instagram webhook error:', error);
    res.sendStatus(500);
  }
});

// ============== TELEGRAM WEBHOOKS ==============

// Set Telegram webhook (internal use)
router.post('/telegram/setup', async (req: Request, res: Response) => {
  try {
    const { botToken, webhookUrl } = req.body;

    if (!botToken || !webhookUrl) {
      return res.status(400).json({
        success: false,
        error: 'botToken and webhookUrl are required'
      });
    }

    const result = await telegramConnector.setWebhook(botToken, webhookUrl);

    if (result.success) {
      // Find or create channel
      let channel = await Channel.findOne({
        'credentials.botToken': botToken,
        platform: 'telegram'
      });

      if (channel) {
        channel.webhookUrl = webhookUrl;
        channel.status = 'active';
        await channel.save();
      }

      res.json({
        success: true,
        message: 'Telegram webhook set successfully',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Telegram webhook setup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to setup Telegram webhook'
    });
  }
});

// Telegram webhook handler
router.post('/telegram', async (req: Request, res: Response) => {
  try {
    const update = req.body;

    if (!update.message && !update.callback_query && !update.edited_message) {
      return res.sendStatus(200);
    }

    // Find channel by bot token from Authorization header or update
    const authHeader = req.headers.authorization;
    let botToken = '';

    if (authHeader?.startsWith('Bot ')) {
      botToken = authHeader.substring(4);
    } else if (update.message?.bot_command) {
      // For testing, try to find by bot username
      const channel = await Channel.findOne({
        'metadata.botUsername': update.message.from.username,
        platform: 'telegram'
      });
      if (channel) {
        botToken = channel.credentials.get('botToken') || '';
      }
    }

    if (!botToken) {
      return res.sendStatus(401);
    }

    const channel = await Channel.findOne({
      'credentials.botToken': botToken,
      platform: 'telegram',
      status: 'active'
    });

    if (!channel) {
      console.log('No active Telegram channel found');
      return res.sendStatus(200);
    }

    await telegramConnector.handleWebhook(channel, update);

    res.sendStatus(200);
  } catch (error) {
    console.error('Telegram webhook error:', error);
    res.sendStatus(500);
  }
});

// ============== FACEBOOK WEBHOOKS ==============

// Facebook webhook verification
router.get('/facebook', async (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  try {
    const channel = await Channel.findOne({
      'credentials.verifyToken': token,
      platform: 'facebook'
    });

    if (!channel) {
      return res.status(403).json({ error: 'Invalid verify token' });
    }

    if (mode === 'subscribe' && token === channel.credentials.get('verifyToken')) {
      console.log('Facebook webhook verified');
      return res.send(challenge);
    }

    res.sendStatus(403);
  } catch (error) {
    console.error('Facebook webhook verification error:', error);
    res.sendStatus(500);
  }
});

// Facebook webhook handler
router.post('/facebook', async (req: Request, res: Response) => {
  try {
    const { object, entry } = req.body;

    if (object !== 'page') {
      return res.sendStatus(400);
    }

    for (const entryItem of entry) {
      const channel = await Channel.findOne({
        'metadata.pageId': entryItem.id,
        platform: 'facebook',
        status: 'active'
      });

      if (!channel) {
        console.log('No active Facebook channel found for page:', entryItem.id);
        continue;
      }

      for (const message of entryItem.messaging) {
        await facebookConnector.handleWebhook(channel, message);
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Facebook webhook error:', error);
    res.sendStatus(500);
  }
});

// ============== TWITTER WEBHOOKS ==============

// Twitter webhook CRC (Challenge Response Check)
router.get('/twitter', async (req: Request, res: Response) => {
  const crcToken = req.query.crc_token;

  if (!crcToken) {
    return res.status(400).json({ error: 'crc_token is required' });
  }

  try {
    // Find channel
    const channel = await Channel.findOne({
      platform: 'twitter',
      status: 'active'
    });

    if (!channel) {
      return res.status(404).json({ error: 'No active Twitter channel found' });
    }

    const appSecret = channel.credentials.get('appSecret');

    if (!appSecret) {
      return res.status(500).json({ error: 'App secret not configured' });
    }

    // Generate CRC response
    const crypto = await import('crypto');
    const responseToken = crypto
      .createHmac('sha256', appSecret)
      .update(crcToken)
      .digest('base64');

    res.json({
      response_token: `sha256=${responseToken}`
    });
  } catch (error) {
    console.error('Twitter CRC error:', error);
    res.status(500).json({ error: 'Failed to process CRC' });
  }
});

// Twitter webhook handler
router.post('/twitter', async (req: Request, res: Response) => {
  try {
    const { tweet_create_events, direct_message_events, follow_events } = req.body;

    const channel = await Channel.findOne({
      platform: 'twitter',
      status: 'active'
    });

    if (!channel) {
      return res.sendStatus(200);
    }

    // Process new tweets
    if (tweet_create_events && tweet_create_events.length > 0) {
      for (const tweet of tweet_create_events) {
        await handleTwitterTweet(channel, tweet);
      }
    }

    // Process direct messages
    if (direct_message_events && direct_message_events.length > 0) {
      for (const dm of direct_message_events) {
        await handleTwitterDM(channel, dm);
      }
    }

    // Process follow events
    if (follow_events && follow_events.length > 0) {
      for (const follow of follow_events) {
        await handleTwitterFollow(channel, follow);
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Twitter webhook error:', error);
    res.sendStatus(500);
  }
});

// ============== INTERNAL HANDLERS ==============

async function handleTwitterTweet(channel: any, tweet: any) {
  const senderId = tweet.user?.id_str;
  const threadId = `twitter-${channel._id}-${senderId}`;

  const message = new SocialMessage({
    platform: 'twitter',
    platformMessageId: tweet.id_str,
    senderId,
    senderName: tweet.user?.name,
    senderProfilePicture: tweet.user?.profile_image_url_https,
    channelId: channel._id,
    content: {
      type: 'text',
      text: tweet.text
    },
    threadId,
    direction: 'inbound',
    status: 'received',
    metadata: {
      platformData: {
        retweet: tweet.retweeted,
        reply: !!tweet.in_reply_to_status_id_str,
        mentions: tweet.entities?.user_mentions || []
      }
    }
  });

  await message.save();
}

async function handleTwitterDM(channel: any, dm: any) {
  const senderId = dm.message_create?.sender_id;
  const threadId = `twitter-dm-${channel._id}-${senderId}`;

  const message = new SocialMessage({
    platform: 'twitter',
    platformMessageId: dm.id,
    senderId,
    channelId: channel._id,
    content: {
      type: 'text',
      text: dm.message_create?.message_data?.text
    },
    threadId,
    direction: 'inbound',
    status: 'received',
    metadata: {
      platformData: {
        isDM: true
      }
    }
  });

  await message.save();
}

async function handleTwitterFollow(channel: any, follow: any) {
  console.log('New follower:', follow.following?.follower?.id_str);
  // Handle follow event - can trigger welcome message
}

// ============== WEBHOOK REGISTRATION ==============

// Register all webhooks for a channel
router.post('/register/:channelId', async (req: Request, res: Response) => {
  try {
    const channel = await Channel.findById(req.params.channelId);

    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found'
      });
    }

    const webhookBase = process.env.WEBHOOK_BASE_URL || 'http://localhost:4893';
    let results: Record<string, any> = {};

    switch (channel.platform) {
      case 'instagram':
        const igToken = channel.credentials.get('accessToken');
        if (igToken) {
          results.instagram = await instagramConnector.registerWebhook(
            igToken,
            `${webhookBase}/api/webhooks/instagram`
          );
        }
        break;

      case 'telegram':
        const botToken = channel.credentials.get('botToken');
        if (botToken) {
          results.telegram = await telegramConnector.setWebhook(
            botToken,
            `${webhookBase}/api/webhooks/telegram`
          );
        }
        break;

      case 'facebook':
        // Facebook uses same endpoint as Instagram for Messenger
        results.facebook = { registered: true };
        break;
    }

    if (Object.keys(results).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No credentials configured for this channel'
      });
    }

    res.json({
      success: true,
      message: 'Webhooks registered successfully',
      data: results
    });
  } catch (error) {
    console.error('Webhook registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register webhooks'
    });
  }
});

export default router;