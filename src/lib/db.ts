import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'pumpgrant.db');

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeDb(db);
  }
  return db;
}

function initializeDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      token_address TEXT UNIQUE NOT NULL,
      token_name TEXT NOT NULL,
      token_ticker TEXT NOT NULL,
      token_description TEXT,
      token_image_url TEXT,
      beneficiary_reddit TEXT NOT NULL,
      creator_wallet TEXT NOT NULL,
      fee_vault_address TEXT NOT NULL,
      total_fees_accumulated REAL DEFAULT 0,
      total_fees_claimed REAL DEFAULT 0,
      creation_method TEXT DEFAULT 'linked',
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS beneficiary_wallets (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      reddit_username TEXT UNIQUE NOT NULL,
      wallet_address TEXT NOT NULL,
      encrypted_private_key TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS claims (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      campaign_id TEXT NOT NULL,
      reddit_username TEXT NOT NULL,
      wallet_address TEXT NOT NULL,
      amount_sol REAL NOT NULL,
      tx_signature TEXT,
      claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
    );

    CREATE TABLE IF NOT EXISTS verifications (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      reddit_username TEXT NOT NULL,
      verification_code TEXT UNIQUE NOT NULL,
      verified BOOLEAN DEFAULT FALSE,
      wallet_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      verified_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS fee_events (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      campaign_id TEXT NOT NULL,
      amount_sol REAL NOT NULL,
      tx_signature TEXT,
      event_type TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
    );
  `);

  // Add creation_method column if missing (migration for existing DBs)
  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN creation_method TEXT DEFAULT 'linked'`);
  } catch {
    // Column already exists — ignore
  }

  // Seed mock data if empty
  const count = db.prepare('SELECT COUNT(*) as c FROM campaigns').get() as { c: number };
  if (count.c === 0) {
    seedMockData(db);
  }
}

function seedMockData(db: Database.Database) {
  const campaigns = [
    {
      id: 'a1b2c3d4',
      token_address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      token_name: 'RedditGold',
      token_ticker: 'RGOLD',
      token_description: 'A token to fund u/GallowBoob for their legendary Reddit contributions',
      token_image_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=rgold',
      beneficiary_reddit: 'GallowBoob',
      creator_wallet: 'DRpbCBMxVnDK7maPGv7USsFnchhY1rkc3YprFLzJ6KDM',
      fee_vault_address: 'FEEVau1tXXXpumpgrant111111111111111111111111',
      total_fees_accumulated: 12.847,
      total_fees_claimed: 5.2,
      status: 'verified',
    },
    {
      id: 'e5f6g7h8',
      token_address: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      token_name: 'MemeKing',
      token_ticker: 'MKING',
      token_description: 'Supporting u/shittymorph with every trade',
      token_image_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=mking',
      beneficiary_reddit: 'shittymorph',
      creator_wallet: 'BKoP5rFJCm7qvR8sKkVNBz1HoKfTHkGqEP8rJhQ3Wm5L',
      fee_vault_address: 'FEEVau1tXXXpumpgrant222222222222222222222222',
      total_fees_accumulated: 34.521,
      total_fees_claimed: 12.0,
      status: 'verified',
    },
    {
      id: 'i9j0k1l2',
      token_address: '9vMJfxU1HBJhzErGA1JNS1hE8mP7fUqHQEK2y6CXBXaE',
      token_name: 'DevHelper',
      token_ticker: 'DHELP',
      token_description: 'Funding u/ThePrimeagen for amazing dev content',
      token_image_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=dhelp',
      beneficiary_reddit: 'ThePrimeagen',
      creator_wallet: 'HN7cABqLq46Es1jh92dQQisAi5YqBFMu6DyHkrdP3gLZ',
      fee_vault_address: 'FEEVau1tXXXpumpgrant333333333333333333333333',
      total_fees_accumulated: 8.134,
      total_fees_claimed: 0,
      status: 'pending',
    },
    {
      id: 'm3n4o5p6',
      token_address: '2WG6hBdZMRWxEQ7pMDqCFReadjkMTfz5SJ4HNa3TAFLP',
      token_name: 'OpenSourceFund',
      token_ticker: 'OSFND',
      token_description: 'Community funding for u/antirez — creator of Redis',
      token_image_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=osfnd',
      beneficiary_reddit: 'antirez',
      creator_wallet: 'DRpbCBMxVnDK7maPGv7USsFnchhY1rkc3YprFLzJ6KDM',
      fee_vault_address: 'FEEVau1tXXXpumpgrant444444444444444444444444',
      total_fees_accumulated: 51.992,
      total_fees_claimed: 20.5,
      status: 'verified',
    },
    {
      id: 'q7r8s9t0',
      token_address: '5KbWqFSmbjgmhDAv8JqSBYbFjoPQMCgUjmECPsHFSN2q',
      token_name: 'ArtistGrant',
      token_ticker: 'ARTGR',
      token_description: 'Supporting u/Shitty_Watercolour for years of Reddit art',
      token_image_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=artgr',
      beneficiary_reddit: 'Shitty_Watercolour',
      creator_wallet: 'BKoP5rFJCm7qvR8sKkVNBz1HoKfTHkGqEP8rJhQ3Wm5L',
      fee_vault_address: 'FEEVau1tXXXpumpgrant555555555555555555555555',
      total_fees_accumulated: 6.77,
      total_fees_claimed: 2.1,
      status: 'verified',
    },
    {
      id: 'u1v2w3x4',
      token_address: '8BnEgHoWFysVcuFFX7QztDmzuH7KN1b1V2YT3ME7Rp8r',
      token_name: 'ScienceFund',
      token_ticker: 'SCIFN',
      token_description: 'Funding u/Andromeda321 for incredible astronomy education',
      token_image_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=scifn',
      beneficiary_reddit: 'Andromeda321',
      creator_wallet: 'HN7cABqLq46Es1jh92dQQisAi5YqBFMu6DyHkrdP3gLZ',
      fee_vault_address: 'FEEVau1tXXXpumpgrant666666666666666666666666',
      total_fees_accumulated: 19.305,
      total_fees_claimed: 7.8,
      status: 'verified',
    },
  ];

  const insertCampaign = db.prepare(`
    INSERT INTO campaigns (id, token_address, token_name, token_ticker, token_description, token_image_url, beneficiary_reddit, creator_wallet, fee_vault_address, total_fees_accumulated, total_fees_claimed, status)
    VALUES (@id, @token_address, @token_name, @token_ticker, @token_description, @token_image_url, @beneficiary_reddit, @creator_wallet, @fee_vault_address, @total_fees_accumulated, @total_fees_claimed, @status)
  `);

  const insertFeeEvent = db.prepare(`
    INSERT INTO fee_events (id, campaign_id, amount_sol, tx_signature, event_type)
    VALUES (@id, @campaign_id, @amount_sol, @tx_signature, @event_type)
  `);

  const insertClaim = db.prepare(`
    INSERT INTO claims (id, campaign_id, reddit_username, wallet_address, amount_sol, tx_signature)
    VALUES (@id, @campaign_id, @reddit_username, @wallet_address, @amount_sol, @tx_signature)
  `);

  const transaction = db.transaction(() => {
    for (const c of campaigns) {
      insertCampaign.run(c);
    }

    // Mock fee events
    const feeEvents = [
      { id: 'fe001', campaign_id: 'a1b2c3d4', amount_sol: 0.523, tx_signature: '5KtR...mock1', event_type: 'trade_fee' },
      { id: 'fe002', campaign_id: 'a1b2c3d4', amount_sol: 1.201, tx_signature: '3xPq...mock2', event_type: 'trade_fee' },
      { id: 'fe003', campaign_id: 'a1b2c3d4', amount_sol: 0.847, tx_signature: '9mVn...mock3', event_type: 'trade_fee' },
      { id: 'fe004', campaign_id: 'e5f6g7h8', amount_sol: 2.100, tx_signature: '7hBk...mock4', event_type: 'trade_fee' },
      { id: 'fe005', campaign_id: 'e5f6g7h8', amount_sol: 3.450, tx_signature: '2cLp...mock5', event_type: 'trade_fee' },
      { id: 'fe006', campaign_id: 'm3n4o5p6', amount_sol: 5.100, tx_signature: '8nRt...mock6', event_type: 'trade_fee' },
      { id: 'fe007', campaign_id: 'q7r8s9t0', amount_sol: 0.890, tx_signature: '1dFg...mock7', event_type: 'trade_fee' },
      { id: 'fe008', campaign_id: 'u1v2w3x4', amount_sol: 1.750, tx_signature: '4jKm...mock8', event_type: 'trade_fee' },
    ];
    for (const fe of feeEvents) {
      insertFeeEvent.run(fe);
    }

    // Mock claims
    const claimsData = [
      { id: 'cl001', campaign_id: 'a1b2c3d4', reddit_username: 'GallowBoob', wallet_address: 'Gx1mock...wallet', amount_sol: 5.2, tx_signature: 'clTx...mock1' },
      { id: 'cl002', campaign_id: 'e5f6g7h8', reddit_username: 'shittymorph', wallet_address: 'Sm1mock...wallet', amount_sol: 12.0, tx_signature: 'clTx...mock2' },
      { id: 'cl003', campaign_id: 'm3n4o5p6', reddit_username: 'antirez', wallet_address: 'Ar1mock...wallet', amount_sol: 20.5, tx_signature: 'clTx...mock3' },
    ];
    for (const cl of claimsData) {
      insertClaim.run(cl);
    }
  });

  transaction();
}

export default getDb;
