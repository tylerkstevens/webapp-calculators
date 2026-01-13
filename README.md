# Exergy Heat Web Calculators

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwindcss)](https://tailwindcss.com/)

**Interactive web calculators for Bitcoin mining energy economics.**

A collection of calculators that help users evaluate the economics of Bitcoin mining for space heating and solar energy monetization. Compare mining heating costs against traditional fuels and analyze solar mining vs net metering.

## Live Website

**[calc.exergyheat.com](https://calc.exergyheat.com)**

For usage documentation, equations, and guides, see **[docs.exergyheat.com](https://docs.exergyheat.com)**.

## Calculators

### Hashrate Heating Calculator
Evaluate the economics of using Bitcoin mining hardware for space heating.
- Compare against natural gas, propane, heating oil, wood pellets, electric resistance, and heat pumps
- Calculate COPe (economic coefficient of performance)
- Multi-country support (US states and Canadian provinces)
- Interactive heat maps for regional visualization

### Solar Monetization Calculator
Compare monetizing excess solar energy via Bitcoin mining vs traditional net metering.
- Solar production estimates via NREL PVWatts API
- Three input modes: Estimate from ZIP, Known Production, or Excess Only
- Net metering comparison with configurable rates
- Monthly revenue breakdown charts
- PDF report generation

## Features

- **Real-time Bitcoin Data** — Live BTC price, hashvalue, and network stats from Braiins, CoinGecko, and Mempool.space APIs
- **Solar Production Estimates** — NREL PVWatts integration for location-specific solar data
- **Miner Presets** — Quick-select popular mining heaters (Heatbit, Avalon, Bitaxe, etc.)
- **Custom Miner Input** — Enter your own power consumption and hashrate
- **Bill Calculators** — Derive rates from utility bills
- **Dark Mode** — Light and dark themes
- **Mobile Responsive** — Works on any device

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- npm (comes with Node.js)

## Installation

```bash
# Clone the repository
git clone https://github.com/exergyheat/webapp-calculators.git
cd webapp-calculators

# Install dependencies
npm install
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_NREL_API_KEY` | For solar calculator | NREL API key for PVWatts solar estimates. Get one free at [developer.nrel.gov](https://developer.nrel.gov/signup/) |

Create a `.env` file in the project root:

```bash
VITE_NREL_API_KEY=your_api_key_here
```

The solar calculator will use fallback estimates if no API key is configured.

## Development

```bash
# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | TypeScript check + production build |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build locally |
| `npm test` | Run unit tests with Vitest |

### Build

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

The build output will be in the `dist/` folder.

## Project Structure

```
src/
├── api/                    # External API clients
│   ├── bitcoin.ts          # Braiins, CoinGecko, Mempool.space integration
│   └── solar.ts            # NREL PVWatts, Zippopotam geocoding
├── calculations/           # Core calculation logic
│   ├── hashrate.ts         # COPe, hashvalue, arbitrage calculations
│   ├── solar.ts            # Solar mining revenue, net metering comparison
│   └── index.ts            # Barrel exports
├── components/             # Reusable UI components
│   ├── Layout.tsx          # Page layout with header/footer
│   ├── InputField.tsx      # Input component with validation
│   ├── SelectField.tsx     # Dropdown selector
│   ├── ResultCard.tsx      # Result display cards
│   ├── SmartTooltip.tsx    # Viewport-aware tooltips
│   ├── StateHeatMap.tsx    # Interactive regional heat map
│   ├── DualAxisChart.tsx   # Monthly revenue & generation chart
│   └── ThemeToggle.tsx     # Dark mode toggle
├── contexts/               # React Context providers
│   └── ThemeContext.tsx    # Theme provider
├── data/                   # Static data
│   └── fuelPrices.ts       # Regional fuel prices & energy data
├── pages/                  # Route pages
│   ├── Home.tsx            # Landing page
│   ├── HashrateHeating.tsx # Hashrate heating calculator
│   └── SolarMonetization.tsx # Solar monetization calculator
├── pdf/                    # PDF report generation
├── test/                   # Unit tests (Vitest)
├── App.tsx                 # Route configuration
├── main.tsx                # React entry point
└── index.css               # Tailwind base styles
```

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [React 18](https://reactjs.org/) | UI framework |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Vite](https://vitejs.dev/) | Build tool & dev server |
| [Tailwind CSS](https://tailwindcss.com/) | Styling |
| [React Router](https://reactrouter.com/) | Routing |
| [Axios](https://axios-http.com/) | HTTP client |
| [Lucide React](https://lucide.dev/) | Icons |
| [Recharts](https://recharts.org/) | Charts |
| [React Simple Maps](https://www.react-simple-maps.io/) | Interactive regional maps |
| [Vitest](https://vitest.dev/) | Unit testing |

## APIs and Data Sources

### Live APIs

All APIs are free (NREL requires a free API key):

| API | Data | Rate Limits |
|-----|------|-------------|
| [Braiins Insights](https://insights.braiins.com/) | BTC price, hashvalue, hashprice, network hashrate | Generous |
| [CoinGecko](https://www.coingecko.com/api/documentation) | Bitcoin price (USD) - fallback | ~50 req/min |
| [Mempool.space](https://mempool.space/docs/api) | Network hashrate, difficulty - fallback | Generous |
| [NREL PVWatts](https://developer.nrel.gov/docs/solar/pvwatts/v8/) | Solar production estimates | Requires API key |
| [Zippopotam](https://www.zippopotam.us/) | ZIP code geocoding | Free, no key |

### Static Data

Regional fuel pricing and efficiency data in `src/data/fuelPrices.ts`:

| Data | Source |
|------|--------|
| US Electricity Rates | [EIA State Electricity Profiles](https://www.eia.gov/electricity/state/) |
| US Natural Gas Prices | [EIA Natural Gas Data](https://www.eia.gov/dnav/ng/ng_pri_sum_dcu_nus_m.htm) |
| US Propane/Heating Oil | [EIA Heating Oil & Propane](https://www.eia.gov/petroleum/heatingoilpropane/) |
| Canada Electricity | [GlobalPetrolPrices](https://www.globalpetrolprices.com/Canada/electricity_prices/) |
| Canada Natural Gas | [Canadian Gas Association](https://www.cga.ca/natural-gas-statistics/) |
| Canada Propane | [Natural Resources Canada](https://natural-resources.canada.ca/energy/fuel-prices) |
| Canada Heating Oil | [Statistics Canada](https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810000101) |
| Fuel BTU Content | [EIA Energy Units](https://www.eia.gov/energyexplained/units-and-calculators/) |
| Equipment Efficiencies | Industry standard AFUE/COP ratings |

## Testing

The project includes unit tests using Vitest:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch
```

Tests cover:
- Hashrate heating calculations (COPe, fuel comparisons, BTU conversions)
- Solar mining calculations (kWh-to-BTC conversion, net metering comparison)
- PDF report generation

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Links

- **Live Calculator**: [calc.exergyheat.com](https://calc.exergyheat.com)
- **Documentation**: [docs.exergyheat.com](https://docs.exergyheat.com) — Equations, guides, calculation details
- **Community**: [support.exergyheat.com](https://support.exergyheat.com) — Questions, feature requests, support
- **Website**: [exergyheat.com](https://exergyheat.com)
- **Issues**: [GitHub Issues](https://github.com/exergyheat/webapp-calculators/issues)
