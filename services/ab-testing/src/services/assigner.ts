import { Experiment, VariantConfig } from '../models/Experiment';

interface AssignmentResult {
  variantId: string;
  name: string;
  config: Record<string, unknown>;
  isControl: boolean;
}

// MurmurHash3 implementation for consistent hashing
function murmurhash3(key: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;

  const c1 = 0xcc9e2d51;
  const c2 = 0x1b873593;

  const bytes = new TextEncoder().encode(key);
  const len = bytes.length;
  const nblocks = Math.floor(len / 4);

  for (let i = 0; i < nblocks; i++) {
    const k1 =
      (bytes[i * 4] & 0xff) |
      ((bytes[i * 4 + 1] & 0xff) << 8) |
      ((bytes[i * 4 + 2] & 0xff) << 16) |
      ((bytes[i * 4 + 3] & 0xff) << 24);

    k1 = Math.imul(k1, c1);
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 = Math.imul(k1, c2);

    h1 ^= k1;
    h1 = (h1 << 13) | (h1 >>> 19);
    h1 = Math.imul(h1, 5) + 0xe6546b64;

    const k2 =
      (bytes[i * 4 + 4] & 0xff) |
      ((bytes[i * 4 + 5] & 0xff) << 8) |
      ((bytes[i * 4 + 6] & 0xff) << 16) |
      ((bytes[i * 4 + 7] & 0xff) << 24);

    k2 = Math.imul(k2, c1);
    k2 = (k2 << 15) | (k2 >>> 17);
    k2 = Math.imul(k2, c2);

    h2 ^= k2;
    h2 = (h2 << 13) | (h2 >>> 19);
    h2 = Math.imul(h2, 5) + 0xe6546b64;
  }

  const tail = nblocks * 4;
  let k1 = 0;
  let k2 = 0;

  switch (len & 3) {
    case 3:
      k2 ^= (bytes[tail + 2] & 0xff) << 16;
    case 2:
      k2 ^= (bytes[tail + 1] & 0xff) << 8;
    case 1:
      k2 ^= bytes[tail] & 0xff;
      k2 = Math.imul(k2, c2);
      k2 = (k2 << 15) | (k2 >>> 17);
      k2 = Math.imul(k2, c1);
      h2 ^= k2;
  }

  h1 ^= len;
  h2 ^= len;

  h1 += h2;
  h2 += h1;

  h1 = Math.imul(h1, 0x85ebca6b);
  h1 ^= h1 >>> 13;
  h1 = Math.imul(h1, 0xc2b2ae35);
  h1 ^= h1 >>> 16;

  h2 = Math.imul(h2, 0x85ebca6b);
  h2 ^= h2 >>> 13;
  h2 = Math.imul(h2, 0xc2b2ae35);
  h2 ^= h2 >>> 16;

  h1 += h2;
  h2 += h1;

  // Convert to 0-1 range
  return (h1 >>> 0) / 0xffffffff;
}

export function assignVariant(userId: string, experiment: Experiment): AssignmentResult {
  // Generate a deterministic bucket (0-100) for this user in this experiment
  const bucket = murmurhash3(`${userId}:${experiment.id}`) * 100;

  // Assign based on variant weights
  let cumulativeWeight = 0;

  for (const variant of experiment.variants) {
    cumulativeWeight += variant.weight;
    if (bucket < cumulativeWeight) {
      return {
        variantId: variant.id,
        name: variant.name,
        config: variant.config || {},
        isControl: variant.name.toLowerCase().includes('control') ||
                   variant.name.toLowerCase().includes('a') ||
                   experiment.variants.indexOf(variant) === 0,
      };
    }
  }

  // Fallback to last variant (should never reach here if weights sum to 100)
  const lastVariant = experiment.variants[experiment.variants.length - 1];
  return {
    variantId: lastVariant.id,
    name: lastVariant.name,
    config: lastVariant.config || {},
    isControl: experiment.variants.indexOf(lastVariant) === 0,
  };
}

export function getVariantById(experiment: Experiment, variantId: string): VariantConfig | undefined {
  return experiment.variants.find(v => v.id === variantId);
}

export function isUserAssigned(userId: string, experimentId: string, trafficAllocation: number): boolean {
  const bucket = murmurhash3(`${userId}:${experimentId}`) * 100;
  return bucket < trafficAllocation;
}

export function getAssignmentBucket(userId: string, experimentId: string): number {
  return Math.floor(murmurhash3(`${userId}:${experimentId}`) * 100);
}
