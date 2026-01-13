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

interface MempoolRewardStats {
  startBlock: number
  endBlock: number
  totalReward: number    // sats
  totalFee: number       // sats
  totalTx: number
  avgFeeRate: number
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

// Bitcoin metrics for the app (renamed from BraiinsMetrics)
export interface BitcoinMetrics {
  btcPrice: number
  networkHashrate: number      // TH/s
  blockSubsidy: number         // BTC (calculated from block height)
  blockHeight: number          // Current block height
  // Calculated from network data (all in sats internally)
  hashpriceSats: number        // sats/TH/day (primary, used for calculations)
  hashvalueSats: number        // sats/TH/day (primary, used for calculations)
  hashprice: number            // $/TH/day (derived from hashpriceSats)
  hashvalue: number            // BTC/TH/day (derived from hashvalueSats, for display)
  difficulty: number
  // Transaction fee data
  feePercent: number           // Fees as % of total reward (0-100)
  avgFeesPerBlockSats: number  // Average fees per block in sats
}

// Legacy alias for backwards compatibility during migration
export type BraiinsMetrics = BitcoinMetrics

// ============================================================================
// Constants
// ============================================================================

const BLOCKS_PER_DAY = 144
const HALVING_INTERVAL = 210000
const INITIAL_SUBSIDY = 50
const SATS_PER_BTC = 1e8
const DEFAULT_FEE_PERCENT = 6 // Fallback if API fails

// ============================================================================
// Fallback Values
// ============================================================================

const FALLBACK_DATA: BitcoinMetrics = {
  btcPrice: 100000,
  networkHashrate: 800e6,      // 800 EH/s in TH/s
  blockSubsidy: 3.125,
  blockHeight: 880000,
  hashpriceSats: 5000,         // ~50 sats/TH/day × $100k = $0.05/TH/day
  hashvalueSats: 50,           // 50 sats/TH/day
  hashprice: 0.05,             // $/TH/day
  hashvalue: 0.0000005,        // BTC/TH/day
  difficulty: 100e12,
  feePercent: DEFAULT_FEE_PERCENT,
  avgFeesPerBlockSats: 20000000, // 0.2 BTC in sats
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate block subsidy from block height.
 * Subsidy halves every 210,000 blocks.
 */
export function getBlockSubsidy(blockHeight: number): number {
  const halvings = Math.floor(blockHeight / HALVING_INTERVAL)
  return INITIAL_SUBSIDY / Math.pow(2, halvings)
}

/**
 * Calculate hashvalue in sats from network parameters.
 * Formula: hashvalue = (daily_reward_sats) / network_hashrate_TH
 */
export function calculateHashvalueSats(
  blockSubsidy: number,
  feePercent: number,
  networkHashrateTH: number
): number {
  if (networkHashrateTH <= 0) return 0

  // Total reward = subsidy / (1 - feePercent/100)
  // This derives total from subsidy and fee %
  const totalRewardPerBlock = feePercent >= 100
    ? blockSubsidy * 100 // Cap at extreme case
    : blockSubsidy / (1 - feePercent / 100)

  const dailyRewardSats = totalRewardPerBlock * BLOCKS_PER_DAY * SATS_PER_BTC
  return dailyRewardSats / networkHashrateTH
}

/**
 * Calculate implied network hashrate from hashvalue and fee %.
 * Formula: hashrate = daily_reward_sats / hashvalue_sats
 */
export function calculateImpliedHashrate(
  blockSubsidy: number,
  feePercent: number,
  hashvalueSats: number
): number {
  if (hashvalueSats <= 0) return 0

  const totalRewardPerBlock = feePercent >= 100
    ? blockSubsidy * 100
    : blockSubsidy / (1 - feePercent / 100)

  const dailyRewardSats = totalRewardPerBlock * BLOCKS_PER_DAY * SATS_PER_BTC
  return dailyRewardSats / hashvalueSats
}

/**
 * Calculate fee percent from average fees and block subsidy.
 * Formula: feePercent = fees / (subsidy + fees) × 100
 */
export function calculateFeePercent(
  avgFeesPerBlockSats: number,
  blockSubsidySats: number
): number {
  const totalReward = blockSubsidySats + avgFeesPerBlockSats
  if (totalReward <= 0) return 0
  const percent = (avgFeesPerBlockSats / totalReward) * 100
  // Clamp to 0-99
  return Math.min(99, Math.max(0, Math.round(percent)))
}

/**
 * Convert hashvalue from sats/TH/day to BTC/TH/day.
 */
export function hashvalueToBtc(hashvalueSats: number): number {
  return hashvalueSats / SATS_PER_BTC
}

/**
 * Convert hashvalue from BTC/TH/day to sats/TH/day.
 */
export function hashvalueToSats(hashvalueBTC: number): number {
  return hashvalueBTC * SATS_PER_BTC
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch all Bitcoin mining data from CORS-enabled APIs.
 * Uses CoinGecko for price and Mempool.space for network stats + fees.
 */
export async function getBitcoinMetrics(): Promise<BitcoinMetrics> {
  try {
    const [priceRes, mempoolRes, rewardStatsRes] = await Promise.all([
      axios.get<CoinGeckoPrice>(`${COINGECKO_API}/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true`),
      axios.get<MempoolHashrate>(`${MEMPOOL_API}/mining/hashrate/1m`),
      axios.get<MempoolRewardStats>(`${MEMPOOL_API}/mining/reward-stats/144`).catch(() => null),
    ])

    const btcPrice = priceRes.data.bitcoin.usd
    // Mempool returns hashrate in H/s, convert to TH/s (1 TH = 1e12 H)
    const networkHashrateTH = mempoolRes.data.currentHashrate / 1e12
    const difficulty = mempoolRes.data.currentDifficulty

    // Get fee data from reward-stats, or use fallback
    let avgFeesPerBlockSats: number
    let blockHeight: number

    if (rewardStatsRes?.data) {
      avgFeesPerBlockSats = rewardStatsRes.data.totalFee / 144
      blockHeight = rewardStatsRes.data.endBlock
    } else {
      // Fallback: assume 6% fees and current epoch
      avgFeesPerBlockSats = FALLBACK_DATA.avgFeesPerBlockSats
      blockHeight = FALLBACK_DATA.blockHeight
    }

    // Calculate block subsidy from height (auto-halving)
    const blockSubsidy = getBlockSubsidy(blockHeight)
    const blockSubsidySats = blockSubsidy * SATS_PER_BTC

    // Calculate fee percentage
    const feePercent = calculateFeePercent(avgFeesPerBlockSats, blockSubsidySats)

    // Calculate hashvalue (sats/TH/day) including fees
    const totalRewardPerBlock = blockSubsidy + (avgFeesPerBlockSats / SATS_PER_BTC)
    const dailyRewardSats = totalRewardPerBlock * BLOCKS_PER_DAY * SATS_PER_BTC
    const hashvalueSats = dailyRewardSats / networkHashrateTH

    // Calculate hashprice ($/TH/day)
    const hashvalue = hashvalueSats / SATS_PER_BTC // BTC/TH/day
    const hashprice = hashvalue * btcPrice
    const hashpriceSats = hashvalueSats * btcPrice // sats value in USD

    return {
      btcPrice,
      networkHashrate: networkHashrateTH,
      blockSubsidy,
      blockHeight,
      hashpriceSats,
      hashvalueSats,
      hashprice,
      hashvalue,
      difficulty,
      feePercent,
      avgFeesPerBlockSats,
    }
  } catch (error) {
    console.error('Error fetching Bitcoin data:', error)
    return FALLBACK_DATA
  }
}

// Legacy alias for backwards compatibility during migration
export const getBraiinsData = getBitcoinMetrics

/**
 * Calculate daily BTC earnings based on hashrate.
 */
export function calculateDailyBTC(
  hashrateTH: number,        // User's hashrate in TH/s
  networkHashrateTH: number, // Network hashrate in TH/s
  blockReward: number
): number {
  const userShare = hashrateTH / networkHashrateTH
  return userShare * BLOCKS_PER_DAY * blockReward
}
