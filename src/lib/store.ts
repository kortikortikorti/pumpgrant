/**
 * Upstash Redis store for Vercel serverless
 * Replaces the old /tmp JSON file store
 */
import { Redis } from '@upstash/redis';
import crypto from 'crypto';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

function genId(): string {
  return crypto.randomBytes(8).toString('hex');
}

// ── Campaigns ──
export interface Campaign {
  id: string;
  token_address: string;
  token_name: string;
  token_ticker: string;
  token_description: string;
  beneficiary_reddit: string;
  creator_wallet: string;
  creation_method: string;
  total_fees_accumulated: number;
  total_fees_claimed: number;
  status: string;
  created_at: string;
}

export async function getCampaigns(): Promise<Campaign[]> {
  const ids = await redis.smembers('campaigns');
  if (!ids || ids.length === 0) return [];
  const pipeline = redis.pipeline();
  for (const id of ids) {
    pipeline.get(`campaign:${id}`);
  }
  const results = await pipeline.exec();
  return results.filter(Boolean) as Campaign[];
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  const data = await redis.get<Campaign>(`campaign:${id}`);
  return data || null;
}

export async function getCampaignByToken(token: string): Promise<Campaign | null> {
  const id = await redis.get<string>(`campaign_by_token:${token}`);
  if (!id) return null;
  return getCampaignById(id);
}

export async function getCampaignsByReddit(username: string): Promise<Campaign[]> {
  const ids = await redis.smembers(`campaign_by_reddit:${username.toLowerCase()}`);
  if (!ids || ids.length === 0) return [];
  const pipeline = redis.pipeline();
  for (const id of ids) {
    pipeline.get(`campaign:${id}`);
  }
  const results = await pipeline.exec();
  return results.filter(Boolean) as Campaign[];
}

export async function createCampaign(
  data: Omit<Campaign, 'id' | 'total_fees_accumulated' | 'total_fees_claimed' | 'status' | 'created_at'>
): Promise<Campaign> {
  const id = genId();
  const campaign: Campaign = {
    ...data,
    id,
    total_fees_accumulated: 0,
    total_fees_claimed: 0,
    status: 'pending',
    created_at: new Date().toISOString(),
  };
  const pipeline = redis.pipeline();
  pipeline.set(`campaign:${id}`, campaign);
  pipeline.sadd('campaigns', id);
  pipeline.set(`campaign_by_token:${data.token_address}`, id);
  pipeline.sadd(`campaign_by_reddit:${data.beneficiary_reddit.toLowerCase()}`, id);
  await pipeline.exec();
  return campaign;
}

export async function updateCampaign(campaign: Campaign): Promise<void> {
  await redis.set(`campaign:${campaign.id}`, campaign);
}

// ── Verifications ──
export interface Verification {
  id: string;
  reddit_username: string;
  verification_code: string;
  verified: boolean;
  wallet_address: string | null;
  created_at: string;
  verified_at: string | null;
}

export async function getVerificationByUser(username: string): Promise<Verification | null> {
  const data = await redis.get<Verification>(`verification:${username.toLowerCase()}`);
  return data || null;
}

export async function createVerification(username: string, code: string): Promise<Verification> {
  const v: Verification = {
    id: genId(),
    reddit_username: username,
    verification_code: code,
    verified: false,
    wallet_address: null,
    created_at: new Date().toISOString(),
    verified_at: null,
  };
  await redis.set(`verification:${username.toLowerCase()}`, v);
  return v;
}

export async function markVerified(username: string, walletAddress?: string): Promise<void> {
  const v = await getVerificationByUser(username);
  if (v) {
    v.verified = true;
    v.verified_at = new Date().toISOString();
    if (walletAddress) v.wallet_address = walletAddress;
    const pipeline = redis.pipeline();
    pipeline.set(`verification:${username.toLowerCase()}`, v);
    if (walletAddress) {
      pipeline.set(`wallet_to_reddit:${walletAddress}`, username.toLowerCase());
    }
    await pipeline.exec();
  }
}

export async function getVerificationByWallet(walletAddress: string): Promise<{ verified: boolean; reddit_username: string | null }> {
  const username = await redis.get<string>(`wallet_to_reddit:${walletAddress}`);
  if (!username) return { verified: false, reddit_username: null };
  const v = await getVerificationByUser(username);
  if (v && v.verified) {
    return { verified: true, reddit_username: v.reddit_username };
  }
  return { verified: false, reddit_username: null };
}

// ── Claims ──
export interface Claim {
  id: string;
  campaign_id: string;
  reddit_username: string;
  wallet_address: string;
  amount_sol: number;
  tx_signature: string | null;
  claimed_at: string;
}

export async function getClaims(): Promise<Claim[]> {
  // Get all campaign IDs, then get claims for each
  const campaignIds = await redis.smembers('campaigns');
  if (!campaignIds || campaignIds.length === 0) return [];
  const allClaimIds: string[] = [];
  for (const cid of campaignIds) {
    const claimIds = await redis.smembers(`claims_by_campaign:${cid}`);
    if (claimIds) allClaimIds.push(...claimIds);
  }
  if (allClaimIds.length === 0) return [];
  const pipeline = redis.pipeline();
  for (const id of allClaimIds) {
    pipeline.get(`claim:${id}`);
  }
  const results = await pipeline.exec();
  return results.filter(Boolean) as Claim[];
}

export async function getClaimsByCampaign(campaignId: string): Promise<Claim[]> {
  const ids = await redis.smembers(`claims_by_campaign:${campaignId}`);
  if (!ids || ids.length === 0) return [];
  const pipeline = redis.pipeline();
  for (const id of ids) {
    pipeline.get(`claim:${id}`);
  }
  const results = await pipeline.exec();
  return results.filter(Boolean) as Claim[];
}

export async function createClaim(data: Omit<Claim, 'id' | 'claimed_at'>): Promise<Claim> {
  const id = genId();
  const claim: Claim = { ...data, id, claimed_at: new Date().toISOString() };
  const pipeline = redis.pipeline();
  pipeline.set(`claim:${id}`, claim);
  pipeline.sadd(`claims_by_campaign:${data.campaign_id}`, id);
  await pipeline.exec();
  return claim;
}
