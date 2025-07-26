# Technical Stack

> Last Updated: 2025-01-26
> Version: 1.0.0

## Application Framework
- **Framework:** Next.js 15.2.4
- **Runtime:** Node.js 18+
- **Package Manager:** pnpm
- **Language:** TypeScript 5.x

## Frontend Stack
- **JavaScript Framework:** React 19
- **CSS Framework:** TailwindCSS 3.x
- **UI Component Library:** shadcn/ui + Radix UI
- **Icons:** Lucide React
- **Charts:** Recharts
- **Forms:** React Hook Form + Zod validation
- **State Management:** React Context + Custom Hooks

## Backend & Database
- **Database System:** PostgreSQL 15+
- **ORM:** Prisma 5.x
- **API Strategy:** Next.js API Routes
- **Authentication:** NextAuth.js (future implementation)

## Data & Analytics
- **Historical Data:** Static CSV + API integration
- **Price APIs:** Bitcoin price feeds (CoinGecko/CoinMarketCap)
- **Caching:** In-memory caching for historical data
- **Performance Monitoring:** Custom performance tracking

## Development Tools
- **Code Quality:** ESLint + Prettier
- **Testing:** Vitest + Testing Library (planned)
- **Type Safety:** Strict TypeScript configuration
- **Git Hooks:** Husky (planned)

## Hosting & Deployment
- **Application Hosting:** Vercel
- **Database Hosting:** Vercel Postgres or Supabase
- **Asset Hosting:** Vercel Edge Network
- **Deployment Solution:** Vercel Git integration
- **Domain:** TBD

## Architecture Patterns
- **Design Pattern:** Modular Plugin Architecture
- **Component Pattern:** Compound Components with Context
- **Data Pattern:** Repository Pattern with Prisma
- **State Pattern:** Context + Reducer for complex state
- **Error Handling:** Error Boundaries + Global Error Handler

## Security & Performance
- **Environment Variables:** Vercel Environment Variables
- **API Security:** Rate limiting + Input validation
- **Performance:** Image optimization, Code splitting, Lazy loading
- **Monitoring:** Vercel Analytics + Custom metrics

## Development Workflow
- **Version Control:** Git with conventional commits
- **Branching:** GitFlow with feature branches
- **Code Review:** Pull Request workflow
- **CI/CD:** Vercel automatic deployments
- **Issue Tracking:** GitHub Issues

## External Integrations
- **Bitcoin Price Data:** Multiple API providers for redundancy
- **Historical Data:** Static CSV files with periodic updates
- **Internationalization:** i18next for multi-language support
- **Analytics:** Vercel Analytics (privacy-focused)

## Code Repository
- **Repository URL:** https://github.com/nited-ai/v0-bitcoin-simulation-tool.git
- **Main Branch:** main
- **Development Branch:** develop
- **Feature Branches:** feature/[feature-name]

## Standards Compliance
- **Agent OS Standards:** Full compliance with Agent OS tech stack requirements
- **Code Style:** Agent OS code style guidelines
- **File Organization:** Modular structure with clear separation of concerns
- **TypeScript:** Strict mode with comprehensive type definitions
