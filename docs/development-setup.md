# Development Environment Setup Guide

This guide provides step-by-step instructions for setting up the Bitcoin Simulation Tool (FIRE hodl) development environment from scratch.

## Quick Start (TL;DR)

For experienced developers who want to get started immediately:

```bash
# 1. Install pnpm (if not already installed)
npm install -g pnpm

# 2. Clone and setup
git clone https://github.com/nited-ai/v0-bitcoin-simulation-tool.git
cd v0-bitcoin-simulation-tool
pnpm install

# 3. Start development server
pnpm dev

# 4. Open browser
# Visit: http://localhost:3000
```

**Requirements:** Node.js 18+ and npm/pnpm

## Overview

**FIRE hodl** is a Bitcoin simulation tool that helps Bitcoin holders achieve financial independence and retire early. The application allows users to simulate Bitcoin lending strategies, collateral-based loans, and accumulation strategies without selling their Bitcoin.

### Key Features
- Bitcoin price simulation with multiple price models
- Collateral-based lending strategies
- Dollar-cost averaging (DCA) simulations
- Risk analysis and portfolio optimization
- Historical Bitcoin price data integration
- Multi-language support (i18n)

## Prerequisites

### Required Software

1. **Node.js** (Version 18.0 or higher recommended)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **pnpm** (Package Manager - Recommended)
   - Install globally: `npm install -g pnpm`
   - Verify installation: `pnpm --version`
   - **Alternative:** You can use `npm` instead of `pnpm` (see npm commands below)

3. **Git** (for version control)
   - Download from: https://git-scm.com/
   - Verify installation: `git --version`

### Optional but Recommended

4. **PostgreSQL** (for production-like database)
   - Download from: https://www.postgresql.org/download/
   - Alternative: Use Docker with PostgreSQL image
   - For development, SQLite is used by default (no setup required)

5. **VS Code** (Recommended IDE)
   - Download from: https://code.visualstudio.com/
   - Recommended extensions:
     - TypeScript and JavaScript Language Features
     - Tailwind CSS IntelliSense
     - Prisma
     - ES7+ React/Redux/React-Native snippets

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/nited-ai/v0-bitcoin-simulation-tool.git
cd v0-bitcoin-simulation-tool
```

### 2. Install Package Manager (if needed)

If you don't have pnpm installed:

```bash
npm install -g pnpm
```

### 3. Install Dependencies

**Using pnpm (recommended):**
```bash
pnpm install
```

**Using npm (alternative):**
```bash
npm install
```

This will:
- Install all Node.js dependencies
- Automatically run `prisma generate` (via postinstall hook)
- Generate the Prisma client at `lib/generated/prisma`

### 4. Database Setup

#### Option A: SQLite (Development - Default)
The project includes a pre-configured SQLite database at `prisma/dev.db` with Bitcoin price data already seeded.

**No additional setup required for development!**

#### Option B: PostgreSQL (Production-like)
If you want to use PostgreSQL for development:

1. **Create a PostgreSQL database**
2. **Create environment file:**
   ```bash
   # Create .env.local file
   touch .env.local
   ```

3. **Add database connection:**
   ```env
   # .env.local
   DATABASE_URL="postgresql://username:password@localhost:5432/bitcoin_simulation"
   ```

4. **Run database migrations:**
   ```bash
   pnpm prisma migrate dev
   # OR with npm:
   npm run prisma migrate dev
   ```

5. **Seed the database:**
   ```bash
   pnpm db:seed
   # OR with npm:
   npm run db:seed
   ```

### 5. Verify Installation

```bash
# Check if Prisma client was generated
ls -la lib/generated/prisma

# Test the build process
pnpm build
# OR with npm:
npm run build
```

## Running the Development Server

### Start the Development Server

```bash
pnpm dev
# OR with npm:
npm run dev
```

The application will be available at:
- **Local:** http://localhost:3000
- **Network:** http://[your-ip]:3000

### Development Features

- **Hot Reload:** Changes are automatically reflected
- **TypeScript:** Full type checking and IntelliSense
- **Tailwind CSS:** Utility-first CSS framework
- **Dark/Light Mode:** Theme switching support

## Application Structure

### Main Pages

1. **Landing Page** (`/`)
   - Introduction to FIRE hodl concept
   - Navigation to simulation tool
   - Educational content about Bitcoin lending

2. **Simulation Tool** (`/simulation`)
   - Interactive Bitcoin simulation interface
   - Parameter configuration (DCA, lending rates, etc.)
   - Real-time charts and projections
   - Strategy comparison tools

### Key Directories

```
├── app/                    # Next.js 13+ App Router
│   ├── api/               # API routes
│   ├── simulation/        # Simulation tool pages
│   └── globals.css        # Global styles
├── components/            # Reusable React components
│   ├── ui/               # shadcn/ui components
│   └── landing/          # Landing page components
├── lib/                   # Utility libraries
│   ├── database/         # Database connection management
│   ├── price-engine/     # Bitcoin price modeling
│   └── strategy-engine/  # Simulation strategies
├── prisma/               # Database schema and migrations
├── public/               # Static assets
└── docs/                 # Documentation
```

## Available Scripts

### Using pnpm (recommended)
```bash
# Development
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Run ESLint

# Testing
pnpm test             # Run tests with Vitest
pnpm test:ui          # Run tests with UI

# Database
pnpm db:seed          # Seed database with Bitcoin price data
pnpm db:reset         # Reset database and re-seed
```

### Using npm (alternative)
```bash
# Development
npm run dev           # Start development server
npm run build         # Build for production
npm run start         # Start production server
npm run lint          # Run ESLint

# Testing
npm run test          # Run tests with Vitest
npm run test:ui       # Run tests with UI

# Database
npm run db:seed       # Seed database with Bitcoin price data
npm run db:reset      # Reset database and re-seed
```

## Environment Variables

### Development (.env.local)

```env
# Database (optional - SQLite used by default)
DATABASE_URL="file:./prisma/dev.db"

# API Keys (optional - for enhanced data fetching)
MESSARI_API_KEY="your_messari_api_key"
COINCAP_API_KEY="your_coincap_api_key"

# Development settings
NODE_ENV="development"
```

### Production Environment Variables

Required for deployment:
- `DATABASE_URL`: PostgreSQL connection string
- Optional API keys for enhanced data sources

## Troubleshooting

### Common Issues

1. **pnpm Command Not Found**
   ```bash
   # Install pnpm globally
   npm install -g pnpm

   # Verify installation
   pnpm --version

   # Alternative: Use npm instead
   npm run dev  # instead of pnpm dev
   ```

2. **Prisma Client Not Generated**
   ```bash
   pnpm prisma generate
   # OR with npm:
   npm run prisma generate
   ```

3. **Database Connection Issues**
   ```bash
   # Reset database
   pnpm db:reset

   # Check database status
   pnpm prisma studio
   ```

4. **Port Already in Use**
   ```bash
   # Use different port
   pnpm dev -- --port 3001
   # OR with npm:
   npm run dev -- --port 3001
   ```

5. **Build Failures**
   ```bash
   # Clean install
   rm -rf node_modules .next
   pnpm install
   pnpm build
   ```

### Getting Help

- Check the `docs/` directory for detailed documentation
- Review existing issues in the repository
- Check Vercel deployment logs for production issues

## Verification

After completing the setup, verify everything is working:

1. **Check the development server output:**
   ```
   ▲ Next.js 15.2.4
   - Local:        http://localhost:3000
   - Network:      http://[your-ip]:3000
   ✓ Ready in ~4s
   ```

2. **Test the application:**
   - **Landing Page:** http://localhost:3000
     - Should show "FIRE hodl" landing page with Bitcoin character
     - Navigation should work smoothly
   - **Simulation Tool:** http://localhost:3000/simulation
     - Should load the interactive Bitcoin simulation interface
     - Charts and parameter controls should be visible

3. **Verify hot reload:**
   - Make a small change to any component
   - Save the file
   - Browser should automatically refresh with changes

## Next Steps

1. **Explore the Application:**
   - Visit http://localhost:3000 to see the landing page
   - Navigate to http://localhost:3000/simulation for the main tool

2. **Development Workflow:**
   - Make changes to components in `components/` or `app/`
   - Test changes with hot reload
   - Run tests with `pnpm test` or `npm run test`

3. **Database Management:**
   - Use `pnpm prisma studio` to view/edit database
   - Update schema in `prisma/schema.prisma`
   - Run migrations with `pnpm prisma migrate dev`

## Technology Stack

- **Framework:** Next.js 15.2.4 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** Prisma ORM with PostgreSQL/SQLite
- **Charts:** Recharts
- **Testing:** Vitest
- **Deployment:** Vercel

---

**Happy coding! 🚀**

For questions or issues, please refer to the project documentation or create an issue in the repository.
