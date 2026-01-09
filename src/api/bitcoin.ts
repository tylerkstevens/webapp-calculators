import axios from 'axios'

// ============================================================================
// API Endpoints (CORS-enabled)
// ============================================================================

const COINGECKO_API = 'https://api.coingecko.com/api/v3'
const MEMPOOL_API = 'https://mempool.space/api/v1'

// ============================================================================
// API Response Types
// ============================================================================

interface CoinGeckoPrice {
  bitcoin: {
    usd: number
    usd_24h_change?: number
  }
}

interface MempoolHashrate {
  currentHashrate: number      // H/s
  currentDifficulty: number
  hashrates: Array<{
    timestamp: number
    avgHashrate: number
  }>
}

// ============================================================================
// App Interface Types
// ============================================================================

export interface BitcoinPrice {
  usd: number
  usd_24h_change: number
}

export interface NetworkStats {
  difficulty: number
  hashrate: number // network hashrate in TH/s
  blockReward: number
}

// Bitcoin metrics for the app
export interface BraiinsMetrics {
  btcPrice: number
  networkHashrate: number      // TH/s
  blockReward: number          // 3.125 BTC
  // Calculated from network data
  hashprice: number            // $/TH/day
  hashvalue: number            // BTC/TH/day
  difficulty: number
  // Placeholder fields (not available from these APIs)
  estimatedAdjustment: number
  estimatedAdjustmentDate: string
  feesPercent: number
  avgFeesPerBlock: number
}

// ============================================================================
// Fallback Values
// ============================================================================

const FALLBACK_DATA: BraiinsMetrics = {
  btcPrice: 100000,
  networkHashrate: 800e6,      // 800 EH/s in TH/s
  blockReward: 3.125,
  hashprice: 0.05,             // $/TH/day
  hashvalue: 0.0000005,        // BTC/TH/day
  difficulty: 100e12,
  estimatedAdjustment: 0,
  estimatedAdjustmentDate: '',
  feesPercent: 2,
  avgFeesPerBlock: 0.2,
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch all Bitcoin mining data from CORS-enabled APIs.
 * Uses CoinGecko for price and Mempool.space for network stats.
 */
export async function getBraiinsData(): Promise<BraiinsMetrics> {
  try {
    const [priceRes, mempoolRes, avgFeeRate] = await Promise.all([
      axios.get<CoinGeckoPrice>(`${COINGECKO_API}/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true`),
      axios.get<MempoolHashrate>(`${MEMPOOL_API}/mining/hashrate/3d`),
      getAverageFeeRate().catch(() => 0.2), // Fetch fees, fallback to 0.2 BTC if error
    ])

    const btcPrice = priceRes.data.bitcoin.usd
    // Mempool returns hashrate in H/s, convert to TH/s (1 TH = 1e12 H)
    const networkHashrateTH = mempoolRes.data.currentHashrate / 1e12
    const difficulty = mempoolRes.data.currentDifficulty
    const blockReward = 3.125

    // Calculate hashvalue: BTC earned per TH/s per day (includes transaction fees)
    // hashvalue = (blocks_per_day × (block_reward + avg_fees)) / network_hashrate_TH
    const blocksPerDay = 144
    const totalRewardPerBlock = blockReward + avgFeeRate
    const hashvalue = (blocksPerDay * totalRewardPerBlock) / networkHashrateTH

    // Calculate hashprice: USD earned per TH/s per day
    const hashprice = hashvalue * btcPrice

    // Calculate fee percentage
    const feesPercent = (avgFeeRate / blockReward) * 100

    return {
      btcPrice,
      networkHashrate: networkHashrateTH,
      blockReward,
      hashprice,
      hashvalue,
      difficulty,
      // These fields aren't available from these APIs
      estimatedAdjustment: 0,
      estimatedAdjustmentDate: '',
      feesPercent,
      avgFeesPerBlock: avgFeeRate,
    }
  } catch (error) {
    console.error('Error fetching Bitcoin data:', error)
    return FALLBACK_DATA
  }
}

// ============================================================================
// Transaction Fee Data
// ============================================================================

/**
 * Get average transaction fee rate for calculations.
 * Returns conservative estimate of average fees per block in BTC.
 * Used for fee-aware override calculations.
 *
 * Note: Returns hardcoded value (0.2 BTC ≈ 6.4% of block reward) until
 * proper historical fee data API is implemented.
 */
export async function getAverageFeeRate(): Promise<number> {
  // Conservative estimate: 0.2 BTC in fees per block (5-8% of block reward)
  return 0.2
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate daily BTC earnings based on hashrate.
 */
export function calculateDailyBTC(
  hashrateTH: number,        // User's hashrate in TH/s
  networkHashrateTH: number, // Network hashrate in TH/s
  blockReward: number
): number {
  const blocksPerDay = 144
  const userShare = hashrateTH / networkHashrateTH
  return userShare * blocksPerDay * blockReward
}

/**
 * Convert hashvalue from BTC/TH/day to sats/TH/day.
 */
export function hashvalueToSats(hashvalueBTC: number): number {
  return hashvalueBTC * 1e8
}
