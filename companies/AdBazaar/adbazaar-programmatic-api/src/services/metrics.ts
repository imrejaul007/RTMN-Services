/**
 * Metrics Service
 */

import client from 'prom-client';

const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const bidRequestsTotal = new client.Counter({
  name: 'programmatic_bid_requests_total',
  help: 'Total bid requests',
  labelNames: ['has_screen', 'has_audience'],
  registers: [register],
});

export const bidResponsesTotal = new client.Counter({
  name: 'programmatic_bid_responses_total',
  help: 'Total bid responses',
  labelNames: ['status'],
  registers: [register],
});

export const auctionWinsTotal = new client.Counter({
  name: 'programmatic_auction_wins_total',
  help: 'Total auction wins',
  registers: [register],
});

export const auctionValueTotal = new client.Counter({
  name: 'programmatic_auction_value_total',
  help: 'Total auction value',
  registers: [register],
});

export const bidRequestDuration = new client.Histogram({
  name: 'programmatic_bid_request_duration_ms',
  help: 'Bid request processing time',
  buckets: [5, 10, 25, 50, 100, 250, 500],
  registers: [register],
});

export const winningPriceHistogram = new client.Histogram({
  name: 'programmatic_winning_price',
  help: 'Winning bid prices',
  buckets: [0.5, 1, 2, 5, 10, 20, 50, 100],
  registers: [register],
});

export function recordBidRequest(data: {
  hasScreen: boolean;
  hasAudience: boolean;
  duration: number;
}): void {
  bidRequestsTotal.inc({
    has_screen: String(data.hasScreen),
    has_audience: String(data.hasAudience),
  });
  bidRequestDuration.observe(data.duration);
}

export function recordBidResponse(status: string): void {
  bidResponsesTotal.inc({ status });
}

export function recordAuctionWin(data: {
  winningPrice: number;
  bidderCount: number;
}): void {
  auctionWinsTotal.inc();
  auctionValueTotal.inc(data.winningPrice);
  winningPriceHistogram.observe(data.winningPrice);
}

export { register };
