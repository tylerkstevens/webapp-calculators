# Exergy Heat Calculator Web App - Technical Specification

**Version:** 1.3
**Last Updated:** 2026-01-13
**Status:** Production (Live)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Solar Monetization Calculator](#solar-monetization-calculator)
3. [Hashrate Heating Calculator](#hashrate-heating-calculator)
4. [Global Web App Specifications](#global-web-app-specifications)
5. [Shared Components & Patterns](#shared-components--patterns)
6. [Testing Strategy](#testing-strategy)
7. [Success Criteria](#success-criteria)

---

## Project Overview

**webapp-calculators** is a React + TypeScript web application providing energy economics calculators focused on bitcoin mining and alternative energy strategies. The application helps users analyze the financial viability of hashrate heating and solar bitcoin mining.

### Tech Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom design tokens
- **Routing**: React Router v7
- **State Management**: React useState + useMemo
- **Charts**: Recharts + custom SVG charts
- **Icons**: Lucide React
- **PDF Generation**: Custom PDF report system

### Current Calculators
1. **Solar Monetization** (`/solar-monetization`) - Bitcoin mining revenue from solar PV systems
2. **Hashrate Heating** (`/hashrate-heating`) - COPe analysis comparing hashrate heating to traditional fuels

---

## Solar Monetization Calculator

### Purpose
Estimate bitcoin mining revenue potential from solar photovoltaic systems. Helps users determine if mining their solar production or excess energy is more profitable than traditional net metering.

### Calculation Modes

The calculator has three distinct input modes:

#### Mode 1: Estimate from System Size
- **User Provides**: ZIP code, system size (kW)
- **System Fetches**: NREL PVWatts solar production estimate for location
- **Use Case**: Users who know their system specs but want location-based estimates

#### Mode 2: Use Actual Production
- **User Provides**: Actual solar production data (annual total OR monthly breakdown)
- **Use Case**: Users with historical solar data from monitoring apps or utility bills
- **Data Entry Options**:
  - Annual total (kWh/year) - auto-distributed by seasonal sun hours
  - Monthly breakdown (12 values) - more accurate calculations

#### Mode 3: Excess Energy Comparison
- **User Provides**: Excess grid export data, net metering compensation type and rate
- **Purpose**: Compare mining excess solar vs selling back to grid
- **Compensation Types**:
  - Bill Credits (~$0.12/kWh) - 1:1 kWh credit offset
  - Net Billing (~$0.05/kWh) - Utility's avoided cost rate
  - Annual Cash-Out (~$0.02/kWh) - Year-end excess buyback

### Input Fields

#### Location & System (All Modes)
- **ZIP Code**
  - Type: 5-digit US ZIP code
  - Validation: Must be valid US ZIP
  - API: Zippopotam geocoding → NREL PVWatts
  - Tooltip: "US zip code for your installation. We use NREL PVWatts solar data for your location to estimate production."

- **System Size**
  - Type: Number (kW)
  - Validation: Must be > 0, no upper limit
  - Default: 10 kW
  - Tooltip: "Peak DC capacity in kW. Find this on your solar panel installation paperwork or inverter specs. Typical residential systems are 5-10 kW."

#### Production Data (Mode 2 only)
- **Annual Production** (if annual entry selected)
  - Type: Number (kWh)
  - Validation: Must be > 0
  - Tooltip: "Total kWh generated in one year. Find this on your solar monitoring app (Enphase, SolarEdge, etc.) or utility bill under 'Solar Generation' or 'Customer Generation'."

- **Monthly Production Grid** (if monthly entry selected)
  - 12 input fields (Jan-Dec)
  - Auto-totals annual sum
  - Tooltip: "Monthly generation in kWh. Find this on your solar monitoring app (Enphase, SolarEdge, etc.) or utility bill under 'Solar Generation' or 'Customer Generation'."

#### Excess Export Data (Mode 3 only)
- **Annual Grid Export** (if annual entry selected)
  - Type: Number (kWh)
  - Validation: Must be > 0
  - Tooltip: "Total kWh sent to grid annually. Look for 'Energy Delivered to Grid', 'Net Export', or 'Excess Generation' on your utility bill. Some bills show this as negative kWh."

- **Monthly Export Grid** (if monthly entry selected)
  - 12 input fields (Jan-Dec)
  - Auto-totals annual sum

- **Compensation Type Quick Select**
  - Three buttons: Bill Credits, Net Billing, Annual Cash-Out
  - Auto-populates default rate, user can override
  - Each has tooltip explaining the compensation structure

- **Your Rate**
  - Type: Number ($/kWh)
  - Updates when compensation type changes
  - User can manually override
  - Tooltip: "Your actual export compensation rate. Find this on your utility bill under 'Export Credit Rate', 'Net Metering Rate', or 'Avoided Cost'. Contact your utility if you're unsure of your exact rate."

#### Miner Selection (All Modes)
- **Miner Model**
  - Dropdown with presets + "Custom" option
  - Tooltip: "Choose your miner model or enter custom specs. More efficient miners (lower W/TH) earn more BTC per kWh of solar energy."

- **Power** (W)
  - Auto-filled from preset, editable for custom
  - Validation: Must be > 0

- **Hashrate** (TH/s)
  - Auto-filled from preset, editable for custom
  - Validation: Must be > 0

**Note**: Miner quantity input is REMOVED. Calculations assume all solar power is used for mining with the selected miner's efficiency.

### Miner Presets (Global)
```typescript
[
  { name: 'Heatbit Trio', powerW: 400, hashrateTH: 10 },
  { name: 'Heatbit Maxi', powerW: 1500, hashrateTH: 39 },
  { name: 'Avalon Mini 3', powerW: 850, hashrateTH: 40 },
  { name: 'Avalon Q', powerW: 1700, hashrateTH: 90 },
  { name: 'Whastminer M64', powerW: 5000, hashrateTH: 228 },
  { name: 'Bitmain S19j Pro', powerW: 3068, hashrateTH: 104 },
  { name: 'Bitmain S19k Pro', powerW: 2760, hashrateTH: 120 },
  { name: 'Bitmain S9', powerW: 1400, hashrateTH: 13.5 },
  { name: 'Single Board S19', powerW: 850, hashrateTH: 30 }  // NEW
]
```

### Calculation Logic

#### Core Revenue Formula (kWh-Based with Hashvalue)

The calculator answers: **"What if all my solar energy was mined?"**

Only miner efficiency (J/TH) matters - not power or hashrate individually. Revenue is derived directly from kWh production using the live hashvalue (sats/TH/day) calculated from network data.

```
For each month:
  total_hours = days_in_month × 24
  avg_power_W = (monthly_kWh × 1000) / total_hours
  avg_hashrate_TH = avg_power_W / efficiency_J_TH
  monthly_sats = avg_hashrate_TH × hashvalue_sats × days_in_month
  monthly_btc = monthly_sats / 1e8
```

Or equivalently (simplified formula):
```
monthly_sats = (monthly_kWh × 1000 / efficiency_J_TH) × (hashvalue_sats / 24)
```

**For Total Production Modes (Estimate/Production):**
- Use monthly kWh from NREL or user input
- Apply formula above to calculate monthly BTC
- Sum for annual total

**For Excess Energy Mode:**
- Same formula but using monthly excess kWh
- Compare mining revenue to (excess_kWh × net_metering_rate)

#### Monthly Distribution
- **Estimate mode**: Use NREL monthly production directly (already location-specific)
- **Production mode with annual input**: Distribute by NREL's monthly production ratios (if available) or generic seasonal factors
- **Production mode with monthly input**: Use user's exact monthly values
- **Excess mode with annual input**: Distribute by NREL production ratios or generic seasonal factors (excess correlates with production)
- **Excess mode with monthly input**: Use user's exact monthly values

### Bitcoin Network Data (Three-Knob Override System)

The calculator displays live BTC network data with a three-knob override system. Data is sourced from CoinGecko (price) and Mempool.space (network hashrate, transaction fees).

#### Knob 1: Price Group (BTC Price ↔ Hashprice)
- **BTC Price** (editable) - Current bitcoin price in USD
- **Hashprice** (editable) - USD earned per TH/s/day
- Relationship: `hashprice = hashvalue × btcPrice / 1e8`
- Editing one recalculates the other

#### Knob 2: Network Group (Hashvalue ↔ Network Hashrate)
- **Hashvalue** (editable) - Sats earned per TH/s/day
- **Network Hashrate** (editable) - Total network hashrate in EH/s
- Editing one recalculates the other (holding Fee % constant)

#### Knob 3: Fee Slider (Transaction Fees % of Reward)
- **Label**: "Fees (% of reward)"
- **Type**: Slider (0-99%) + text input
- **Default**: Live fee % from mempool.space API (144-block average)
- **Step size**: 1%
- **Layout**: Slider left, input right; stacks vertically on mobile
- **Position**: Inside Network Group (orange-bordered section)
- **Keyboard support**: Arrow keys (1%), Page Up/Down (10%), Home/End (0%/99%)

#### Three-Knob Recalculation Logic

**Key Principle**: Fee % is the "anchor" - it is NEVER implied/recalculated from other values. Only Hashvalue and Network Hashrate can be derived.

| User Adjusts | Held Constant | Recalculated |
|--------------|---------------|--------------|
| Fee % | Network Hashrate | Hashvalue |
| Hashvalue | Fee % | Network Hashrate |
| Network Hashrate | Fee % | Hashvalue |

**Formula for recalculation:**
```
block_subsidy = 50 / (2 ^ floor(block_height / 210000))  // Auto-halving
total_reward = block_subsidy / (1 - fee_percent/100)
daily_reward_sats = total_reward × 144 × 1e8
hashvalue = daily_reward_sats / network_hashrate_TH
```

#### Override Behavior
- Default: Show live data with "(Live)" indicator
- When overridden: Show user value, calculate implied values, show "(implied)" label on derived values
- **Fee % never shows "(implied)"** - it's either live or user-set
- **Reset button**: Single "Reset to live data" button resets ALL overrides (BTC price, hashprice, hashvalue, hashrate, and fee %)
- **Fallback**: If mempool.space API fails, default to 6% fee

#### Tooltips for Three-Knob System
- **Price Group Tooltip**: "BTC Price and Hashprice are linked. Editing one recalculates the other based on current network hashvalue. This lets you model different bitcoin price scenarios while maintaining network consistency."

- **Network Group Tooltip**: "Network Hashrate and Hashvalue are linked through the Fee % setting. Editing Hashvalue or Hashrate recalculates the other while keeping Fee % constant. This lets you model different network conditions."

- **Fee Slider Tooltip**: "Transaction fees as a percentage of total block reward (subsidy + fees). Miners earn both the block subsidy (currently {subsidy} BTC) and transaction fees. This slider lets you model different fee environments. When you adjust Fee %, the Hashvalue is recalculated while Network Hashrate stays fixed. Current live fee % reflects the last 144 blocks (~24 hours)."

### Results Display

#### Unified Results Layout (Both Total Production and Excess Modes)

All result sections have consistent structure regardless of mode:

**Result Cards** (2x2 grid layout using `grid grid-cols-1 sm:grid-cols-2`):
1. **Annual Production** (or "Annual Excess" for Excess mode)
   - Total kWh annually
   - Miner efficiency (J/TH)
   - Tooltip: "Total solar energy available for mining. Revenue is calculated directly from kWh production using your miner's efficiency."

2. **Annual BTC Earnings**
   - BTC amount + sats
   - USD value at current price
   - Shows full system data in Estimate/Production modes
   - Shows excess-only data in Excess mode (calculated from grid export)
   - Tooltip (comprehensive): "Total bitcoin mined annually using your solar power. Calculated from your hashrate (based on miner efficiency) and solar production hours. Assumes static BTC price and network conditions - actual earnings depend on BTC price when you sell and network difficulty changes over time. Does not account for future volatility."

3. **Monthly Average**
   - BTC amount + sats
   - USD value
   - Shows full system average in Estimate/Production modes
   - Shows excess-only average in Excess mode
   - Tooltip: "Average monthly mining revenue. Summer months typically earn more due to higher solar production. Remember this assumes current BTC price and network conditions throughout the year."

4. **Revenue per kWh**
   - $/kWh and sats/kWh
   - Shows full system efficiency in Estimate/Production modes
   - Shows excess-only efficiency in Excess mode
   - Tooltip: "How much value you extract from each kWh of solar power via mining. Compare this to your utility's net metering rate to see relative value. Higher miner efficiency = higher revenue per kWh."

**REMOVED Cards**:
- Mining Capacity (no longer relevant without miner quantity)
- Solar Utilization (no longer relevant without miner quantity)

#### Monthly Revenue & Generation Chart (Dual-Axis)

**Chart Type**: Bar chart with line overlay
- **Bars**: Monthly revenue (left Y-axis, USD scale)
  - Primary label: USD value (e.g., "$427")
  - Subtitle label: Sats value (e.g., "2.1M sats")
  - Labels inside bars for tall bars (h >= 40px), above bars for short bars
- **Line**: Monthly solar generation (right Y-axis, kWh scale)
  - Overlaid line showing kWh pattern
- **Axes**: Auto-scaled independently
- **Interactive**: Hover shows exact values at mouse position (viewBox-scaled coordinates)
- **Caption**: "Monthly mining revenue varies with seasonal solar production. Chart assumes static BTC price and network conditions."
- **Display**: Shows in all three modes (Estimate, Production, and Excess)
  - Excess mode uses excess-specific data (not full system production)
- **Key property**: Revenue bars are always proportional to generation line (both derived from same kWh source)

#### Excess Mode Additional Display

When in Excess mode, show comparison card:
- Net metering value ($/year at selected rate)
- Mining revenue ($/year + BTC amount)
- Advantage (mining vs net metering)
- Multiplier (how many times better)
- Recommendation banner (green if mining better, amber if net metering better)

**Excess Mode Specific Behavior:**
- Result cards display excess-only data (not full system capacity)
- Monthly chart shows excess export kWh (not total production)
- No "Mining Setup Details" card shown
- No empty state placeholders displayed

### Edge Cases & Validation

#### Invalid Location
- **Trigger**: ZIP code not found or NREL API fails
- **Behavior**: Show error message "Invalid zip code - please verify and try again", clear results
- **Recovery**: User must enter valid ZIP or switch to Production mode

#### Zero Solar Production
- **Trigger**: User enters 0 kWh in Production or Excess mode
- **Behavior**: Show guidance message "For production estimates, try the 'Estimate from system size' mode instead"
- **Recovery**: Guide user to correct mode

#### Missing Required Fields
- **Trigger**: Required field empty when switching modes
- **Behavior**: Show error "Enter [field name] to calculate mining revenue"
- **Recovery**: User fills required field

### Calculation Assumptions (Must Document in Tooltips)

1. **100% solar utilization**: Assumes all solar energy (kWh) goes to mining with no household consumption, grid export (in total production modes), or curtailment.

2. **Energy-based calculation**: The calculator treats total kWh as if spread evenly over the period, calculating average equivalent hashrate. This is a "what if" model, not a real-time operational model.

3. **Static BTC price and network**: Uses current BTC price and hashvalue across all months. Does not model future difficulty adjustments, price volatility, or fee changes.

4. **No operational considerations**: Does not model miner sizing, intermittency, or actual power-matching requirements. Only miner efficiency (J/TH) matters for revenue calculation.

### API Integrations

#### NREL PVWatts
- **Endpoint**: `https://developer.nrel.gov/api/pvwatts/v8.json`
- **Authentication**: API key from `VITE_NREL_API_KEY` env variable
- **Geocoding**: Zippopotam (`api.zippopotam.us/us/{zipCode}`) for ZIP → lat/lon
- **Fallback**: US average (1400 kWh/kW, generic seasonal pattern) if API fails
- **Debounce**: 500ms delay on ZIP code changes

#### Bitcoin Network Data (CoinGecko + Mempool.space)

**CoinGecko (Price Data)**:
- **Endpoint**: `https://api.coingecko.com/api/v3/simple/price`
- **Data**: BTC price in USD
- **Rate Limits**: ~50 req/min (free tier)

**Mempool.space (Network & Fee Data)**:
- **Hashrate Endpoint**: `https://mempool.space/api/v1/mining/hashrate/1m`
  - Returns: `currentHashrate` (H/s), `currentDifficulty`
- **Reward Stats Endpoint**: `https://mempool.space/api/v1/mining/reward-stats/144`
  - Returns: `startBlock`, `endBlock`, `totalReward`, `totalFee` (sats)
  - Used to calculate: avg fees per block, fee percentage
- **Block Height**: Derived from `endBlock` in reward-stats response

**Calculated Values**:
```typescript
// Block subsidy from height (auto-halving)
blockSubsidy = 50 / Math.pow(2, Math.floor(blockHeight / 210000))

// Fee calculations from reward-stats
avgFeesPerBlockSats = totalFee / 144
feePercent = (avgFeesPerBlockSats / (blockSubsidySats + avgFeesPerBlockSats)) * 100

// Hashvalue includes both subsidy and fees
dailyRewardSats = (blockSubsidySats + avgFeesPerBlockSats) * 144
hashvalueSats = dailyRewardSats / networkHashrateTH

// Hashprice in USD
hashpriceUSD = (hashvalueSats / 1e8) * btcPrice
```

**Refresh**: On component mount only
**Fallback**:
- Price: Show loading state
- Fee %: Default to 6% if reward-stats fails
- Show loading spinner until data arrives

### PDF Report

**Style**: Match hashrate heating PDF report design
- **Header**: Exergy Heat branding
- **Sections**:
  1. Summary (1-2 sentence overview)
  2. Input Categories (Bitcoin Data, Solar System, Mining Setup, Net Metering if applicable)
  3. Results (key metrics with explanations)
  4. Monthly Chart (revenue breakdown bar chart)
  5. Comparison table (if Excess mode)
- **Footer**: "Generated with Claude Code" badge, generation date
- **Filename**: `solar-mining-potential.pdf` or `solar-net-metering-comparison.pdf`

**Bitcoin Data Section in PDF**:
Always include:
- BTC Price: ${price}
- Hashprice: ${hashprice}/TH/day
- Network Hashrate: {hashrate} EH/s
- Transaction Fees: {feePercent}% of reward

---

## Hashrate Heating Calculator

### Purpose
Calculate the Coefficient of Performance - Economic (COPe) for hashrate heating systems. Compare the economics of bitcoin miner heating versus traditional fuel sources (natural gas, propane, heat pumps, etc.).

### Input Structure - Grouped Card Layout

**Design Goal**: Vary card widths, internal column layouts, and heights to create uniform overall appearance of input section.

#### Card 1: Location
- Country selector (US/Canada)
- Region/state selector
- Auto-populates regional electricity and fuel price averages

#### Card 2: Electricity
- **Electricity Rate** ($/kWh)
  - Manual input OR calculated from bill
- **Bill Calculator** (optional):
  - Bill Amount ($)
  - Bill Usage (kWh)
  - Calculates: rate = amount / usage
  - **Tooltip Enhancement**: "Find your total bill amount and kWh usage on your electric bill. Look for 'Total Amount Due' and 'Total kWh Used' or 'Electricity Usage'. Some bills split charges by rate tiers."

#### Card 3: Compare Fuel
- **Fuel Type** dropdown
  - Natural Gas, Propane, Heating Oil, Electric Resistance, Heat Pump, Wood Pellets
- **Fuel Rate** ($/unit)
  - Unit changes based on fuel type ($/therm, $/gallon, $/kWh, etc.)
- **Fuel Efficiency**
  - AFUE (0-1) for combustion fuels
  - COP for heat pumps
  - Locked at 1.0 for electric resistance
  - **Validation**: Soft warnings for values outside typical range, allow any positive number
- **Fuel Bill Calculator** (optional):
  - Bill Amount ($)
  - Usage (in fuel units)
  - Calculates rate
  - **Tooltip Enhancement**: "Enter your fuel bill total and usage to calculate your rate. Find usage on your bill as 'Therms Used' (natural gas), 'Gallons Delivered' (propane/oil), or similar units."

#### Card 4: Miner
- **Miner Model** dropdown (shared global presets + custom)
  - Tooltip: Same as Solar calculator
- **Power** (W)
- **Hashrate** (TH/s)

### Bitcoin Network Data
Same three-knob override system as Solar calculator. See Solar calculator section for details.

**Key Points for Hashrate Heating:**
- Fee % slider affects hashvalue, which affects daily mining revenue, which affects COPe
- All three knobs (BTC Price, Hashvalue/Hashrate, Fee %) work identically in both calculators
- Same slider position (inside Network Group), same layout, same keyboard support

### Calculation Logic

#### COPe Formula
```
R = Daily Mining Revenue / Daily Electricity Cost

where:
  Daily Mining Revenue = Daily BTC × BTC Price
  Daily BTC = (miner_hashrate / network_hashrate) × 144 blocks × 3.125 BTC
  Daily Electricity Cost = (miner_power_kW × 24 hours) × electricity_rate

COPe = 1 / (1 - R)

Special cases:
  - If R >= 1: COPe = ∞ (free heating or paid to heat)
  - If R < 0: Not valid (shouldn't happen with positive electricity rates)
```

#### Heating Status
- **Profitable** (R >= 1): Mining covers all costs or more
- **Subsidized** (0.5 < R < 1): Mining significantly reduces costs
- **Loss** (R <= 0.5): Still paying most of electricity cost

#### Arbitrage Calculation
```
Traditional Cost per kWh = (fuel_rate × kWh_to_fuel_units) / fuel_efficiency

Hashrate Cost per kWh = (Electricity Rate × (1 - R))

Savings % = ((Traditional - Hashrate) / Traditional) × 100

Monthly/Annual Savings = (Traditional - Hashrate) × monthly_heat_kWh × months
```

### Results Display

#### Primary Result Cards
1. **COPe**
   - Value (formatted as number, ∞, or "Paid to heat!")
   - Status indicator (profitable/subsidized/loss)
   - **Comprehensive Tooltip**: "Coefficient of Performance - Economic. Like COP for heat pumps but includes mining revenue. Formula: COPe = 1/(1-R) where R = mining revenue / electricity cost. Interpretation: COPe of 1 = full cost. COPe of 2 = 50% cost reduction. COPe of 10 = 90% cost reduction. COPe of ∞ = free or paid to heat. Compare to traditional heat pump COP (typically 2-4)."
   - Expandable chart (see below)

2. **Heating Subsidy (R)**
   - Percentage (0-100%+)
   - "X% of electricity paid by mining"
   - Expandable chart

3. **Effective Heating Cost**
   - $/kWh, $/MMBTU, $/therm
   - Net cost after BTC revenue offset

4. **Break-even Electricity Rate**
   - $/kWh where COPe = ∞ (free heating)

5. **Savings vs [Fuel Type]**
   - Percentage savings
   - Monthly/annual dollar savings
   - Expandable chart with variable X-axis

#### Expandable Chart Interactivity

**Current Issues to Fix**:
1. Add hover states showing exact values at mouse position
2. Improve COPe infinity visualization (currently plateaus)

**Enhancements**:
- **Hover Interaction**:
  - As mouse moves over chart, show exact X and Y values at cursor position
  - Display in small tooltip or overlay near cursor
  - Update current value marker to follow cursor

- **COPe Chart Infinity Visualization**:
  - Use compressed upper range instead of plateau
  - Normal linear scale from COPe 0-10
  - Compressed scale from COPe 10-100 (smaller visual space)
  - Asymptote to ∞ symbol at top of chart
  - Y-axis labels: 0, 2, 5, 10, 25, 50, 100, ∞

**Variable X-Axis Options**:
- All charts: Electricity Rate, Miner Efficiency, Hashprice
- Savings chart additionally: Fuel Rate (hidden for electric fuel types)

#### State Heat Map
- Shows US state-by-state savings potential
- Color gradient based on savings percentage
- **Status**: Working well, keep as-is
- **Future**: Could add Canada provinces, make interactive

### Edge Cases & Validation

#### Zero or Negative Rates
- **Electricity Rate <= 0**: Block with error "Electricity rate must be greater than $0"
- **Fuel Rate <= 0**: Block with error "Fuel rate must be greater than $0"
- **Rationale**: Prevents division by zero and nonsensical results

#### Invalid Fuel Efficiency
- **Trigger**: Combustion fuel >100% efficiency (>1.0), heat pump COP <1.0, extreme values
- **Behavior**: Soft warning "Efficiency outside typical range for [fuel type]. Typical range: [X-Y]"
- **Allow**: Any positive value (user may have unusual system)

### Calculation Assumptions

1. **24/7 miner operation**: Assumes continuous mining for full heat output and revenue

2. **Static BTC price and network**: Uses current BTC price and network conditions. Does not model future difficulty adjustments, price volatility, or fee changes.

3. **100% heat utilization**: Assumes all miner heat output is useful and displaces traditional heating sources

4. **Energy arbitrage focus**: This calculator compares heating fuel economics, not modeling actual energy loads or consumption patterns

### Transaction Fees in Network Calculations

**Fee % Slider Integration**:
The Fee % slider makes transaction fee handling explicit and user-controllable:

1. **Live Data**: Mempool.space reward-stats provides actual fee % from last 144 blocks
2. **Override Scenarios**: Fee % is held constant when user adjusts Hashvalue or Hashrate
3. **User Control**: User can model any fee environment (low fees = 1%, high fees = 50%+)

**For Override Calculations**:
- When user overrides **Fee %** → Hold Hashrate → Recalculate Hashvalue
- When user overrides **Hashvalue** → Hold Fee % → Recalculate Network Hashrate
- When user overrides **Network Hashrate** → Hold Fee % → Recalculate Hashvalue

**Formula:**
```
total_reward_per_block = block_subsidy / (1 - fee_percent/100)
daily_reward_sats = total_reward_per_block × 144 × 1e8
hashvalue = daily_reward_sats / network_hashrate_TH
```

**Tooltip Clarification**: Hashvalue includes both block subsidy and transaction fees. The Fee % slider shows what portion of the total reward comes from fees.

### PDF Report

**Requirements**:
- Verify all calculations match on-screen results
- Add/improve explanatory paragraphs for COPe, subsidy %, savings
- Ensure completeness: all inputs, assumptions, results included
- Match visual design, content structure, and branding of existing report

**Bitcoin Data Section in PDF**:
Always include:
- BTC Price: ${price}
- Hashprice: ${hashprice}/TH/day
- Network Hashrate: {hashrate} EH/s
- Transaction Fees: {feePercent}% of reward

---

## Global Web App Specifications

### Navigation & Structure

**Current Structure** (Keep as-is):
- Home page (`/`) - Calculator selection cards
- Calculator pages (`/solar-monetization`, `/hashrate-heating`)
- No persistent navbar or sidebar
- No breadcrumbs

### Footer

**Design Requirement**: Match exergyheat.com footer for brand consistency
- Links, copyright, social media as per main website
- Ensure footer appears on all pages

### Design System

**Brand Consistency**: Match exergyheat.com branding
- **Colors**: Use same primary, secondary, accent colors
- **Typography**: Match font families, sizes, weights
- **Spacing**: Consistent padding, margins, gaps
- **Components**: Buttons, cards, inputs should match main site style

**Tailwind Tokens**:
- `surface-*`: Grayscale tokens for backgrounds, borders, text
- `primary-*`: Brand color (green)
- `accent-*`: Highlight colors
- Dark mode variants with `dark:` prefix

### Dark Mode

**Implementation**: Auto-detect system preference + manual toggle

**Requirements**:
1. Default to user's system preference (prefers-color-scheme)
2. Provide manual toggle button in header/nav
3. Save user preference in localStorage
4. User override persists across sessions
5. Smooth transition between themes

### Responsive Design

**Priority**: Equal importance for desktop and mobile
- Test thoroughly on both platforms
- Ensure charts, tables, inputs work well on mobile
- Touch-friendly tap targets (minimum 44x44px)
- Readable text sizes on small screens
- Horizontal scrolling only where necessary (charts)

**Breakpoints** (Tailwind defaults):
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### SEO & Metadata

**Full SEO Optimization Required**:

1. **Page Titles & Descriptions**
   - Unique title tags for each calculator
   - Compelling meta descriptions (150-160 characters)
   - Keywords: bitcoin mining, solar, heating, COPe, hashrate

2. **OpenGraph Tags**
   - og:title, og:description, og:image for each page
   - Twitter card tags
   - Proper og:type (website/article)

3. **Structured Data**
   - Schema.org JSON-LD for calculators
   - Organization markup
   - Breadcrumb markup (if added later)

4. **Technical SEO**
   - Sitemap.xml generation
   - Robots.txt configuration
   - Canonical URLs
   - Proper heading hierarchy (h1 → h2 → h3)

### Browser Support

**Target**: Modern browsers only
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)
- **No IE11 support**

### Performance Standards

**Reasonable Performance** with Vite defaults:
- Utilize Vite's automatic code splitting
- Lazy load calculator pages (React.lazy)
- Optimize images (appropriate formats, compression)
- No specific performance budget constraints
- Monitor bundle size, keep it reasonable (<500KB initial JS)

### Analytics & Privacy

**No Tracking**: Privacy-first approach
- No Google Analytics
- No user behavior tracking
- No third-party analytics scripts
- No cookies for tracking purposes
- Only essential cookies (dark mode preference, etc.)

### Accessibility

**Basic Level**: Current state is acceptable
- Semantic HTML structure
- Proper heading hierarchy
- Alt text on images
- Form labels associated with inputs
- Keyboard accessible (tab navigation works)
- **No formal WCAG AA compliance testing required** (but good practices encouraged)

---

## Shared Components & Patterns

### Reusable UI Components

#### InputField
- Standardized input with label, prefix/suffix, help text, tooltips
- Supports text, number, email types
- Validation states (error, success)
- Dark mode compatible

#### SelectField
- Dropdown selector with label
- Options array
- Dark mode compatible

#### SmartTooltip
- Contextual help icon with popover
- 2-3 sentence detailed explanations
- Format: Explanation + Where to find it + Examples/context
- Click or hover to reveal
- Dark mode compatible

#### PdfReportButton
- Generates PDF from report data
- Loading state during generation
- Customizable filename
- Handles both calculator types

#### StateHeatMap (Hashrate Heating only)
- SVG-based US state visualization
- Color gradient based on data
- Hover tooltips for each state

### Architectural Patterns

#### File Organization
```
src/
├── api/              # External API integrations
│   ├── bitcoin.ts    # CoinGecko (price), Mempool.space (hashrate, fees)
│   └── solar.ts      # NREL, Zippopotam
├── calculations/     # Pure calculation functions
│   ├── hashrate.ts   # COPe, arbitrage, network metrics
│   └── solar.ts      # Solar mining, net metering
├── components/       # Reusable UI components
│   ├── InputField.tsx
│   ├── SelectField.tsx
│   ├── SmartTooltip.tsx
│   ├── PdfReportButton.tsx
│   ├── StateHeatMap.tsx
│   └── Layout.tsx
├── data/            # Static data (fuel prices, regions)
├── pages/           # Calculator page components
│   ├── HashrateHeating.tsx
│   ├── SolarMonetization.tsx
│   └── Home.tsx
├── pdf/             # PDF generation logic
│   └── types.ts     # PDF data interfaces
├── types/           # TypeScript definitions
└── App.tsx          # Router and app entry
```

#### State Management Pattern
- Local component state with `useState`
- Derived calculations with `useMemo` (proper dependency arrays)
- API data fetching with `useEffect`
- No global state library (Redux, Zustand) needed

#### API Integration Pattern
```typescript
// 1. Define types
interface ApiResponse { ... }

// 2. Create fetch function in api/ folder
export async function fetchData(): Promise<ApiResponse> {
  try {
    const response = await axios.get(...)
    return processedData
  } catch (error) {
    console.error('API error:', error)
    return fallbackData
  }
}

// 3. Use in component with useEffect
useEffect(() => {
  async function loadData() {
    setLoading(true)
    const data = await fetchData()
    setData(data)
    setLoading(false)
  }
  loadData()
}, [dependencies])
```

#### Calculation Pattern
```typescript
// 1. Pure functions in calculations/ folder
export function calculateMetric(
  input1: number,
  input2: number,
  context: Context
): Result {
  // Pure calculation logic
  return result
}

// 2. Use with useMemo in component
const result = useMemo(() =>
  calculateMetric(input1, input2, context),
  [input1, input2, context]
)
```

### Global Miner Presets

**Shared Across All Calculators**:
```typescript
export const MINER_PRESETS: MinerSpec[] = [
  { name: 'Heatbit Trio', powerW: 400, hashrateTH: 10 },
  { name: 'Heatbit Maxi', powerW: 1500, hashrateTH: 39 },
  { name: 'Avalon Mini 3', powerW: 850, hashrateTH: 40 },
  { name: 'Avalon Q', powerW: 1700, hashrateTH: 90 },
  { name: 'Whastminer M64', powerW: 5000, hashrateTH: 228 },
  { name: 'Bitmain S19j Pro', powerW: 3068, hashrateTH: 104 },
  { name: 'Bitmain S19k Pro', powerW: 2760, hashrateTH: 120 },
  { name: 'Bitmain S9', powerW: 1400, hashrateTH: 13.5 },
  { name: 'Single Board S19 Pro', powerW: 850, hashrateTH: 30 }
]
```

**Location**: `src/calculations/hashrate.ts` (canonical source)
**Exported**: Re-exported from `src/calculations/solar.ts` for consistency

---

## Testing Strategy

### Manual Testing
- Test each calculator with various input combinations
- Test edge cases (zero values, invalid locations, extreme overrides)
- Test on different browsers (Chrome, Firefox, Safari, Edge)
- Test on mobile devices (iOS Safari, Android Chrome)
- Test dark mode toggle
- Test PDF report generation

### Unit Tests (Implemented)
- ✅ **100+ tests passing** across test suites (count will increase with fee slider feature)
- ✅ **100% statement coverage** on calculation logic
- ✅ **100% function coverage**
- ✅ **88.88% branch coverage** (only minor edge cases uncovered)
- All calculation functions in `src/calculations/` fully tested
- All conversion utilities tested (formatBtc, formatUsd, formatKwh, etc.)
- Network metric calculations tested
- COPe formula edge cases tested
- Solar mining revenue calculations tested (kWh-based formula)
- **Testing Framework**: Vitest with v8 coverage provider

**Test Files:**
- `src/test/hashrate.test.ts` (37+ tests) - COPe, arbitrage, network calculations
- `src/test/solar.test.ts` (39+ tests) - kWh-based mining calculations, net metering, monthly excess
- `src/test/pdf.test.ts` (24 tests) - PDF report generation, state rankings
- `src/test/bitcoin.test.ts` (NEW) - Fee calculations, three-knob logic, API response handling

**Example Test Cases**:
```typescript
describe('calculateCOPe', () => {
  it('returns infinity when R >= 1 (free heating)', () => {...})
  it('calculates correct COPe for typical values', () => {...})
  it('handles extreme electricity rates', () => {...})
})

describe('calculateBtcFromKwh', () => {
  it('calculates BTC from kWh using the rate-based formula', () => {...})
  it('scales linearly with kWh', () => {...})
  it('produces more BTC with better efficiency (lower J/TH)', () => {...})
})

describe('calculateSolarMining', () => {
  it('calculates BTC directly from kWh', () => {...})
  it('has higher revenue in months with more production', () => {...})
  it('uses miner efficiency correctly', () => {...})
})

// NEW: Fee calculation tests
describe('calculateFeePercent', () => {
  it('calculates fee % from avg fees and block subsidy', () => {...})
  it('returns 0 for zero fees', () => {...})
  it('caps at 99%', () => {...})
})

describe('calculateHashvalueWithFees', () => {
  it('recalculates hashvalue when fee % changes', () => {...})
  it('holds network hashrate constant', () => {...})
  it('handles 0% fees (subsidy only)', () => {...})
})

describe('calculateImpliedHashrate', () => {
  it('derives network hashrate from hashvalue and fee %', () => {...})
  it('holds fee % constant', () => {...})
})

describe('getBlockSubsidy', () => {
  it('returns 3.125 for current epoch', () => {...})
  it('returns 1.5625 after next halving', () => {...})
  it('calculates correctly for any block height', () => {...})
})
```

---

## Success Criteria

### Functional Completeness
- All three solar calculator modes work correctly
- Hashrate heating calculator produces accurate COPe values
- All inputs validate properly
- All edge cases handled gracefully
- PDF reports generate without errors

### User Comprehension
- Users understand what to input (via tooltips)
- Users understand what results mean (via tooltips)
- Users can make informed decisions based on outputs
- Error messages are clear and actionable

### Calculation Accuracy
- Results match hand calculations within 1%
- COPe formula verified against real-world data
- Solar revenue estimates align with actual mining returns
- Monthly distributions are realistic

### Performance
- Calculator loads in <3 seconds on 3G
- Input changes update results immediately (<100ms)
- Charts render smoothly without lag
- API calls complete within reasonable time (<5s)

### Code Quality
- TypeScript type safety throughout
- No console errors in production
- Clean React patterns (proper hooks usage)
- Calculation functions are pure and testable
- Comments explain non-obvious logic

---

## Future Considerations (Out of Scope)

**Features NOT in this spec** (may be added later):
- Pool fees and operational costs modeling
- Multi-scenario comparison tools
- Historical BTC price charts
- Historical fee trend charts or fee predictions
- Battery storage modeling for solar
- URL parameter sharing / bookmarkable scenarios (planned as separate feature)
- User accounts and saved scenarios
- Integration with live mining pool data
- More countries beyond US/Canada
- Fee averaging over different time windows (currently fixed at 144 blocks)

---

## Appendix: Mathematical Formulas (Verified)

This section contains mathematically verified formulas with full derivations, edge cases, and override logic.

### Bitcoin Network Base Formulas

#### Hashvalue (sats/TH/day)

**Base Formula (Subsidy + Fees):**
```
hashvalue = (daily_subsidy_sats + daily_fees_sats) / network_hashrate_TH

where:
  daily_subsidy_sats = 144 blocks/day × 3.125 BTC/block × 1e8 sats/BTC
                     = 45,000,000,000 sats/day
  daily_fees_sats = 144 blocks/day × avg_fee_per_block_BTC × 1e8 sats/BTC
```

**Example with fees = 0.2 BTC/block:**
```
daily_subsidy_sats = 45,000,000,000 sats
daily_fees_sats = 144 × 0.2 × 1e8 = 2,880,000,000 sats
total_daily_sats = 47,880,000,000 sats

hashvalue = 47,880,000,000 / network_hashrate_TH
```

**Mathematical Verification:**
- ✅ Bitcoin produces 144 blocks/day on average (1 block per 10 minutes)
- ✅ Current epoch block reward: 3.125 BTC (after 2024 halving)
- ✅ 1 BTC = 100,000,000 satoshis (1e8)
- ✅ Transaction fees vary but typically 0.15-0.30 BTC/block
- ✅ Hashvalue represents fair share per TH/s of hashrate contribution

**Edge Cases:**
- If network_hashrate = 0: Return 0 (or error) to prevent division by zero
- If fees < 0: Treat as 0 (invalid but defensively handled)
- Very high network hashrate (1000+ EH/s): Formula still valid, just lower hashvalue

#### Three-Knob Override System (Fee %, Hashvalue, Network Hashrate)

The three-knob system allows users to model any Bitcoin network scenario. Fee % is the "anchor" - it's never implied from other values.

**Key Formulas:**

```
// Block subsidy from block height (auto-halving)
block_subsidy_BTC = 50 / (2 ^ floor(block_height / 210000))
block_subsidy_sats = block_subsidy_BTC × 1e8

// Total reward from fee percentage
total_reward_per_block = block_subsidy / (1 - fee_percent/100)
total_reward_sats = total_reward_per_block × 1e8

// Daily reward
daily_reward_sats = total_reward_sats × 144

// Hashvalue from network hashrate and fee %
hashvalue_sats = daily_reward_sats / network_hashrate_TH

// Network hashrate from hashvalue and fee %
network_hashrate_TH = daily_reward_sats / hashvalue_sats
```

**Scenario 1: User Adjusts Fee % → Recalculate Hashvalue**
```
Given: fee_percent (0-99%), network_hashrate_TH (held constant)
Calculate: new_hashvalue

total_reward = block_subsidy / (1 - fee_percent/100)
daily_reward_sats = total_reward × 144 × 1e8
new_hashvalue = daily_reward_sats / network_hashrate_TH
```

**Example:**
```
fee_percent = 10%
network_hashrate = 800,000,000 TH/s (800 EH/s)
block_subsidy = 3.125 BTC

total_reward = 3.125 / (1 - 0.10) = 3.125 / 0.90 = 3.472 BTC/block
daily_reward_sats = 3.472 × 144 × 1e8 = 50,000,000,000 sats
new_hashvalue = 50,000,000,000 / 800,000,000 = 62.5 sats/TH/day
```

**Scenario 2: User Adjusts Hashvalue → Recalculate Network Hashrate**
```
Given: user_hashvalue (sats/TH/day), fee_percent (held constant)
Calculate: implied_network_hashrate

total_reward = block_subsidy / (1 - fee_percent/100)
daily_reward_sats = total_reward × 144 × 1e8
implied_network_hashrate = daily_reward_sats / user_hashvalue
```

**Example:**
```
user_hashvalue = 50 sats/TH/day
fee_percent = 6% (held constant)
block_subsidy = 3.125 BTC

total_reward = 3.125 / (1 - 0.06) = 3.125 / 0.94 = 3.324 BTC/block
daily_reward_sats = 3.324 × 144 × 1e8 = 47,872,340,426 sats
implied_network_hashrate = 47,872,340,426 / 50 = 957,446,809 TH/s (957 EH/s)
```

**Scenario 3: User Adjusts Network Hashrate → Recalculate Hashvalue**
```
Given: user_network_hashrate (TH/s), fee_percent (held constant)
Calculate: implied_hashvalue

total_reward = block_subsidy / (1 - fee_percent/100)
daily_reward_sats = total_reward × 144 × 1e8
implied_hashvalue = daily_reward_sats / user_network_hashrate
```

**Example:**
```
user_network_hashrate = 1,000,000,000 TH/s (1000 EH/s)
fee_percent = 6% (held constant)
block_subsidy = 3.125 BTC

total_reward = 3.125 / 0.94 = 3.324 BTC/block
daily_reward_sats = 47,872,340,426 sats
implied_hashvalue = 47,872,340,426 / 1,000,000,000 = 47.87 sats/TH/day
```

**Edge Cases:**
- fee_percent = 0%: Total reward = block subsidy only
- fee_percent = 99%: Total reward = block_subsidy / 0.01 = 100× subsidy (extreme but valid)
- fee_percent >= 100%: Invalid - clamped to 99%
- network_hashrate = 0: Return 0 to prevent division by zero
- hashvalue = 0: Return 0 (invalid input)

#### Hashprice ($/TH/day)

**Formula:**
```
hashprice = (hashvalue_sats × btc_price_USD) / 1e8
```

**Mathematical Reasoning:**
- Hashvalue is in sats/TH/day
- Convert sats to BTC: divide by 100,000,000 (1e8)
- Multiply by BTC price to get USD

**Example:**
```
hashvalue = 60,000 sats/TH/day
btc_price = $100,000

hashprice = (60,000 × 100,000) / 100,000,000
          = 6,000,000,000 / 100,000,000
          = $60 per TH per day

Alternative calculation:
hashprice = (60,000 / 1e8) BTC/TH/day × $100,000/BTC
          = 0.0006 BTC/TH/day × $100,000
          = $60/TH/day
```

**Mathematical Verification:**
- ✅ Conversion factor 1e8 is exact (definition of satoshi)
- ✅ Dimensional analysis: (sats/TH/day × $/BTC) / (sats/BTC) = $/TH/day ✓

**Edge Cases:**
- If btc_price = 0: hashprice = 0 (valid result, though unrealistic)
- If btc_price < 0: Invalid input (should validate)
- Very high BTC prices ($1M+): Formula still valid

#### Hashprice Override Scenarios

**Scenario 3: User Overrides BTC Price (calculates hashprice)**
```
Given: user_btc_price
Use: live hashvalue from API
Calculate: implied_hashprice = (hashvalue × user_btc_price) / 1e8
```

**Scenario 4: User Overrides Hashprice (calculates implied BTC price)**
```
Given: user_hashprice ($/TH/day)
Use: live hashvalue from API (sats/TH/day)
Calculate: implied_btc_price

implied_btc_price = (user_hashprice × 1e8) / hashvalue
```

**Example:**
```
user_hashprice = $75/TH/day
hashvalue = 60,000 sats/TH/day (from API)

implied_btc_price = (75 × 100,000,000) / 60,000
                  = 7,500,000,000 / 60,000
                  = $125,000 per BTC
```

**Mathematical Verification:**
```
Reverse check:
hashprice = (60,000 × 125,000) / 1e8 = $75 ✓
```

### Solar Monetization Calculator Formulas

#### kWh-Based Revenue Calculation

**Formula:**
```
For each month:
  total_hours = days_in_month × 24
  avg_power_W = (monthly_kWh × 1000) / total_hours
  avg_hashrate_TH = avg_power_W / efficiency_J_TH
  monthly_sats = avg_hashrate_TH × hashvalue_sats × days_in_month
  monthly_btc = monthly_sats / 1e8
```

**Simplified equivalent:**
```
monthly_sats = (monthly_kWh × 1000 / efficiency_J_TH) × (hashvalue_sats / 24)
```

**Mathematical Reasoning:**
- Derive average power from total energy (kWh → W)
- Convert power to equivalent hashrate using miner efficiency (W/TH = J/TH)
- Calculate revenue using hashvalue (which already includes network difficulty and fees)
- Only miner efficiency matters - not power or hashrate individually

**Example:**
```
January production: 800 kWh
Miner efficiency: 20 J/TH (e.g., 1000W / 50TH/s)
Hashvalue: 50 sats/TH/day

total_hours = 31 × 24 = 744 hours
avg_power_W = (800 × 1000) / 744 = 1,075.3 W
avg_hashrate_TH = 1,075.3 / 20 = 53.76 TH/s
monthly_sats = 53.76 × 50 × 31 = 83,333 sats
monthly_btc = 83,333 / 1e8 = 0.00083333 BTC

At $100,000/BTC: $83.33 for January
```

**Key Insight:**
- Hashvalue = sats/TH/day already incorporates network difficulty and transaction fees
- No need to calculate network share separately
- Revenue scales linearly with kWh (more solar = more revenue)
- Revenue scales linearly with hashvalue (better network conditions = more revenue)
- Revenue scales inversely with efficiency (lower J/TH = more revenue)

**Edge Cases:**
- If monthly_kWh = 0: monthly_btc = 0 (correct, no energy = no mining)
- If efficiency_J_TH = 0: Return 0 (invalid, division by zero protection)
- If hashvalue = 0: Return 0 (no network reward)
- If days = 0: Return 0 (invalid period)

**Status:** ✅ Verified and implemented

### Hashrate Heating Calculator Formulas

#### COPe (Coefficient of Performance - Economic)

**Formula:**
```
R = dailyMiningRevenue / dailyElectricityCost

where:
  dailyMiningRevenue = dailyBTC × btcPrice
  dailyBTC = (miner_hashrate / network_hashrate) × 144 × 3.125
  dailyElectricityCost = (miner_power_kW × 24 hours) × electricity_rate

COPe = 1 / (1 - R)

Special cases:
  If R >= 1: COPe = ∞ (free heating or paid to heat)
  If R <= 0: COPe = 1 (no mining subsidy, full electricity cost)
```

**Mathematical Verification:** ⏸️ Pending verification

#### Heating Arbitrage

**Formula:**
```
traditional_cost_per_kWh = (fuel_rate × BTU_conversion) / fuel_efficiency
hashrate_cost_per_kWh = electricity_rate × (1 - R)
savings_percent = ((traditional - hashrate) / traditional) × 100
```

**Mathematical Verification:** ⏸️ Pending verification

---

### Verification Status Legend

- ✅ **Verified**: Formula mathematically confirmed with user
- ⏸️ **Under Review**: Formula presented, awaiting user confirmation
- ⚠️ **Has Assumptions**: Formula is valid but relies on stated assumptions
- ❌ **Needs Fix**: Formula has identified issues requiring correction

---

**Last Updated:** 2026-01-13 (Transaction fee slider feature added - three-knob override system)

---

**End of Specification**

*This living document will be updated as requirements evolve and new features are designed.*
