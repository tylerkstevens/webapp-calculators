# Hashrate Heating Calculator

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwindcss)](https://tailwindcss.com/)

**Calculate how Bitcoin mining can subsidize your home heating costs.**

An interactive web calculator that helps you understand the economics of using Bitcoin mining hardware for space heating. Compare mining heating costs against traditional fuels and see your potential savings.

## What is Hashrate Heating?

Hashrate heating uses bitcoin mining hardware to electrically heat your home or business while earning revenue. The key insight:

- **100% Heat Efficiency** — Every watt of electricity consumed by a miner becomes heat
- **Dual Revenue** — You get both heat AND Bitcoin mining rewards
- **Economic Advantage** — Mining revenue subsidizes (or eliminates) your heating costs

The calculator computes your **COPe (Coefficient of Performance - Economic)**, which measures how much more efficient hashrate heating is compared to traditional electric resistance heating.

## Features

- **Real-time Bitcoin Data** — Live BTC price and network hashrate from CoinGecko and Mempool.space APIs
- **COPe Calculator** — Calculate your economic coefficient of performance
- **Fuel Comparison** — Compare against natural gas, propane, heating oil, electric resistance, and heat pumps
- **State-Specific Pricing** — Default fuel prices for all 50 US states + DC
- **Miner Presets** — Quick-select popular mining heaters (Heatbit, Avalon, Heat Core)
- **Custom Miner Input** — Enter your own power consumption and hashrate
- **Interactive Charts** — Visualize savings across different electricity rates, fuel prices, and hashprices
- **Two-Knob Model** — Explore "what-if" scenarios by adjusting BTC price and network hashrate
- **Dark Mode** — Easy on the eyes
- **Mobile Responsive** — Works on any device

## Live Demo

Try the calculator at **[calc.exergyheat.com](https://calc.exergyheat.com)**

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- npm (comes with Node.js)

### Installation

```bash
# Clone the repository
git clone https://github.com/exergyheat/webapp-calculators.git
cd webapp-calculators

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Production Build

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

The build output will be in the `dist/` folder, ready for deployment to any static hosting service.

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
| [React Simple Maps](https://www.react-simple-maps.io/) | Interactive US heat map |

## Project Structure

```
src/
├── api/                    # External API clients
│   └── bitcoin.ts          # CoinGecko & Mempool.space integration
├── calculations/           # Core business logic
│   ├── hashrate.ts         # COPe, hashvalue, arbitrage calculations
│   └── index.ts            # Barrel exports
├── components/             # Reusable UI components
│   ├── Layout.tsx          # Page layout with header/footer
│   ├── InputField.tsx      # Input component with icons
│   ├── SelectField.tsx     # Dropdown selector
│   ├── ResultCard.tsx      # Result display cards
│   ├── SmartTooltip.tsx    # Dynamic viewport-aware tooltips
│   ├── StateHeatMap.tsx    # Interactive US heat map with state comparison
│   └── ThemeToggle.tsx     # Dark mode toggle
├── contexts/               # React Context
│   └── ThemeContext.tsx    # Theme provider
├── data/                   # Static data
│   └── fuelPrices.ts       # State fuel prices & HDD data
├── pages/                  # Route pages
│   ├── Home.tsx            # Landing page
│   └── HashrateHeating.tsx # Main calculator
├── App.tsx                 # Route configuration
├── main.tsx                # React entry point
└── index.css               # Tailwind base styles
```

## APIs Used

All APIs are free and require no authentication:

| API | Data | Rate Limits |
|-----|------|-------------|
| [CoinGecko](https://www.coingecko.com/api/documentation) | Bitcoin price (USD) | ~50 req/min |
| [Mempool.space](https://mempool.space/docs/api) | Network hashrate, difficulty | Generous |

## Key Calculations

### COPe (Coefficient of Performance - Economic)

```
COPe = 1 / (1 - R)

where R = mining_revenue / electricity_cost
```

- **R < 1**: Mining partially subsidizes electricity (COPe > 1)
- **R = 1**: Mining fully covers electricity (COPe = ∞, free heating)
- **R > 1**: Mining generates profit beyond covering electricity

### Hashvalue & Hashprice

```
hashvalue = (blocks_per_day × block_reward) / network_hashrate
         = (144 × 3.125 BTC) / network_TH
         = sats/TH/day

hashprice = hashvalue × btc_price
          = $/TH/day
```

### Savings vs Traditional Fuel

```
traditional_cost = heat_kWh / fuel_efficiency × fuel_price_per_unit
hashrate_cost = electricity_cost - mining_revenue
savings_pct = (traditional_cost - hashrate_cost) / traditional_cost × 100
```

## Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | TypeScript check + production build |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build locally |

### Code Style

- TypeScript strict mode enabled
- ESLint with React hooks plugin
- Tailwind CSS for styling (no CSS modules)

## Self-Hosting

### Static Hosting (Recommended)

Build the project and deploy the `dist/` folder to any static hosting:

- **Netlify**: Drag & drop `dist/` or connect GitHub
- **Vercel**: `vercel deploy`
- **GitHub Pages**: Use `gh-pages` branch
- **Cloudflare Pages**: Connect repository
- **AWS S3 + CloudFront**: Upload to S3 bucket

### Docker

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```bash
docker build -t hashrate-calculator .
docker run -p 8080:80 hashrate-calculator
```

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

- **Website**: [exergyheat.com](https://exergyheat.com)
- **Documentation**: [docs.exergyheat.com](https://docs.exergyheat.com)
- **Community**: [support.exergyheat.com](https://support.exergyheat.com)
- **Issues**: [GitHub Issues](https://github.com/exergyheat/webapp-calculators/issues)

---

Built with heat by [Exergy Heat](https://exergyheat.com)
