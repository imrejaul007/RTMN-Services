/**
 * Amazon Actor - DEPRECATED
 *
 * DEPRECATED: This actor now redirects to the amazon-api-actor.
 * Amazon scraping is blocked by Cloudflare + anti-bot.
 * Use amazon-api-actor with AWS credentials instead.
 *
 * Setup:
 * 1. Join Amazon Associates: https://affiliate-program.amazon.com/
 * 2. Get Product Advertising API credentials: https://webservices.amazon.com/paapi5/
 * 3. Set AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY, AMAZON_ASSOCIATE_TAG
 * 4. Use amazon-api-actor instead of amazon-actor
 */

import { Actor, ActorOutput } from '@hojai/actor-runtime';

export class AmazonActor extends Actor {
  constructor() {
    super({
      id: 'amazon',
      name: 'Amazon Actor [DEPRECATED - use amazon-api-actor]',
      description: 'DEPRECATED: Amazon scraping is blocked. Use amazon-api-actor with AWS credentials. See: https://webservices.amazon.com/paapi5/',
      version: '3.0.0',
      capabilities: ['deprecated', 'use_amazon_api_actor_instead'],
      rateLimit: { requests: 0, window: 0 },
    });
  }

  async scrape(input: any): Promise<ActorOutput> {
    return {
      success: false,
      error: 'DEPRECATED: Amazon scraping is blocked by Cloudflare. ' +
        'Please use amazon-api-actor with AWS credentials instead. ' +
        'Get started at: https://webservices.amazon.com/paapi5/documentation/',
    };
  }

  async validate(_input: any): Promise<boolean> {
    return false;
  }
}

export default AmazonActor;