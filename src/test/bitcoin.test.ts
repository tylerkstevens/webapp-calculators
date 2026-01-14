import { describe, it, expect } from 'vitest'
import {
  getBlockSubsidy,
  calculateHashvalueSats,
  calculateImpliedHashrate,
  calculateFeePercent,
  hashvalueToBtc,
  hashvalueToSats,
} from '../api/bitcoin'

// ============================================================================
// Constants for testing
// ============================================================================

const SATS_PER_BTC = 1e8
const HALVING_INTERVAL = 210000

// Current epoch values (post-4th halving)
const CURRENT_BLOCK_SUBSIDY = 3.125
const CURRENT_BLOCK_SUBSIDY_SATS = 312500000

// Standard test network hashrate: 800 EH/s = 800e6 TH/s
const STANDARD_NETWORK_HASHRATE_TH = 800e6

// ============================================================================
// getBlockSubsidy tests
// ============================================================================

describe('getBlockSubsidy', () => {
  it('returns 50 BTC for genesis block', () => {
    expect(getBlockSubsidy(0)).toBe(50)
  })

  it('returns 50 BTC for blocks before first halving', () => {
    expect(getBlockSubsidy(1)).toBe(50)
    expect(getBlockSubsidy(100000)).toBe(50)
    expect(getBlockSubsidy(209999)).toBe(50)
  })

  it('returns 25 BTC after first halving', () => {
    expect(getBlockSubsidy(210000)).toBe(25)
    expect(getBlockSubsidy(300000)).toBe(25)
    expect(getBlockSubsidy(419999)).toBe(25)
  })

  it('returns 12.5 BTC after second halving', () => {
    expect(getBlockSubsidy(420000)).toBe(12.5)
    expect(getBlockSubsidy(629999)).toBe(12.5)
  })

  it('returns 6.25 BTC after third halving', () => {
    expect(getBlockSubsidy(630000)).toBe(6.25)
    expect(getBlockSubsidy(839999)).toBe(6.25)
  })

  it('returns 3.125 BTC for current epoch (4th halving)', () => {
    expect(getBlockSubsidy(840000)).toBe(3.125)
    expect(getBlockSubsidy(880000)).toBe(3.125) // Current approximate height
    expect(getBlockSubsidy(1049999)).toBe(3.125)
  })

  it('returns 1.5625 BTC after next halving (5th)', () => {
    expect(getBlockSubsidy(1050000)).toBe(1.5625)
  })

  it('calculates correctly for any halving epoch', () => {
    // Test formula: subsidy = 50 / (2 ^ halvings)
    for (let halvings = 0; halvings <= 10; halvings++) {
      const blockHeight = halvings * HALVING_INTERVAL
      const expectedSubsidy = 50 / Math.pow(2, halvings)
      expect(getBlockSubsidy(blockHeight)).toBe(expectedSubsidy)
    }
  })
})

// ============================================================================
// calculateFeePercent tests
// ============================================================================

describe('calculateFeePercent', () => {
  it('calculates fee % from avg fees and block subsidy', () => {
    // If fees = 0.2 BTC and subsidy = 3.125 BTC
    // Total = 3.325 BTC, fee % = 0.2 / 3.325 * 100 = 6.02%
    const avgFeesPerBlockSats = 20000000 // 0.2 BTC
    const blockSubsidySats = CURRENT_BLOCK_SUBSIDY_SATS
    const feePercent = calculateFeePercent(avgFeesPerBlockSats, blockSubsidySats)
    expect(feePercent).toBe(6) // Rounded
  })

  it('returns 0 for zero fees', () => {
    expect(calculateFeePercent(0, CURRENT_BLOCK_SUBSIDY_SATS)).toBe(0)
  })

  it('returns 0 when total reward is 0', () => {
    expect(calculateFeePercent(0, 0)).toBe(0)
  })

  it('caps at 99%', () => {
    // Very high fees relative to subsidy (need fees >> subsidy to approach 99%)
    // At 1000 BTC fees vs 3.125 subsidy: 1000 / 1003.125 = 99.7% -> caps at 99
    const extremeFees = 1000 * SATS_PER_BTC // 1000 BTC in fees
    const feePercent = calculateFeePercent(extremeFees, CURRENT_BLOCK_SUBSIDY_SATS)
    expect(feePercent).toBe(99)
  })

  it('calculates correctly for various fee levels', () => {
    const subsidy = CURRENT_BLOCK_SUBSIDY_SATS

    // 10% fees: fees = subsidy * 10/90 = 34722222 sats
    const fees10pct = Math.round(subsidy * (10 / 90))
    expect(calculateFeePercent(fees10pct, subsidy)).toBe(10)

    // 25% fees: fees = subsidy * 25/75 = 104166667 sats
    const fees25pct = Math.round(subsidy * (25 / 75))
    expect(calculateFeePercent(fees25pct, subsidy)).toBe(25)

    // 50% fees: fees = subsidy * 50/50 = 312500000 sats (equal to subsidy)
    const fees50pct = subsidy
    expect(calculateFeePercent(fees50pct, subsidy)).toBe(50)
  })

  it('rounds to nearest integer', () => {
    // 6.7% -> 7
    const fees = Math.round(CURRENT_BLOCK_SUBSIDY_SATS * (6.7 / 93.3))
    const feePercent = calculateFeePercent(fees, CURRENT_BLOCK_SUBSIDY_SATS)
    expect(feePercent).toBe(7)
  })
})

// ============================================================================
// calculateHashvalueSats tests
// ============================================================================

describe('calculateHashvalueSats', () => {
  it('calculates hashvalue in sats/TH/day', () => {
    // With 0% fees: totalReward = subsidy / (1 - 0) = subsidy
    // dailyRewardSats = 3.125 * 144 * 1e8 = 45,000,000,000
    // hashvalueSats = 45e9 / 800e6 = 56.25 sats/TH/day
    const hashvalue = calculateHashvalueSats(
      CURRENT_BLOCK_SUBSIDY,
      0,
      STANDARD_NETWORK_HASHRATE_TH
    )
    expect(hashvalue).toBeCloseTo(56.25, 2)
  })

  it('returns higher hashvalue when fee % increases', () => {
    const hashvalue0pct = calculateHashvalueSats(CURRENT_BLOCK_SUBSIDY, 0, STANDARD_NETWORK_HASHRATE_TH)
    const hashvalue10pct = calculateHashvalueSats(CURRENT_BLOCK_SUBSIDY, 10, STANDARD_NETWORK_HASHRATE_TH)
    const hashvalue25pct = calculateHashvalueSats(CURRENT_BLOCK_SUBSIDY, 25, STANDARD_NETWORK_HASHRATE_TH)

    expect(hashvalue10pct).toBeGreaterThan(hashvalue0pct)
    expect(hashvalue25pct).toBeGreaterThan(hashvalue10pct)
  })

  it('calculates correct hashvalue for 10% fees', () => {
    // With 10% fees: totalReward = 3.125 / (1 - 0.1) = 3.472 BTC
    // dailyRewardSats = 3.472 * 144 * 1e8 = 50,000,000,000
    // hashvalueSats = 50e9 / 800e6 = 62.5 sats/TH/day
    const hashvalue = calculateHashvalueSats(
      CURRENT_BLOCK_SUBSIDY,
      10,
      STANDARD_NETWORK_HASHRATE_TH
    )
    expect(hashvalue).toBeCloseTo(62.5, 1)
  })

  it('returns higher hashvalue when network hashrate decreases', () => {
    const hashrate800EH = calculateHashvalueSats(CURRENT_BLOCK_SUBSIDY, 6, 800e6)
    const hashrate400EH = calculateHashvalueSats(CURRENT_BLOCK_SUBSIDY, 6, 400e6)

    expect(hashrate400EH).toBeCloseTo(hashrate800EH * 2, 1)
  })

  it('returns 0 for zero or negative network hashrate', () => {
    expect(calculateHashvalueSats(CURRENT_BLOCK_SUBSIDY, 6, 0)).toBe(0)
    expect(calculateHashvalueSats(CURRENT_BLOCK_SUBSIDY, 6, -100)).toBe(0)
  })

  it('handles extreme fee percentages', () => {
    // At 99% fees, totalReward = subsidy / 0.01 = 312.5 BTC per block
    const hashvalue99pct = calculateHashvalueSats(CURRENT_BLOCK_SUBSIDY, 99, STANDARD_NETWORK_HASHRATE_TH)
    expect(hashvalue99pct).toBeGreaterThan(0)

    // At 100% fees, should cap
    const hashvalue100pct = calculateHashvalueSats(CURRENT_BLOCK_SUBSIDY, 100, STANDARD_NETWORK_HASHRATE_TH)
    expect(hashvalue100pct).toBeGreaterThan(0)
  })

  it('scales linearly with block subsidy', () => {
    const hashvalue3125 = calculateHashvalueSats(3.125, 6, STANDARD_NETWORK_HASHRATE_TH)
    const hashvalue625 = calculateHashvalueSats(6.25, 6, STANDARD_NETWORK_HASHRATE_TH)

    expect(hashvalue625).toBeCloseTo(hashvalue3125 * 2, 1)
  })
})

// ============================================================================
// calculateImpliedHashrate tests
// ============================================================================

describe('calculateImpliedHashrate', () => {
  it('derives network hashrate from hashvalue and fee %', () => {
    // First calculate a known hashvalue
    const hashvalue = calculateHashvalueSats(
      CURRENT_BLOCK_SUBSIDY,
      6,
      STANDARD_NETWORK_HASHRATE_TH
    )

    // Then derive hashrate back - should return original
    const impliedHashrate = calculateImpliedHashrate(
      CURRENT_BLOCK_SUBSIDY,
      6,
      hashvalue
    )

    expect(impliedHashrate).toBeCloseTo(STANDARD_NETWORK_HASHRATE_TH, -3) // Within 1000 TH/s
  })

  it('holds fee % constant when deriving hashrate', () => {
    // With fee % held at 10%, changing hashvalue should imply different network hashrate
    const hashvalue60 = 60 // sats/TH/day
    const hashvalue120 = 120 // sats/TH/day

    const hashrate60 = calculateImpliedHashrate(CURRENT_BLOCK_SUBSIDY, 10, hashvalue60)
    const hashrate120 = calculateImpliedHashrate(CURRENT_BLOCK_SUBSIDY, 10, hashvalue120)

    // Double hashvalue = half network hashrate
    expect(hashrate60).toBeCloseTo(hashrate120 * 2, -3)
  })

  it('returns 0 for zero or negative hashvalue', () => {
    expect(calculateImpliedHashrate(CURRENT_BLOCK_SUBSIDY, 6, 0)).toBe(0)
    expect(calculateImpliedHashrate(CURRENT_BLOCK_SUBSIDY, 6, -10)).toBe(0)
  })

  it('is inverse of calculateHashvalueSats', () => {
    // For various fee percentages, verify round-trip
    const feePercents = [0, 5, 10, 25, 50]
    const testHashrates = [400e6, 800e6, 1200e6]

    for (const feePercent of feePercents) {
      for (const hashrate of testHashrates) {
        const hashvalue = calculateHashvalueSats(CURRENT_BLOCK_SUBSIDY, feePercent, hashrate)
        const impliedHashrate = calculateImpliedHashrate(CURRENT_BLOCK_SUBSIDY, feePercent, hashvalue)

        expect(impliedHashrate).toBeCloseTo(hashrate, -3)
      }
    }
  })

  it('handles extreme fee percentages', () => {
    const hashvalue = 100 // sats/TH/day
    const hashrate99pct = calculateImpliedHashrate(CURRENT_BLOCK_SUBSIDY, 99, hashvalue)
    expect(hashrate99pct).toBeGreaterThan(0)

    const hashrate100pct = calculateImpliedHashrate(CURRENT_BLOCK_SUBSIDY, 100, hashvalue)
    expect(hashrate100pct).toBeGreaterThan(0)
  })
})

// ============================================================================
// hashvalueToBtc and hashvalueToSats tests
// ============================================================================

describe('hashvalueToBtc', () => {
  it('converts sats/TH/day to BTC/TH/day', () => {
    expect(hashvalueToBtc(100000000)).toBe(1)
    expect(hashvalueToBtc(50000000)).toBe(0.5)
    expect(hashvalueToBtc(56.25)).toBeCloseTo(0.0000005625, 12)
  })

  it('handles 0', () => {
    expect(hashvalueToBtc(0)).toBe(0)
  })
})

describe('hashvalueToSats', () => {
  it('converts BTC/TH/day to sats/TH/day', () => {
    expect(hashvalueToSats(1)).toBe(100000000)
    expect(hashvalueToSats(0.5)).toBe(50000000)
    expect(hashvalueToSats(0.0000005625)).toBeCloseTo(56.25, 2)
  })

  it('handles 0', () => {
    expect(hashvalueToSats(0)).toBe(0)
  })

  it('is inverse of hashvalueToBtc', () => {
    const originalSats = 56.25
    const btc = hashvalueToBtc(originalSats)
    const backToSats = hashvalueToSats(btc)
    expect(backToSats).toBeCloseTo(originalSats, 10)
  })
})

// ============================================================================
// Three-Knob Override System integration tests
// ============================================================================

describe('Three-Knob Override System', () => {
  it('maintains consistency: fee % as anchor, hashvalue ↔ hashrate imply each other', () => {
    const feePercent = 10

    // Given a hashrate, calculate hashvalue
    const hashrate = 800e6
    const hashvalue = calculateHashvalueSats(CURRENT_BLOCK_SUBSIDY, feePercent, hashrate)

    // Given the hashvalue, derive hashrate back
    const derivedHashrate = calculateImpliedHashrate(CURRENT_BLOCK_SUBSIDY, feePercent, hashvalue)

    expect(derivedHashrate).toBeCloseTo(hashrate, -3)
  })

  it('changing fee % with fixed hashrate changes hashvalue', () => {
    const hashrate = 800e6

    const hashvalue5pct = calculateHashvalueSats(CURRENT_BLOCK_SUBSIDY, 5, hashrate)
    const hashvalue15pct = calculateHashvalueSats(CURRENT_BLOCK_SUBSIDY, 15, hashrate)

    // Higher fee % = more total reward = higher hashvalue
    expect(hashvalue15pct).toBeGreaterThan(hashvalue5pct)
  })

  it('changing fee % with fixed hashvalue changes implied hashrate', () => {
    const targetHashvalue = 60 // sats/TH/day

    const hashrate5pct = calculateImpliedHashrate(CURRENT_BLOCK_SUBSIDY, 5, targetHashvalue)
    const hashrate15pct = calculateImpliedHashrate(CURRENT_BLOCK_SUBSIDY, 15, targetHashvalue)

    // Higher fee % = more daily reward / same hashvalue = higher implied hashrate
    expect(hashrate15pct).toBeGreaterThan(hashrate5pct)
  })

  it('real-world scenario: user adjusts fee slider with fixed network hashrate', () => {
    const networkHashrate = 800e6

    // Start with current fee level
    const hashvalue6pct = calculateHashvalueSats(CURRENT_BLOCK_SUBSIDY, 6, networkHashrate)

    // User slides fee % up to model high-fee environment
    const hashvalue25pct = calculateHashvalueSats(CURRENT_BLOCK_SUBSIDY, 25, networkHashrate)

    // Hashvalue should increase proportionally
    // At 6%: totalReward = 3.125 / 0.94 = 3.324
    // At 25%: totalReward = 3.125 / 0.75 = 4.167
    // Ratio: 4.167 / 3.324 = 1.254
    const expectedRatio = (1 - 0.06) / (1 - 0.25)
    expect(hashvalue25pct / hashvalue6pct).toBeCloseTo(expectedRatio, 2)
  })
})
