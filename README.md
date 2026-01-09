# Recipe Journal

A recipe journal application to import, scale, and save your favorite recipes. Paste recipe URLs, automatically extract ingredients, and scale them with intelligent rounding and unit conversion.

## Features

- **Recipe Scraping**: Paste any recipe URL and the app extracts ingredients and instructions
  - Supports Schema.org JSON-LD (most modern recipe sites)
  - Generic DOM parsing fallback for other sites
- **Intelligent Scaling**: Scale recipes with multipliers (0.5x, 1x, 2x, 3x, custom)
  - Friendly fraction display (1/2, 1/3, 2/3, etc.)
  - Handles very small amounts ("pinch", "to taste")
  - Cooking tips based on scale factor
- **Unit Conversion**: Convert between US and Metric systems
- **Mobile Responsive**: Works on all screen sizes
- **Copy to Clipboard**: Export scaled recipes easily

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Node.js + Express + TypeScript |
| Scraping | Cheerio (DOM parsing) + Puppeteer (JS fallback) |
| Testing | Jest + React Testing Library |
| Monorepo | npm workspaces |

## Project Structure

```
recipe-journal/
├── packages/
│   ├── client/          # React frontend
│   ├── server/          # Express backend
│   └── shared/          # Shared types & constants
├── .github/workflows/   # CI/CD
├── package.json         # Monorepo root
└── tsconfig.base.json
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/shruti/recipe-journal.git
cd recipe-journal

# Install dependencies
npm install

# Build shared package
npm run build:shared
```

### Development

```bash
# Start both frontend and backend in development mode
npm run dev

# Or start them separately
npm run dev:server  # Starts backend on http://localhost:3001
npm run dev:client  # Starts frontend on http://localhost:3000
```

### Testing

```bash
# Run all tests
npm test

# Run tests for specific package
npm run test:server
npm run test:client
```

### Building for Production

```bash
# Build all packages
npm run build

# Start production server
npm start -w @recipe-journal/server
```

## API Endpoints

### Parse Recipe
```
POST /api/recipes/parse
Content-Type: application/json

{
  "url": "https://www.allrecipes.com/recipe/..."
}
```

### Scale Recipe
```
POST /api/recipes/scale
Content-Type: application/json

{
  "recipe": { ... },
  "options": {
    "multiplier": 2,
    "targetUnitSystem": "metric"  // optional
  }
}
```

### Health Check
```
GET /api/health
```

## Supported Recipe Sites

The application works with most recipe websites that use standard formats:

- **Schema.org sites** (AllRecipes, Food Network, Epicurious, etc.)
- **WordPress recipe plugins** (WPRM, Tasty Recipes)
- **Generic recipe pages** with common HTML patterns

## Configuration

Create a `.env` file in `packages/server/` based on `.env.example`:

```bash
NODE_ENV=development
PORT=3001
ALLOWED_ORIGINS=http://localhost:3000
RATE_LIMIT_MAX_REQUESTS=30
CACHE_TTL_SECONDS=3600
```

## Future Roadmap

- [ ] User accounts and saved recipes
- [ ] PDF export
- [ ] Browser extension
- [ ] Mobile app integration
- [ ] Serving size calculations

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
