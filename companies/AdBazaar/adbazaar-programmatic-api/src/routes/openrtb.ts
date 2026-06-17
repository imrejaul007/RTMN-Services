/**
 * OpenRTB Routes
 *
 * OpenRTB 2.5 compliant endpoints for DOOH advertising
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import axios from 'axios';
import { config } from '../config/index.js';
import { storeAuction, getAuction, incrementCounter } from '../config/redis.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { recordBidRequest, recordBidResponse, recordAuctionWin } from '../services/metrics.js';

const router = Router();

// ============================================================================
// OPENRTB TYPES (simplified)
// ============================================================================

interface OpenRTBBidRequest {
  id: string;                    // Unique ID
  imp: OpenRTBImp[];             // impressions
  device?: OpenRTBDevice;
  user?: OpenRTBUser;
  geo?: OpenRTBGeo;
  site?: OpenRTBSite;
  tmax?: number;                // Max time in ms
  test?: number;
  at?: number;                  // Auction type (1=first price, 2=second price)
  allimps?: number;
  cur?: string[];               // Allowed currencies
  wseat?: string[];             // Allowed seats
  bcat?: string[];              // Blocked categories
  badv?: string[];              // Blocked advertisers
  ext?: Record<string, unknown>;
}

interface OpenRTBImp {
  id: string;
  displaymanager?: string;
  displaymanagerver?: string;
  instl?: number;
  tagid?: string;              // Screen ID / placement
  bidfloor?: number;
  bidfloorcur?: string;
  iframebuster?: string[];
  metric?: OpenRTBMetric[];
  ext?: {
    screen?: {
      id?: string;
      type?: string;
      width?: number;
      height?: number;
    };
    audience?: {
      ageGroups?: string[];
      gender?: string;
      interests?: string[];
    };
    context?: {
      type?: string;           // transit, airport, retail, etc.
      location?: {
        city?: string;
        area?: string;
        lat?: number;
        lng?: number;
      };
    };
  };
}

interface OpenRTBDevice {
  ua?: string;
  dnt?: number;
  lmt?: number;
  ip?: string;
  ipv6?: string;
  devicetype?: number;
  make?: string;
  model?: string;
  os?: string;
  osv?: string;
  hwv?: string;
  h?: number;
  w?: number;
  ppi?: number;
  pxratio?: number;
  js?: number;
  geofetch?: number;
  gps?: { lat: number; lon: number };
}

interface OpenRTBUser {
  id?: string;
  buyeruid?: string;
  yob?: number;
  gender?: string;
  keywords?: string;
  consent?: string;
}

interface OpenRTBGeo {
  lat?: number;
  lon?: number;
  type?: number;
  country?: string;
  region?: string;
  regionfips104?: string;
  metro?: string;
  city?: string;
  zip?: string;
  utc_offset?: number;
  ext?: Record<string, unknown>;
}

interface OpenRTBSite {
  id?: string;
  name?: string;
  domain?: string;
  cat?: string[];
  sectioncat?: string[];
  pagecat?: string[];
  page?: string;
  ref?: string;
  search?: string;
  mobile?: number;
  privacypolicy?: number;
  pub?: string;
  ext?: Record<string, unknown>;
}

interface OpenRTBBidResponse {
  id: string;
  bidid?: string;
  cur?: string;
  nbr?: number;               // No bid reason
  seatbid?: OpenRTBSeatBid[];
  ext?: Record<string, unknown>;
}

interface OpenRTBSeatBid {
  seat?: string;
  bid: OpenRTBBid[];
  group?: number;
}

interface OpenRTBBid {
  id: string;
  impid: string;
  price: number;
  nurl?: string;               // Win notice URL
  burl?: string;               // Billing notice URL
  lurl?: string;              // Loss notice URL
  adm?: string;                // Ad markup
  adid?: string;
  crid?: string;
  dealid?: string;
  h?: number;
  w?: number;
  wseat?: string[];
  kat?: number;
  kavg?: number;
  exp?: number;
  iurl?: string;
  cid?: string;
  tactic?: string;
  curl?: string;
  attr?: number[];
  ext?: Record<string, unknown>;
}

interface OpenRTBMetric {
  type: string;
  value: number;
  vendor: string;
}

// ============================================================================
// BID REQUEST VALIDATION
// ============================================================================

const BidRequestSchema = z.object({
  id: z.string().min(1),
  imp: z.array(z.object({
    id: z.string().min(1),
    tagid: z.string().optional(),
    bidfloor: z.number().optional(),
    bidfloorcur: z.string().optional(),
    ext: z.object({
      screen: z.object({
        id: z.string().optional(),
        type: z.string().optional(),
      }).optional(),
      audience: z.object({
        ageGroups: z.array(z.string()).optional(),
        gender: z.string().optional(),
        interests: z.array(z.string()).optional(),
      }).optional(),
      context: z.object({
        type: z.string().optional(),
        location: z.object({
          city: z.string().optional(),
          area: z.string().optional(),
        }).optional(),
      }).optional(),
    }).optional(),
  })).min(1),
  device: z.object({
    ip: z.string().optional(),
    gps: z.object({
      lat: z.number(),
      lon: z.number(),
    }).optional(),
  }).optional(),
  user: z.object({
    id: z.string().optional(),
    gender: z.string().optional(),
    yob: z.number().optional(),
  }).optional(),
  geo: z.object({
    lat: z.number().optional(),
    lon: z.number().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  tmax: z.number().optional(),
  at: z.number().optional(),
});

// ============================================================================
// POST /openrtb/bid
// Bid Request - receives bid requests from DSPs
// ============================================================================

router.post('/bid', asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();

  // Validate request
  const validationResult = BidRequestSchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({
      success: false,
      error: 'Invalid bid request',
      details: validationResult.error.errors,
    });
    return;
  }

  const bidRequest: OpenRTBBidRequest = validationResult.data;

  // Generate response ID
  const responseId = uuidv4();

  // Get screen info from Inventory Service
  const screenId = bidRequest.imp[0]?.ext?.screen?.id || bidRequest.imp[0]?.tagid;
  let screenInfo = null;

  if (screenId) {
    try {
      const response = await axios.get(
        `${config.inventoryService.url}/api/inventory/screens/${screenId}`,
        { timeout: 1000 }
      );
      screenInfo = response.data.data;
    } catch (error) {
      logger.warn('Failed to get screen info', { screenId, error });
    }
  }

  // Get audience targeting from HOJAI AI
  let audienceSegments = null;
  try {
    const criteria: Record<string, unknown> = {};
    if (bidRequest.geo?.city) criteria.city = bidRequest.geo.city;
    if (bidRequest.user?.gender) criteria.gender = bidRequest.user.gender;
    if (bidRequest.imp[0]?.ext?.audience?.interests) {
      criteria.interests = bidRequest.imp[0].ext.audience.interests;
    }

    const response = await axios.post(
      `${config.hojaiGateway.url}/api/audience/segments`,
      { criteria },
      {
        headers: { 'X-Admin-Token': process.env.ADMIN_TOKEN || 'dev' },
        timeout: 2000,
      }
    );
    audienceSegments = response.data.data;
  } catch (error) {
    logger.warn('Failed to get audience segments', { error });
  }

  // Calculate floor price
  const floorPrice = bidRequest.imp[0]?.bidfloor ||
    screenInfo?.pricing?.cpm / 1000 ||
    config.auction.floorPrice;

  // Build response
  const bidResponse: OpenRTBBidResponse = {
    id: responseId,
    bidid: `bid_${responseId.substring(0, 8)}`,
    cur: 'INR',
    seatbid: [{
      seat: 'adbazaar',
      bid: [{
        id: `bid_${uuidv4().substring(0, 8)}`,
        impid: bidRequest.imp[0].id,
        price: floorPrice, // Will be updated by SSP
        nurl: `${config.inventoryService.url}/api/bid/win/${screenId}`,
        burl: `${config.inventoryService.url}/api/bid/bill/${screenId}`,
        adm: buildAdMarkup(screenInfo, audienceSegments),
        h: screenInfo?.specifications?.height || 1080,
        w: screenInfo?.specifications?.width || 1920,
        attr: [1], // 1 = Linear
        ext: {
          screenInfo,
          audienceSegments,
          floorPrice,
        },
      }],
    }],
  };

  // Record metrics
  const duration = Date.now() - startTime;
  recordBidRequest({
    hasScreen: !!screenInfo,
    hasAudience: !!audienceSegments,
    duration,
  });

  logger.info('Bid request processed', {
    requestId: bidRequest.id,
    responseId,
    screenId,
    floorPrice,
    duration,
  });

  res.json(bidResponse);
}));

// ============================================================================
// POST /openrtb/response
// Simplified bid response endpoint for SSP
// ============================================================================

router.post('/response', asyncHandler(async (req: Request, res: Response) => {
  const { auctionId, bids } = req.body;

  if (!auctionId || !bids?.length) {
    res.status(400).json({
      success: false,
      error: 'auctionId and bids required',
    });
    return;
  }

  // Store auction results
  await storeAuction(auctionId, {
    bids,
    timestamp: Date.now(),
    status: 'completed',
  });

  // Record win
  const winningBid = bids.reduce((best: OpenRTBBid, bid: OpenRTBBid) =>
    (bid.price > (best?.price || 0) ? bid : best), bids[0]);

  recordAuctionWin({
    winningPrice: winningBid?.price || 0,
    bidderCount: bids.length,
  });

  res.json({
    success: true,
    auctionId,
    winningBid: winningBid?.id,
    winningPrice: winningBid?.price,
  });
}));

// ============================================================================
// POST /openrtb/seatbid
// Seat bid endpoint for multi-seat auctions
// ============================================================================

router.post('/seatbid', asyncHandler(async (req: Request, res: Response) => {
  const { seatId, bids } = req.body;

  if (!seatId || !bids?.length) {
    res.status(400).json({
      success: false,
      error: 'seatId and bids required',
    });
    return;
  }

  // Process each bid
  const results = bids.map((bid: { impid: string; price: number; creative?: string }) => {
    // Validate bid
    const isValid = bid.price >= config.auction.minBid;

    return {
      impid: bid.impid,
      accepted: isValid,
      price: isValid ? bid.price : null,
    };
  });

  res.json({
    success: true,
    seatId,
    results,
    accepted: results.filter((r: { accepted: boolean }) => r.accepted).length,
  });
}));

// ============================================================================
// GET /openrtb/categories
// Get DOOH-specific IAB categories
// ============================================================================

router.get('/categories', (_req: Request, res: Response) => {
  const categories = [
    { id: 'IAB1', name: 'Arts & Entertainment' },
    { id: 'IAB2', name: 'Automotive' },
    { id: 'IAB3', name: 'Business' },
    { id: 'IAB4', name: 'Careers' },
    { id: 'IAB5', name: 'Education' },
    { id: 'IAB6', name: 'Family & Parenting' },
    { id: 'IAB7', name: 'Health & Fitness' },
    { id: 'IAB8', name: 'Food & Drink' },
    { id: 'IAB9', name: 'Hobbies & Interests' },
    { id: 'IAB10', name: 'Home & Garden' },
    { id: 'IAB11', name: 'Law/Govment/Politics' },
    { id: 'IAB12', name: 'News' },
    { id: 'IAB13', name: 'Personal Finance' },
    { id: 'IAB14', name: 'Society' },
    { id: 'IAB15', name: 'Science' },
    { id: 'IAB16', name: 'Pets' },
    { id: 'IAB17', name: 'Sports' },
    { id: 'IAB18', name: 'Style & Fashion' },
    { id: 'IAB19', name: 'Technology' },
    { id: 'IAB20', name: 'Travel' },
    // DOOH-specific
    { id: 'DOOH1', name: 'Transit - Bus' },
    { id: 'DOOH2', name: 'Transit - Metro' },
    { id: 'DOOH3', name: 'Transit - Airport' },
    { id: 'DOOH4', name: 'Retail - Mall' },
    { id: 'DOOH5', name: 'Hospitality - Hotel' },
    { id: 'DOOH6', name: 'Office Building' },
    { id: 'DOOH7', name: 'Street Furniture' },
    { id: 'DOOH8', name: 'Billboard' },
  ];

  res.json({ success: true, data: categories });
});

// ============================================================================
// HELPERS
// ============================================================================

function buildAdMarkup(screenInfo: unknown, audienceSegments: unknown): string {
  // Return VAST/HTML markup for the ad
  return `<html>
    <head>
      <style>
        body { margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .container { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-family: Arial, sans-serif; }
        .content { text-align: center; }
        .cta { margin-top: 20px; padding: 15px 30px; background: white; color: #667eea; border-radius: 25px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="content">
          <h1>AdBazaar DOOH</h1>
          <p>Personalized Ad Content</p>
          <div class="cta">Shop Now</div>
        </div>
      </div>
    </body>
  </html>`;
}

export default router;
