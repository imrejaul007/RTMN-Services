/**
 * Social Media Verification Service
 *
 * Verifies social media accounts and scrapes profiles
 * - Facebook, Instagram, LinkedIn, Twitter, YouTube
 * - Profile data: followers, posts, verification status
 * - Cross-platform identity matching
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import type { SocialProfile, SocialPlatform, VerifiedSocialMedia } from '../models/types.js';

export class SocialVerificationService {
  private axiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
  }

  /**
   * Verify a social media profile
   */
  async verifyProfile(platform: SocialPlatform, profileUrl: string): Promise<SocialProfile | null> {
    try {
      switch (platform) {
        case 'linkedin':
          return await this.verifyLinkedIn(profileUrl);
        case 'twitter':
          return await this.verifyTwitter(profileUrl);
        case 'facebook':
          return await this.verifyFacebook(profileUrl);
        case 'instagram':
          return await this.verifyInstagram(profileUrl);
        case 'youtube':
          return await this.verifyYouTube(profileUrl);
        default:
          return null;
      }
    } catch (error) {
      console.error(`Social verification failed for ${platform}:`, error);
      return null;
    }
  }

  /**
   * Verify LinkedIn profile
   */
  private async verifyLinkedIn(url: string): Promise<SocialProfile | null> {
    try {
      const response = await this.axiosInstance.get(url);
      const $ = cheerio.load(response.data);

      // Extract profile data
      const profileText = response.data;

      // Try to extract follower count from the page
      let followers: number | undefined;
      const followerMatch = profileText.match(/([\d,]+)\s*(?:followers?|connections)/i);
      if (followerMatch) {
        followers = parseInt(followerMatch[1].replace(/,/g, ''));
      }

      // Check for verified badge
      const isVerified = profileText.includes('verified') || profileText.includes('Premium');

      // Extract name
      const nameMatch = profileText.match(/"@type"\s*:\s*"Person"[\s\S]*?"name"\s*:\s*"([^"]+)"/);
      const displayName = nameMatch?.[1];

      // Extract handle
      const handleMatch = url.match(/linkedin\.com\/in\/([^/?]+)/);
      const handle = handleMatch?.[1] || '';

      return {
        platform: 'linkedin',
        url,
        handle,
        displayName: displayName || handle,
        followers,
        verified: isVerified,
        verifiedAt: new Date().toISOString(),
        verificationMethod: 'scraped',
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      console.error('LinkedIn verification failed:', error);
      return null;
    }
  }

  /**
   * Verify Twitter/X profile
   */
  private async verifyTwitter(url: string): Promise<SocialProfile | null> {
    try {
      // Handle both twitter.com and x.com URLs
      const normalizedUrl = url.replace('x.com', 'twitter.com');
      const response = await this.axiosInstance.get(normalizedUrl);
      const $ = cheerio.load(response.data);

      // Extract from meta tags
      const ogTitle = $('meta[property="og:title"]').attr('content') || '';
      const description = $('meta[property="og:description"]').attr('content') || '';
      const image = $('meta[property="og:image"]').attr('content');

      // Extract follower count from description
      const followerMatch = description.match(/([\d,]+)\s*(?:followers?|FOLLOWERS?)/i);
      const followers = followerMatch ? parseInt(followerMatch[1].replace(/,/g, '')) : undefined;

      // Check for verified badge
      const isVerified = response.data.includes('verified') ||
        $('[data-testid="UserAvatar"]').length > 0;

      // Extract handle
      const handleMatch = normalizedUrl.match(/twitter\.com\/([^/?]+)/);
      const handle = handleMatch?.[1] || '';

      return {
        platform: 'twitter',
        url: normalizedUrl,
        handle,
        displayName: ogTitle.split('(')[0]?.trim() || handle,
        followers,
        verified: isVerified,
        verifiedAt: new Date().toISOString(),
        verificationMethod: 'scraped',
        profilePicture: image,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      console.error('Twitter verification failed:', error);
      return null;
    }
  }

  /**
   * Verify Facebook profile/page
   */
  private async verifyFacebook(url: string): Promise<SocialProfile | null> {
    try {
      const response = await this.axiosInstance.get(url);
      const $ = cheerio.load(response.data);

      // Extract name
      const name = $('title').text().trim() ||
        $('h1').first().text().trim() ||
        $('[data-testid="pageTitle"]').text().trim() || '';

      // Extract stats from meta
      const description = $('meta[name="description"]').attr('content') || '';

      // Check for verified
      const isVerified = response.data.includes('verified') ||
        $('[class*="verified"]').length > 0;

      // Extract handle
      const handleMatch = url.match(/facebook\.com\/([^/?]+)/);
      const handle = handleMatch?.[1] || '';

      // Try to extract likes/followers from meta
      const likesMatch = description.match(/([\d,]+)\s*(?:likes?|followers?)/i);
      const followers = likesMatch ? parseInt(likesMatch[1].replace(/,/g, '')) : undefined;

      return {
        platform: 'facebook',
        url,
        handle,
        displayName: name || handle,
        followers,
        verified: isVerified,
        verifiedAt: new Date().toISOString(),
        verificationMethod: 'scraped',
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      console.error('Facebook verification failed:', error);
      return null;
    }
  }

  /**
   * Verify Instagram profile
   */
  private async verifyInstagram(url: string): Promise<SocialProfile | null> {
    try {
      const response = await this.axiosInstance.get(url);
      const $ = cheerio.load(response.data);

      // Instagram has strong anti-scraping, try meta tags
      const ogTitle = $('meta[property="og:title"]').attr('content') || '';
      const description = $('meta[property="og:description"]').attr('content') || '';

      // Check for verified
      const isVerified = response.data.includes('is_verified":true') ||
        ogTitle.includes('✓');

      // Extract handle
      const handleMatch = url.match(/instagram\.com\/([^/?]+)/);
      const handle = handleMatch?.[1] || '';

      // Try to extract followers from description
      const followersMatch = description.match(/([\d,.]+[KM]?)\s*(?:followers?|Followers?)/i);
      let followers: number | undefined;
      if (followersMatch) {
        const num = followersMatch[1];
        if (num.includes('K')) {
          followers = parseFloat(num) * 1000;
        } else if (num.includes('M')) {
          followers = parseFloat(num) * 1000000;
        } else {
          followers = parseInt(num.replace(/,/g, ''));
        }
      }

      return {
        platform: 'instagram',
        url,
        handle,
        displayName: ogTitle.replace('@', '').split('(')[0]?.trim() || handle,
        followers,
        verified: isVerified,
        verifiedAt: new Date().toISOString(),
        verificationMethod: 'scraped',
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      console.error('Instagram verification failed:', error);
      return null;
    }
  }

  /**
   * Verify YouTube channel
   */
  private async verifyYouTube(url: string): Promise<SocialProfile | null> {
    try {
      const response = await this.axiosInstance.get(url);
      const $ = cheerio.load(response.data);

      // Extract channel name
      const channelName = $('meta[property="og:title"]').attr('content') ||
        $('title').text().replace(' - YouTube', '').trim() || '';

      // Extract subscriber count
      const subscriberMatch = response.data.match(/"subscriberCountText"\s*:\s*"([^"]+)"/);
      let followers: number | undefined;
      if (subscriberMatch) {
        const text = subscriberMatch[1];
        const numMatch = text.match(/([\d,.]+[KM]?)/i);
        if (numMatch) {
          const num = numMatch[1];
          if (num.includes('K')) {
            followers = parseFloat(num) * 1000;
          } else if (num.includes('M')) {
            followers = parseFloat(num) * 1000000;
          } else {
            followers = parseInt(num.replace(/,/g, ''));
          }
        }
      }

      // Check for verified badge
      const isVerified = response.data.includes('verified') ||
        $('[class*="verified-badge"]').length > 0;

      // Extract video count
      const videoMatch = response.data.match(/"videoCount"\s*:\s*"([^"]+)"/);
      const posts = videoMatch ? parseInt(videoMatch[1]) : undefined;

      // Extract handle
      const handleMatch = url.match(/youtube\.com\/(@[^/?]+)/) || url.match(/youtube\.com\/([^/?]+)/);
      const handle = handleMatch?.[1]?.replace('@', '') || '';

      return {
        platform: 'youtube',
        url,
        handle,
        displayName: channelName,
        followers,
        posts,
        verified: isVerified,
        verifiedAt: new Date().toISOString(),
        verificationMethod: 'scraped',
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      console.error('YouTube verification failed:', error);
      return null;
    }
  }

  /**
   * Scrape social profiles from a website
   */
  async scrapeFromWebsite(websiteUrl: string): Promise<SocialProfile[]> {
    try {
      const response = await this.axiosInstance.get(websiteUrl);
      const $ = cheerio.load(response.data);

      const profiles: SocialProfile[] = [];

      // Find all social links
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';

        // LinkedIn
        if (href.includes('linkedin.com/in/') || href.includes('linkedin.com/company/')) {
          const handleMatch = href.match(/linkedin\.com\/[^/]+\/([^/?]+)/);
          profiles.push({
            platform: 'linkedin',
            url: href.startsWith('http') ? href : `https://${href}`,
            handle: handleMatch?.[1] || '',
            verified: false,
            verificationMethod: 'scraped',
            lastChecked: new Date().toISOString()
          });
        }

        // Twitter/X
        if (href.includes('twitter.com/') || href.includes('x.com/')) {
          const normalizedUrl = href.replace('x.com', 'twitter.com');
          const handleMatch = normalizedUrl.match(/twitter\.com\/([^/?]+)/);
          profiles.push({
            platform: 'twitter',
            url: normalizedUrl.startsWith('http') ? normalizedUrl : `https://${normalizedUrl}`,
            handle: handleMatch?.[1] || '',
            verified: false,
            verificationMethod: 'scraped',
            lastChecked: new Date().toISOString()
          });
        }

        // Facebook
        if (href.includes('facebook.com/')) {
          const handleMatch = href.match(/facebook\.com\/([^/?]+)/);
          profiles.push({
            platform: 'facebook',
            url: href.startsWith('http') ? href : `https://${href}`,
            handle: handleMatch?.[1] || '',
            verified: false,
            verificationMethod: 'scraped',
            lastChecked: new Date().toISOString()
          });
        }

        // Instagram
        if (href.includes('instagram.com/')) {
          const handleMatch = href.match(/instagram\.com\/([^/?]+)/);
          profiles.push({
            platform: 'instagram',
            url: href.startsWith('http') ? href : `https://${href}`,
            handle: handleMatch?.[1] || '',
            verified: false,
            verificationMethod: 'scraped',
            lastChecked: new Date().toISOString()
          });
        }

        // YouTube
        if (href.includes('youtube.com/')) {
          const handleMatch = href.match(/youtube\.com\/(@[^/?]+)/) || href.match(/youtube\.com\/([^/?]+)/);
          profiles.push({
            platform: 'youtube',
            url: href.startsWith('http') ? href : `https://${href}`,
            handle: handleMatch?.[1]?.replace('@', '') || '',
            verified: false,
            verificationMethod: 'scraped',
            lastChecked: new Date().toISOString()
          });
        }
      });

      // Deduplicate by platform
      const uniqueByPlatform = new Map<string, SocialProfile>();
      for (const profile of profiles) {
        if (!uniqueByPlatform.has(profile.platform)) {
          uniqueByPlatform.set(profile.platform, profile);
        }
      }

      return Array.from(uniqueByPlatform.values());
    } catch (error) {
      console.error('Social scrape from website failed:', error);
      return [];
    }
  }

  /**
   * Search for social profiles by name
   */
  async searchProfiles(businessName: string): Promise<SocialProfile[]> {
    const profiles: SocialProfile[] = [];

    // Search each platform
    const searchUrls = [
      { platform: 'linkedin' as SocialPlatform, url: `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(businessName)}` },
      { platform: 'facebook' as SocialPlatform, url: `https://www.facebook.com/search/top?q=${encodeURIComponent(businessName)}` },
      { platform: 'twitter' as SocialPlatform, url: `https://twitter.com/search?q=${encodeURIComponent(businessName)}` }
    ];

    for (const { platform, url } of searchUrls) {
      try {
        const response = await this.axiosInstance.head(url, { timeout: 10000 });
        if (response.status === 200 || response.status === 301 || response.status === 302) {
          profiles.push({
            platform,
            url,
            handle: businessName.replace(/\s+/g, ''),
            verified: false,
            verificationMethod: 'scraped',
            lastChecked: new Date().toISOString()
          });
        }
      } catch {
        // Profile might not exist
      }
    }

    return profiles;
  }

  /**
   * Verify multiple profiles for a user
   */
  async verifyAllProfiles(profiles: SocialProfile[]): Promise<SocialProfile[]> {
    const verified: SocialProfile[] = [];

    for (const profile of profiles) {
      const verifiedProfile = await this.verifyProfile(profile.platform, profile.url);
      if (verifiedProfile) {
        verified.push(verifiedProfile);
      } else {
        // Keep original with updated lastChecked
        verified.push({
          ...profile,
          lastChecked: new Date().toISOString()
        });
      }
    }

    return verified;
  }

  /**
   * Calculate verification score based on social presence
   */
  calculateVerificationScore(profiles: SocialProfile[]): number {
    if (profiles.length === 0) return 0;

    let score = 0;

    // Each platform adds points
    const platformScores: Record<SocialPlatform, number> = {
      linkedin: 25,  // Professional - high value
      instagram: 15,
      facebook: 15,
      twitter: 15,
      youtube: 15,
      pinterest: 10,
      tiktok: 10
    };

    for (const profile of profiles) {
      score += platformScores[profile.platform] || 10;

      // Verified accounts get bonus
      if (profile.verified) {
        score += 10;
      }

      // High follower count bonus
      if (profile.followers && profile.followers > 10000) {
        score += 5;
      }
      if (profile.followers && profile.followers > 100000) {
        score += 10;
      }
    }

    // Normalize to 0-100
    return Math.min(score, 100);
  }

  /**
   * Get total followers across all platforms
   */
  getTotalFollowers(profiles: SocialProfile[]): number {
    return profiles.reduce((sum, p) => sum + (p.followers || 0), 0);
  }
}

export const socialVerificationService = new SocialVerificationService();