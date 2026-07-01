/**
 * Twitter (X) Actor - API Redirect
 *
 * DEPRECATED: This actor now redirects to the twitter-api-actor.
 * Twitter scraping is blocked by Cloudflare + Twitter's anti-bot.
 * Use twitter-api-actor with TWITTER_BEARER_TOKEN instead.
 *
 * Setup:
 * 1. Apply for Twitter Developer account: https://developer.twitter.com/
 * 2. Create an App and generate a Bearer Token
 * 3. Set TWITTER_BEARER_TOKEN environment variable
 * 4. Use twitter-api-actor instead of twitter-actor
 *
 * Note: twitter-api-actor uses the official Twitter API v2 which is
 * reliable but requires a paid plan for high-volume access.
 */

import { Actor, ActorOutput } from '@hojai/actor-runtime';

export class TwitterActor extends Actor {
  constructor() {
    super({
      id: 'twitter',
      name: 'Twitter (X) Actor [DEPRECATED - use twitter-api-actor]',
      description: 'DEPRECATED: Twitter scraping is blocked. Use twitter-api-actor with TWITTER_BEARER_TOKEN. See: https://developer.twitter.com/',
      version: '3.0.0',
      capabilities: ['deprecated', 'use_twitter_api_actor_instead'],
      rateLimit: { requests: 0, window: 0 },
    });
  }

  async scrape(input: any): Promise<ActorOutput> {
    return {
      success: false,
      error: 'DEPRECATED: Twitter scraping is blocked by Cloudflare. ' +
        'Please use twitter-api-actor with TWITTER_BEARER_TOKEN instead. ' +
        'Get a token at: https://developer.twitter.com/en/docs/authentication/oauth2-2a',
    };
  }

  async validate(_input: any): Promise<boolean> {
    return false;
  }
}

export default TwitterActor;