# 💊 PumpGrant

**Fund anyone on Reddit through pump.fun token trading fees.**

PumpGrant lets you create tokens on pump.fun where trading fees automatically flow to a Reddit user's wallet. The beneficiary verifies their Reddit account by posting a unique code on their profile, connects their wallet, and claims their accumulated SOL.

## Reddit Verification

PumpGrant uses a simple, trustless verification method — no OAuth or API keys required:

1. User enters their Reddit username
2. PumpGrant generates a unique code (e.g. `PUMP-A7X3-GRANT`)
3. User posts the code as a comment or post on their Reddit profile
4. PumpGrant checks the user's public Reddit profile for the code
5. If found → verified! User can connect wallet and claim funds

This approach requires no Reddit API credentials and works entirely through public profile data.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  pump.fun    │────▸│  Platform     │────▸│  Fee Monitor    │
│  Token Trades│     │  Wallet (SOL) │     │  Bot            │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                   │
                                                   ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Reddit User │────▸│  Claim API   │────▸│  SQLite DB      │
│  (Beneficiary)│    │  (Next.js)   │     │  (Campaigns,    │
└─────────────┘     └──────┬───────┘     │   Verifications,│
                           │              │   Fee Events,   │
                           ▼              │   Claims)       │
                    ┌──────────────┐     └─────────────────┘
                    │  SOL Transfer │
                    │  to Beneficiary│
                    └──────────────┘
```

### Components

| Component | Description |
|-----------|-------------|
| **Next.js App** | Web UI + API routes for campaigns, verification, claiming |
| **Fee Monitor Bot** | Standalone process that watches the platform wallet for incoming SOL |
| **Platform Wallet** | Server-side Solana keypair that receives fees and disburses claims |
| **SQLite DB** | Local database tracking campaigns, verifications, fee events, and claims |

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Platform Wallet

```bash
npm run setup
```

This will:
- Generate a new Solana keypair (saved to `platform-wallet.json`)
- Print the public address
- Request a devnet airdrop (2 SOL) for testing

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your settings. For development, the defaults work with devnet.

### 4. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Run the Fee Monitor Bot

In a separate terminal:

```bash
npm run bot
```

The bot polls the platform wallet every 30 seconds for incoming SOL transfers.

## Testing on Devnet

Run the full end-to-end test:

```bash
npm run test:flow
```

This will:
1. Generate a test wallet
2. Airdrop SOL to it
3. Send SOL to the platform wallet (simulating fees)
4. Run fee detection
5. Create a test campaign
6. Claim fees to a test wallet
7. Verify the transaction
8. Clean up

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SOLANA_RPC_URL` | `https://api.devnet.solana.com` | Solana RPC endpoint |
| `SOLANA_NETWORK` | `devnet` | Network name (`devnet` or `mainnet-beta`) |
| `PLATFORM_WALLET_PRIVATE_KEY` | — | Base58 or JSON array private key (optional if using `platform-wallet.json`) |
| `ENCRYPTION_SECRET` | — | Secret for encrypting stored wallet keys |
| `FEE_CHECK_INTERVAL_MS` | `30000` | Bot polling interval in milliseconds |

## API Routes

### Verification

- **POST /api/verify/generate** — Generate a verification code for a Reddit username
- **POST /api/verify/check** — Check if the code was posted on the user's Reddit profile

### Campaigns & Claims

- **GET /api/campaigns** — List campaigns (filter by `?reddit_username=`)
- **POST /api/claim** — Claim accumulated SOL (requires verified Reddit account)

## Bot Deployment

The fee monitor bot runs as a standalone Node.js process:

```bash
# Development
npm run bot

# Production (with tsx)
npx tsx src/bot/index.ts

# Production (compiled)
npx tsc && node dist/bot/index.js
```

For production, consider running it with a process manager:

```bash
# PM2
pm2 start "npm run bot" --name pumpgrant-bot

# systemd (Linux)
# Create a service file at /etc/systemd/system/pumpgrant-bot.service
```

## Project Structure

```
src/
├── app/                    # Next.js pages and API routes
│   ├── api/
│   │   ├── campaigns/      # Campaign CRUD
│   │   ├── claim/          # Fee claiming (real SOL transfer)
│   │   ├── verify/         # Reddit verification (generate + check)
│   │   ├── verify-token/   # On-chain token verification
│   │   └── ...
│   └── ...
├── bot/
│   ├── index.ts            # Bot entry point
│   └── fee-monitor.ts      # Fee monitoring logic
├── components/             # React components
├── lib/
│   ├── crypto.ts           # Encryption utilities
│   ├── db.ts               # SQLite database
│   ├── pumpfun.ts          # Token-2022 verification & pump.fun helpers
│   ├── solana.ts           # Solana transaction utilities
│   └── wallet.ts           # Platform wallet management
└── scripts/
    ├── setup.ts            # Initial setup script
    └── test-flow.ts        # Devnet end-to-end test
```

## Security Notes

- **Never commit `platform-wallet.json`** — it contains your private key
- **Use devnet** for development and testing
- **Back up your wallet** before deploying to mainnet
- The platform wallet holds all unclaimed fees — secure it accordingly
- Reddit verification is public and stateless — no OAuth tokens stored

## License

MIT
