import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const DATA_DIR = '/tmp';

/**
 * Sentiment keywords for auto-analysis
 */
const POSITIVE_KEYWORDS = [
  'excellent', 'amazing', 'great', 'fantastic', 'wonderful', 'love', 'perfect',
  'best', 'awesome', 'outstanding', 'superb', 'brilliant', 'good', 'nice',
  'happy', 'satisfied', 'recommend', 'quality', 'fast', 'easy', 'helpful',
  'beautiful', 'comfortable', 'durable', 'reliable', 'exceptional', 'impressed',
  'delighted', 'pleased', 'exceptional', 'incredible', 'marvelous', 'terrific'
];

const NEGATIVE_KEYWORDS = [
  'terrible', 'awful', 'horrible', 'bad', 'worst', 'poor', 'disappointed',
  'waste', 'broken', 'defective', 'useless', 'hate', 'annoying', 'slow',
  'difficult', 'complicated', 'frustrating', 'angry', 'unhappy', 'regret',
  'avoid', 'scam', 'fake', 'damaged', 'cheap', 'flimsy', 'unreliable',
  'problem', 'issue', 'fault', 'fail', 'error', 'wrong', 'returned', 'refund'
];

/**
 * Analyze sentiment based on review text
 */
export function analyzeSentiment(text) {
  if (!text) return 'neutral';

  const lowerText = text.toLowerCase();
  let positiveScore = 0;
  let negativeScore = 0;

  for (const keyword of POSITIVE_KEYWORDS) {
    if (lowerText.includes(keyword)) positiveScore++;
  }

  for (const keyword of NEGATIVE_KEYWORDS) {
    if (lowerText.includes(keyword)) negativeScore++;
  }

  if (positiveScore > negativeScore) return 'positive';
  if (negativeScore > positiveScore) return 'negative';
  return 'neutral';
}

/**
 * Get storage file path for a company
 */
function getStoragePath(companyId) {
  return path.join(DATA_DIR, `siteos-reviews-${companyId}.json`);
}

/**
 * Load reviews from storage
 */
async function loadReviews(companyId) {
  const filePath = getStoragePath(companyId);

  if (!existsSync(filePath)) {
    return [];
  }

  try {
    const data = await readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading reviews for ${companyId}:`, error);
    return [];
  }
}

/**
 * Save reviews to storage
 */
async function saveReviews(companyId, reviews) {
  const filePath = getStoragePath(companyId);

  try {
    // Ensure directory exists
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(filePath, JSON.stringify(reviews, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error(`Error saving reviews for ${companyId}:`, error);
    throw new Error('Failed to save reviews');
  }
}

/**
 * Create a new review
 */
export async function createReview(data) {
  const reviews = await loadReviews(data.companyId);

  const review = {
    reviewId: uuidv4(),
    companyId: data.companyId,
    productId: data.productId,
    orderId: data.orderId,
    customerId: data.customerId,
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    rating: data.rating,
    title: data.title || '',
    content: data.content || '',
    images: data.images || [],
    verified: data.verified || false,
    helpful: 0,
    status: 'pending',
    ownerResponse: null,
    ownerResponseAt: null,
    sentiment: analyzeSentiment(`${data.title} ${data.content}`),
    source: data.source || 'website',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  reviews.push(review);
  await saveReviews(data.companyId, reviews);

  return review;
}

/**
 * Get review by ID
 */
export async function getReviewById(companyId, reviewId) {
  const reviews = await loadReviews(companyId);
  return reviews.find(r => r.reviewId === reviewId) || null;
}

/**
 * Get reviews for a product
 */
export async function getReviewsByProduct(companyId, productId, status = 'approved') {
  const reviews = await loadReviews(companyId);

  let filtered = reviews.filter(r => r.productId === productId);

  if (status) {
    filtered = filtered.filter(r => r.status === status);
  }

  return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Get reviews by customer
 */
export async function getReviewsByCustomer(companyId, customerId) {
  const reviews = await loadReviews(companyId);
  return reviews
    .filter(r => r.customerId === customerId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Update a review
 */
export async function updateReview(companyId, reviewId, updates) {
  const reviews = await loadReviews(companyId);
  const index = reviews.findIndex(r => r.reviewId === reviewId);

  if (index === -1) {
    return null;
  }

  const allowedUpdates = ['rating', 'title', 'content', 'images'];
  const review = reviews[index];

  for (const key of allowedUpdates) {
    if (updates[key] !== undefined) {
      review[key] = updates[key];
    }
  }

  // Re-analyze sentiment if content changed
  if (updates.title !== undefined || updates.content !== undefined) {
    review.sentiment = analyzeSentiment(`${review.title} ${review.content}`);
  }

  review.updatedAt = new Date().toISOString();
  reviews[index] = review;
  await saveReviews(companyId, reviews);

  return review;
}

/**
 * Moderate a review (approve/reject)
 */
export async function moderateReview(companyId, reviewId, decision, moderatorNotes = null) {
  const reviews = await loadReviews(companyId);
  const index = reviews.findIndex(r => r.reviewId === reviewId);

  if (index === -1) {
    return null;
  }

  const review = reviews[index];

  if (decision !== 'approved' && decision !== 'rejected') {
    throw new Error('Decision must be "approved" or "rejected"');
  }

  review.status = decision;
  review.moderatorNotes = moderatorNotes;
  review.updatedAt = new Date().toISOString();

  reviews[index] = review;
  await saveReviews(companyId, reviews);

  return review;
}

/**
 * Delete a review
 */
export async function deleteReview(companyId, reviewId) {
  const reviews = await loadReviews(companyId);
  const index = reviews.findIndex(r => r.reviewId === reviewId);

  if (index === -1) {
    return false;
  }

  reviews.splice(index, 1);
  await saveReviews(companyId, reviews);

  return true;
}

/**
 * Add owner response to review
 */
export async function addOwnerResponse(companyId, reviewId, response) {
  const reviews = await loadReviews(companyId);
  const index = reviews.findIndex(r => r.reviewId === reviewId);

  if (index === -1) {
    return null;
  }

  const review = reviews[index];
  review.ownerResponse = response;
  review.ownerResponseAt = new Date().toISOString();
  review.updatedAt = new Date().toISOString();

  reviews[index] = review;
  await saveReviews(companyId, reviews);

  return review;
}

/**
 * Increment helpful count
 */
export async function incrementHelpful(companyId, reviewId) {
  const reviews = await loadReviews(companyId);
  const index = reviews.findIndex(r => r.reviewId === reviewId);

  if (index === -1) {
    return null;
  }

  reviews[index].helpful = (reviews[index].helpful || 0) + 1;
  reviews[index].updatedAt = new Date().toISOString();

  await saveReviews(companyId, reviews);

  return reviews[index];
}

/**
 * Get review statistics for a company
 */
export async function getReviewStats(companyId, productId = null) {
  const reviews = await loadReviews(companyId);

  let targetReviews = reviews;

  if (productId) {
    targetReviews = reviews.filter(r => r.productId === productId);
  }

  const approvedReviews = targetReviews.filter(r => r.status === 'approved');

  // Rating distribution
  const ratingDistribution = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0
  };

  for (const review of approvedReviews) {
    if (ratingDistribution[review.rating] !== undefined) {
      ratingDistribution[review.rating]++;
    }
  }

  // Average rating
  const avgRating = approvedReviews.length > 0
    ? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length
    : 0;

  // Sentiment distribution
  const sentimentDistribution = {
    positive: 0,
    neutral: 0,
    negative: 0
  };

  for (const review of approvedReviews) {
    if (sentimentDistribution[review.sentiment] !== undefined) {
      sentimentDistribution[review.sentiment]++;
    }
  }

  return {
    total: targetReviews.length,
    approved: approvedReviews.length,
    pending: targetReviews.filter(r => r.status === 'pending').length,
    rejected: targetReviews.filter(r => r.status === 'rejected').length,
    verified: approvedReviews.filter(r => r.verified).length,
    averageRating: Math.round(avgRating * 10) / 10,
    ratingDistribution,
    sentimentDistribution,
    totalHelpful: approvedReviews.reduce((sum, r) => sum + (r.helpful || 0), 0),
    withImages: approvedReviews.filter(r => r.images && r.images.length > 0).length,
    withOwnerResponse: approvedReviews.filter(r => r.ownerResponse).length
  };
}

/**
 * Create a review request (for scheduling)
 */
export async function createReviewRequest(data) {
  const { companyId, customerId, customerEmail, customerName, productId, orderId } = data;

  // In production, this would integrate with email/WhatsApp services
  // For now, we create a pending request record
  return {
    requestId: uuidv4(),
    companyId,
    customerId,
    customerEmail,
    customerName,
    productId,
    orderId,
    channel: data.channel || 'email', // 'email' | 'whatsapp'
    scheduledFor: data.scheduledFor || new Date().toISOString(),
    sentAt: null,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
}

/**
 * Get pending review requests
 */
export async function getPendingRequests(companyId) {
  const filePath = getStoragePath(companyId);
  const requestFilePath = path.join(DATA_DIR, `siteos-review-requests-${companyId}.json`);

  if (!existsSync(requestFilePath)) {
    return [];
  }

  try {
    const data = await readFile(requestFilePath, 'utf-8');
    const requests = JSON.parse(data);
    return requests.filter(r => r.status === 'pending');
  } catch (error) {
    console.error(`Error loading review requests for ${companyId}:`, error);
    return [];
  }
}

/**
 * Save review request
 */
export async function saveReviewRequest(request) {
  const requestFilePath = path.join(DATA_DIR, `siteos-review-requests-${request.companyId}.json`);

  try {
    let requests = [];

    if (existsSync(requestFilePath)) {
      const data = await readFile(requestFilePath, 'utf-8');
      requests = JSON.parse(data);
    }

    requests.push(request);
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(requestFilePath, JSON.stringify(requests, null, 2), 'utf-8');

    return request;
  } catch (error) {
    console.error('Error saving review request:', error);
    throw new Error('Failed to save review request');
  }
}
