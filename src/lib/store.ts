/**
 * Simple JSON file store for Vercel serverless (no native modules)
 * Uses /tmp for serverless compatibility
 */
import fs from 'fs';
import crypto from 'crypto';

const STORE_DIR = '/tmp/pumpgrant';

function ensureDir() {
  if (!fs.existsSync(STORE_DIR)) {
    fs.mkdirSync(STORE_DIR, { recursive: true });
  }
}

function loadFile<T>(name: string, defaultVal: T[]): T[] {
  ensureDir();
  const p = `${STORE_DIR}/${name}.json`;
  try {
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {}
  return defaultVal;
}

function saveFile<T>(name: string, data: T[]) {
  ensureDir();
  fs.writeFileSync(`${STORE_DIR}/${name}.json`, JSON.stringify(data, null, 2));
}

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

export function getCampaigns(): Campaign[] { return loadFile('campaigns', []); }
export function saveCampaigns(c: Campaign[]) { saveFile('campaigns', c); }
export function getCampaignById(id: string): Campaign | undefined { return getCampaigns().find(c => c.id === id); }
export function getCampaignByToken(token: string): Campaign | undefined { return getCampaigns().find(c => c.token_address === token); }

export function createCampaign(data: Omit<Campaign, 'id' | 'total_fees_accumulated' | 'total_fees_claimed' | 'status' | 'created_at'>): Campaign {
  const campaigns = getCampaigns();
  const campaign: Campaign = {
    ...data,
    id: genId(),
    total_fees_accumulated: 0,
    total_fees_claimed: 0,
    status: 'active',
    created_at: new Date().toISOString(),
  };
  campaigns.push(campaign);
  saveCampaigns(campaigns);
  return campaign;
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

export function getVerifications(): Verification[] { return loadFile('verifications', []); }
export function saveVerifications(v: Verification[]) { saveFile('verifications', v); }

export function getVerificationByUser(username: string): Verification | undefined {
  return getVerifications().find(v => v.reddit_username.toLowerCase() === username.toLowerCase());
}

export function createVerification(username: string, code: string): Verification {
  const verifications = getVerifications();
  const v: Verification = {
    id: genId(),
    reddit_username: username,
    verification_code: code,
    verified: false,
    wallet_address: null,
    created_at: new Date().toISOString(),
    verified_at: null,
  };
  verifications.push(v);
  saveVerifications(verifications);
  return v;
}

export function markVerified(username: string, walletAddress?: string) {
  const verifications = getVerifications();
  const v = verifications.find(v => v.reddit_username.toLowerCase() === username.toLowerCase());
  if (v) {
    v.verified = true;
    v.verified_at = new Date().toISOString();
    if (walletAddress) v.wallet_address = walletAddress;
    saveVerifications(verifications);
  }
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

export function getClaims(): Claim[] { return loadFile('claims', []); }
export function saveClaims(c: Claim[]) { saveFile('claims', c); }

export function createClaim(data: Omit<Claim, 'id' | 'claimed_at'>): Claim {
  const claims = getClaims();
  const claim: Claim = { ...data, id: genId(), claimed_at: new Date().toISOString() };
  claims.push(claim);
  saveClaims(claims);
  return claim;
}
