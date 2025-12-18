import axios from 'axios'

const COINGECKO_API = 'https://api.coingecko.com/api/v3'

export interface BitcoinPrice {
  usd: number
  usd_24h_change: number
}

export interface NetworkStats {
  difficulty: number
  hashrate: number // network hashrate in TH/s
  blockReward: number
}

// Fetch current Bitcoin price
export async function getBitcoinPrice(): Promise<BitcoinPrice> {
  try {
    const response = await axios.get(
      `${COINGECKO_API}/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true`
    )
    return {
      usd: response.data.bitcoin.usd,
      usd_24h_change: response.data.bitcoin.usd_24h_change,
    }
  } catch (error) {
    console.error('Error fetching Bitcoin price:', error)
    // Return fallback price if API fails
    return { usd: 100000, usd_24h_change: 0 }
  }
}

// Fetch network statistics from blockchain.info
export async function getNetworkStats(): Promise<NetworkStats> {
  try {
    // Using blockchain.info API for network stats
    const [difficultyRes, hashrateRes] = await Promise.all([
      axios.get('https://blockchain.info/q/getdifficulty'),
      axios.get('https://blockchain.info/q/hashrate'),
    ])

    return {
      difficulty: difficultyRes.data,
      hashrate: hashrateRes.data / 1e3, // Convert GH/s to TH/s
      blockReward: 3.125, // Current block reward after halving
    }
  } catch (error) {
    console.error('Error fetching network stats:', error)
    // Return reasonable defaults if API fails (late 2024 values)
    return {
      difficulty: 110e12,
      hashrate: 800e6, // ~800 EH/s network (updated for 2024-2025)
      blockReward: 3.125,
    }
  }
}

// Calculate daily BTC earnings based on hashrate
export function calculateDailyBTC(
  hashrateTH: number, // User's hashrate in TH/s
  networkHashrateTH: number, // Network hashrate in TH/s
  blockReward: number
): number {
  // Blocks per day (approximately 144)
  const blocksPerDay = 144

  // User's share of network hashrate
  const userShare = hashrateTH / networkHashrateTH

  // Daily BTC earned
  return userShare * blocksPerDay * blockReward
}
