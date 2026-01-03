# CLAUDE.md - Project Context for Claude Code

## Project Overview

**webapp-calculators** is a React + TypeScript web application that provides energy economics calculators. The calculators help users analyze the financial viability of alternative energy strategies.

### Current Calculators

1. **Hashrate Heating Calculator** (`/hashrate-heating`) - Compares bitcoin mining heaters vs traditional electric heating using COPe (Coefficient of Performance equivalent) methodology
2. **Solar Monetization Calculator** (`/solar-monetization`) - Compares monetizing excess solar via bitcoin mining vs traditional net metering

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom design tokens
- **Routing**: React Router v7
- **State Management**: React useState + useMemo for derived calculations
- **Charts**: Recharts
- **Icons**: Lucide React

## Project Structure

```
src/
├── api/           # External API integrations
│   ├── bitcoin.ts # CoinGecko, Mempool.space, Braiins APIs
│   └── solar.ts   # NREL PVWatts, Zippopotam geocoding
├── calculations/  # Pure calculation logic
│   ├── hashrate.ts # COPe, heating economics, BTC mining
│   └── solar.ts    # Solar production, net metering comparison
├── components/    # Reusable UI components
│   ├── Layout.tsx      # Main layout wrapper
│   ├── SmartTooltip.tsx # Contextual help tooltips
│   ├── InputField.tsx   # Form input with prefix/suffix
│   └── StateHeatMap.tsx # US state visualization
├── pages/         # Main calculator pages
│   ├── HashrateHeating.tsx  # ~1,900 lines
│   └── SolarMonetization.tsx # ~1,300 lines
├── types/         # TypeScript type definitions
└── App.tsx        # Router and app entry
```

## External APIs

### Bitcoin Data
- **CoinGecko** (`api.coingecko.com`) - BTC price in USD
- **Mempool.space** (`mempool.space/api`) - Transaction fees, difficulty adjustments
- **Braiins** (`insights.braiins.com/api`) - Network hashrate, hashprice

### Solar Data
- **NREL PVWatts** (`developer.nrel.gov/api/pvwatts`) - Solar production estimates by location
- **Zippopotam** (`api.zippopotam.us`) - ZIP code to lat/long geocoding

## Key Calculations

### Hashrate Heating (`src/calculations/hashrate.ts`)
- **COPe (Coefficient of Performance equivalent)**: Measures heating value including BTC rewards
- Formula: `COPe = (heating_value + btc_revenue) / electricity_cost`
- Accounts for: electricity rates, BTC price, network difficulty, hardware efficiency

### Solar Monetization (`src/calculations/solar.ts`)
- **Net Metering Comparison**: Compares selling excess solar to grid vs mining BTC
- Three compensation types: Bill Credits (~12¢/kWh), Net Billing (~5¢/kWh), Annual Cash-Out (~2¢/kWh)
- Uses NREL data for location-specific solar production estimates

## Development Commands

```bash
npm run dev      # Start dev server (port 5173)
npm run build    # Production build with TypeScript check
npm run lint     # ESLint check
npm run preview  # Preview production build
```

## Code Patterns

### State Management
- Each calculator uses local state with `useState`
- Derived values computed with `useMemo` for performance
- Input validation happens at the component level

### Input Components
```tsx
<InputField
  label="Label"
  type="number"
  value={value}
  onChange={setValue}
  prefix="$"
  suffix="/kWh"
  tooltip="Help text"
/>
```

### Tooltips
```tsx
<SmartTooltip content="Explanation text" />
```

### Styling Conventions
- Tailwind utility classes throughout
- Dark mode support via `dark:` variants
- Surface color tokens: `surface-50` through `surface-900`
- Primary action color: `green-500`

## Current Branch: solar-monetization

Recent work on this branch:
- Added compensation type selector (Bill Credits, Net Billing, Annual Cash-Out)
- Quick Select UI for common net metering scenarios
- Dynamic rate defaults based on compensation type
- Tooltips explaining each compensation structure

## Testing Notes

- No test framework currently configured
- Manual testing via dev server
- Build command includes TypeScript type checking

## Common Tasks

### Adding a New Input Field
1. Add state variable with `useState`
2. Add `InputField` component in the input grid
3. Include in relevant `useMemo` calculations

### Adding API Data
1. Create fetch function in appropriate `src/api/` file
2. Call from component with `useEffect`
3. Handle loading and error states

### Modifying Calculations
1. Update pure functions in `src/calculations/`
2. Ensure `useMemo` dependencies are correct
3. Verify results display updates
