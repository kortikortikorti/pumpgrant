// Helper to generate mock data for client-side use

export function generateMockFeeEvents(campaignId: string) {
  return [
    { id: 'fe001', campaign_id: campaignId, amount_sol: 0.523, tx_signature: '5KtRx8mPqVnZxE9f7YbW3dNcGhT6jRsK2vLp4aQm1nDw', event_type: 'trade_fee', created_at: '2026-03-27T18:30:00Z' },
    { id: 'fe002', campaign_id: campaignId, amount_sol: 1.201, tx_signature: '3xPqW7hBkN2cLpR9mVnZ8dFgT5jKm1aQs6vYbE4nXw0D', event_type: 'trade_fee', created_at: '2026-03-27T15:12:00Z' },
    { id: 'fe003', campaign_id: campaignId, amount_sol: 0.847, tx_signature: '9mVnZ3xPqW7hBk2cLpR8dFgT5jKm1aQs6vYbEN4nXw0D', event_type: 'trade_fee', created_at: '2026-03-27T11:45:00Z' },
    { id: 'fe004', campaign_id: campaignId, amount_sol: 2.156, tx_signature: '7hBkN2cLpR9mVnZ8dFgT5jKm1aQs6vYbE4nXw0D3xPqW', event_type: 'trade_fee', created_at: '2026-03-26T22:18:00Z' },
    { id: 'fe005', campaign_id: campaignId, amount_sol: 0.334, tx_signature: '2cLpR9mVnZ8dFgT5jKm1aQs6vYbE4nXw0D3xPqW7hBkN', event_type: 'trade_fee', created_at: '2026-03-26T14:55:00Z' },
  ];
}

export function generateMockClaims(campaignId: string, reddit: string) {
  return [
    { id: 'cl001', campaign_id: campaignId, reddit_username: reddit, wallet_address: 'Gx1mockWallet...abc', amount_sol: 3.2, tx_signature: 'clTx1mockSignature...xyz', claimed_at: '2026-03-26T10:00:00Z' },
    { id: 'cl002', campaign_id: campaignId, reddit_username: reddit, wallet_address: 'Gx1mockWallet...abc', amount_sol: 2.0, tx_signature: 'clTx2mockSignature...xyz', claimed_at: '2026-03-25T16:30:00Z' },
  ];
}
