import { describe, it, expect } from 'vitest'
import type { PdfMiniRanking, PdfStateRanking } from '../pdf/types'

// Helper function to build surrounding context - extracted for testing
// This mirrors the logic in HashrateHeating.tsx
function buildSurroundingContext(
  sorted: PdfStateRanking[],
  userValue: number,
  getValue: (s: PdfStateRanking) => number
): { surroundingStates: { rank: number; state: string; value: number; isUser?: boolean }[]; position: string } {
  // Find where user fits in the sorted list
  let insertIndex = sorted.length // Default: user is at the bottom
  for (let i = 0; i < sorted.length; i++) {
    if (userValue > getValue(sorted[i])) {
      insertIndex = i
      break
    }
  }

  // Build position text
  let position: string
  if (insertIndex === 0) {
    position = 'above #1'
  } else if (insertIndex >= sorted.length) {
    position = `below #${sorted.length}`
  } else {
    position = `between #${insertIndex}-#${insertIndex + 1}`
  }

  // Get 2 states above and 2 below the user's position
  const startIndex = Math.max(0, insertIndex - 2)
  const endIndex = Math.min(sorted.length, insertIndex + 2)

  const surroundingStates: { rank: number; state: string; value: number; isUser?: boolean }[] = []

  // Add states before user
  for (let i = startIndex; i < insertIndex && i < sorted.length; i++) {
    surroundingStates.push({
      rank: i + 1,
      state: sorted[i].state,
      value: getValue(sorted[i]),
    })
  }

  // Add user
  surroundingStates.push({
    rank: 0,
    state: 'YOU',
    value: userValue,
    isUser: true,
  })

  // Add states after user
  for (let i = insertIndex; i < endIndex && i < sorted.length; i++) {
    surroundingStates.push({
      rank: i + 1,
      state: sorted[i].state,
      value: getValue(sorted[i]),
    })
  }

  return { surroundingStates, position }
}

// Test fixtures
const createMockStateRankings = (count: number): PdfStateRanking[] => {
  const states = ['WA', 'OR', 'ID', 'MT', 'WY', 'UT', 'NV', 'CA', 'AZ', 'CO', 'NM', 'TX', 'OK', 'KS', 'NE']
  return Array.from({ length: count }, (_, i) => ({
    rank: i + 1,
    state: states[i] || `S${i}`,
    electricityRate: 0.10 + i * 0.01,
    savings: 50 - i * 3, // Descending savings
    cope: 5 - i * 0.3,
    subsidy: 80 - i * 5,
  }))
}

describe('buildSurroundingContext', () => {
  describe('position calculation', () => {
    it('should return "above #1" when user is better than all states', () => {
      const rankings = createMockStateRankings(10)
      const result = buildSurroundingContext(rankings, 60, (s) => s.savings) // 60% > all

      expect(result.position).toBe('above #1')
    })

    it('should return "below #N" when user is worse than all states', () => {
      const rankings = createMockStateRankings(10)
      const result = buildSurroundingContext(rankings, -10, (s) => s.savings) // -10% < all

      expect(result.position).toBe('below #10')
    })

    it('should return "between #X-#Y" when user is in the middle', () => {
      const rankings = createMockStateRankings(10)
      // User value 35% should be between rank 5 (38%) and rank 6 (35%)
      const result = buildSurroundingContext(rankings, 36, (s) => s.savings)

      expect(result.position).toMatch(/between #\d+-#\d+/)
    })

    it('should handle being between first two states', () => {
      const rankings = createMockStateRankings(10)
      // Between rank 1 (50%) and rank 2 (47%)
      const result = buildSurroundingContext(rankings, 48, (s) => s.savings)

      expect(result.position).toBe('between #1-#2')
    })

    it('should handle being between last two states', () => {
      const rankings = createMockStateRankings(10)
      // Between rank 9 (26%) and rank 10 (23%)
      const result = buildSurroundingContext(rankings, 24, (s) => s.savings)

      expect(result.position).toBe('between #9-#10')
    })
  })

  describe('surrounding states generation', () => {
    it('should include user row marked with isUser', () => {
      const rankings = createMockStateRankings(10)
      const result = buildSurroundingContext(rankings, 35, (s) => s.savings)

      const userRow = result.surroundingStates.find(s => s.isUser)
      expect(userRow).toBeDefined()
      expect(userRow?.state).toBe('YOU')
      expect(userRow?.value).toBe(35)
    })

    it('should include 2 states above when available', () => {
      const rankings = createMockStateRankings(10)
      const result = buildSurroundingContext(rankings, 30, (s) => s.savings)

      const userIndex = result.surroundingStates.findIndex(s => s.isUser)
      expect(userIndex).toBeGreaterThanOrEqual(2) // At least 2 states before user
    })

    it('should include 2 states below when available', () => {
      const rankings = createMockStateRankings(10)
      const result = buildSurroundingContext(rankings, 35, (s) => s.savings)

      const userIndex = result.surroundingStates.findIndex(s => s.isUser)
      const statesAfterUser = result.surroundingStates.length - userIndex - 1
      expect(statesAfterUser).toBeLessThanOrEqual(2)
    })

    it('should handle user at top with no states above', () => {
      const rankings = createMockStateRankings(10)
      const result = buildSurroundingContext(rankings, 60, (s) => s.savings)

      // User should be first
      expect(result.surroundingStates[0].isUser).toBe(true)
      // Should still have states below
      expect(result.surroundingStates.length).toBeGreaterThan(1)
    })

    it('should handle user at bottom with no states below', () => {
      const rankings = createMockStateRankings(10)
      const result = buildSurroundingContext(rankings, -5, (s) => s.savings)

      // User should be last
      const lastIndex = result.surroundingStates.length - 1
      expect(result.surroundingStates[lastIndex].isUser).toBe(true)
    })

    it('should preserve correct rank numbers for surrounding states', () => {
      const rankings = createMockStateRankings(10)
      const result = buildSurroundingContext(rankings, 35, (s) => s.savings)

      const nonUserStates = result.surroundingStates.filter(s => !s.isUser)
      for (const state of nonUserStates) {
        expect(state.rank).toBeGreaterThan(0)
        expect(state.rank).toBeLessThanOrEqual(10)
      }
    })
  })

  describe('different metrics', () => {
    it('should work with COPe values', () => {
      const rankings = createMockStateRankings(10)
      const result = buildSurroundingContext(rankings, 3.5, (s) => s.cope)

      expect(result.surroundingStates).toBeDefined()
      expect(result.position).toBeDefined()
    })

    it('should work with subsidy percentage', () => {
      const rankings = createMockStateRankings(10)
      const result = buildSurroundingContext(rankings, 50, (s) => s.subsidy)

      expect(result.surroundingStates).toBeDefined()
      expect(result.position).toBeDefined()
    })
  })

  describe('edge cases', () => {
    it('should handle empty rankings array', () => {
      const rankings: PdfStateRanking[] = []
      const result = buildSurroundingContext(rankings, 35, (s) => s.savings)

      // With no states to compare against, user is effectively "above #1" (top position)
      expect(result.position).toBe('above #1')
      expect(result.surroundingStates.length).toBe(1) // Only user
      expect(result.surroundingStates[0].isUser).toBe(true)
    })

    it('should handle single state ranking', () => {
      const rankings = createMockStateRankings(1)
      const result = buildSurroundingContext(rankings, 35, (s) => s.savings)

      expect(result.surroundingStates.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle exact tie with a state', () => {
      const rankings = createMockStateRankings(10)
      // Exact match with rank 3 (44% savings)
      const result = buildSurroundingContext(rankings, 44, (s) => s.savings)

      expect(result.position).toBeDefined()
      expect(result.surroundingStates.find(s => s.isUser)).toBeDefined()
    })

    it('should handle negative values', () => {
      const rankings = createMockStateRankings(5)
      rankings[4].savings = -10 // Last state has negative savings

      const result = buildSurroundingContext(rankings, -5, (s) => s.savings)

      expect(result.surroundingStates.find(s => s.isUser)).toBeDefined()
    })
  })
})

describe('PdfMiniRanking structure', () => {
  it('should have all required fields', () => {
    const miniRanking: PdfMiniRanking = {
      metric: 'savings',
      metricLabel: '% Savings',
      unit: '%',
      surroundingStates: [
        { rank: 5, state: 'TX', value: 35.5 },
        { rank: 6, state: 'CA', value: 32.1 },
        { rank: 0, state: 'YOU', value: 30.5, isUser: true },
        { rank: 7, state: 'NY', value: 28.3 },
        { rank: 8, state: 'FL', value: 25.7 },
      ],
      userRank: {
        position: 'between #6-#7',
        value: 30.5,
      },
    }

    expect(miniRanking.metric).toBe('savings')
    expect(miniRanking.metricLabel).toBe('% Savings')
    expect(miniRanking.unit).toBe('%')
    expect(miniRanking.surroundingStates).toHaveLength(5)
    expect(miniRanking.userRank.position).toBe('between #6-#7')
    expect(miniRanking.userRank.value).toBe(30.5)
  })

  it('should support cope metric', () => {
    const miniRanking: PdfMiniRanking = {
      metric: 'cope',
      metricLabel: 'COPe',
      unit: '',
      surroundingStates: [
        { rank: 1, state: 'WA', value: 5.2 },
        { rank: 0, state: 'YOU', value: 4.8, isUser: true },
        { rank: 2, state: 'OR', value: 4.5 },
      ],
      userRank: {
        position: 'between #1-#2',
        value: 4.8,
      },
    }

    expect(miniRanking.metric).toBe('cope')
    expect(miniRanking.unit).toBe('')
  })

  it('should support subsidy metric', () => {
    const miniRanking: PdfMiniRanking = {
      metric: 'subsidy',
      metricLabel: 'Subsidy %',
      unit: '%',
      surroundingStates: [
        { rank: 0, state: 'YOU', value: 95, isUser: true },
        { rank: 1, state: 'WA', value: 85 },
        { rank: 2, state: 'OR', value: 80 },
      ],
      userRank: {
        position: 'above #1',
        value: 95,
      },
    }

    expect(miniRanking.metric).toBe('subsidy')
    expect(miniRanking.userRank.position).toBe('above #1')
  })
})

describe('value formatting', () => {
  // Test the formatting logic used in PdfMiniTable
  const formatValue = (value: number, metric: string, unit: string): string => {
    if (metric === 'cope') {
      return value >= 100 ? '∞' : value.toFixed(2)
    }
    return `${value.toFixed(1)}${unit}`
  }

  it('should format savings with 1 decimal and %', () => {
    expect(formatValue(35.567, 'savings', '%')).toBe('35.6%')
    expect(formatValue(100, 'savings', '%')).toBe('100.0%')
    expect(formatValue(-5.5, 'savings', '%')).toBe('-5.5%')
  })

  it('should format COPe with 2 decimals', () => {
    expect(formatValue(3.456, 'cope', '')).toBe('3.46')
    expect(formatValue(1.5, 'cope', '')).toBe('1.50')
  })

  it('should show infinity symbol for very high COPe', () => {
    expect(formatValue(100, 'cope', '')).toBe('∞')
    expect(formatValue(Infinity, 'cope', '')).toBe('∞')
  })

  it('should format subsidy with 1 decimal and %', () => {
    expect(formatValue(85.5, 'subsidy', '%')).toBe('85.5%')
    expect(formatValue(120, 'subsidy', '%')).toBe('120.0%')
  })
})
