# Context

This file is part of the Agent OS standards system. These global tech stack defaults are referenced by all product codebases when initializing new projects. Individual projects may override these choices in their `.agent-os/product/tech-stack.md` file.

## Core Technologies

### Application Framework
- **Framework:** Next.js
- **Version:** 15+ (App Router)
- **Language:** TypeScript
- **Runtime:** Node.js 22 LTS

### Database
- **Primary:** PostgreSQL
- **Version:** 17+
- **ORM:** Prisma
- **Version:** Latest stable
- **Migration Strategy:** Prisma Migrate

## Frontend Stack

### JavaScript Framework
- **Framework:** React
- **Version:** 19+ (Latest stable)
- **Build Tool:** Next.js built-in (Turbopack)
- **TypeScript:** Strict mode enabled

### Import Strategy
- **Strategy:** ES Modules
- **Package Manager:** pnpm
- **Node Version:** 22 LTS
- **Path Mapping:** `@/*` for src directory

### CSS Framework
- **Framework:** TailwindCSS
- **Version:** 3.4+
- **PostCSS:** Yes
- **Configuration:** TypeScript config
- **Plugins:** tailwindcss-animate

### UI Components
- **Library:** shadcn/ui
- **Version:** Latest
- **Installation:** Via shadcn/ui CLI
- **Base Components:** Radix UI primitives
- **Styling:** TailwindCSS + CSS Variables
- **Theme System:** next-themes for dark/light mode

## Assets & Media

### Fonts
- **Provider:** Google Fonts (Geist family)
- **Loading Strategy:** next/font optimization
- **Fallbacks:** System fonts

### Icons
- **Library:** Lucide React
- **Implementation:** Tree-shakable React components
- **Size:** 24px default

## Infrastructure

### Application Hosting
- **Platform:** Vercel
- **Service:** Projects from GitHub repos
- **Domains:** Custom domains for each project
- **SSL:** Automatic HTTPS via Vercel
- **Region:** Frankfurt (eu-central-1)
- **Edge Functions:** Vercel Edge Runtime

### Database Hosting
- **Provider:** Vercel Postgres
- **Region:** Frankfurt
- **Service:** Managed PostgreSQL via Neon
- **Connection:** Prisma Client
- **Backups:** Daily automated
- **Connection Pooling:** Built-in

### Asset Storage
- **Provider:** Vercel
- **Service:** Static file serving
- **Region:** Global CDN
- **CDN:** Vercel Edge Network
- **Storage:** Unlimited for static assets
- **Optimization:** Automatic image optimization

## Development Tools

### Code Quality
- **Linter:** ESLint (Next.js config)
- **Formatter:** Prettier
- **Type Checking:** TypeScript strict mode
- **Git Hooks:** Husky + lint-staged (optional)
- **Testing Framework:** Vitest
- **Component Testing:** React Testing Library
- **E2E Testing:** Playwright (optional)

### State Management
- **Local State:** React useState/useReducer
- **Global State:** Zustand or React Context
- **Server State:** TanStack Query (React Query)
- **Form State:** React Hook Form + Zod

### Development Server
- **Hot Reload:** Fast Refresh
- **Port:** 3000 (default)
- **HTTPS:** Local development via mkcert (optional)

## Deployment

### CI/CD Pipeline
- **Platform:** Vercel (GitHub integration)
- **Trigger:** Push to main/staging branches
- **Build Command:** `next build`
- **Tests:** Run via GitHub Actions (optional)
- **Type Check:** Automatic during build

### Environments
- **Production:** main branch → vercel.app domain
- **Preview:** All branches → preview URLs
- **Development:** Local development server

### Environment Variables
- **Storage:** Vercel Environment Variables
- **Database:** `DATABASE_URL` (auto-provided)
- **Secrets:** Encrypted in Vercel dashboard
- **Local:** `.env.local` (gitignored)

## Security

### Authentication
- **Strategy:** Project-specific (NextAuth.js recommended)
- **Session:** JWT or database sessions
- **Providers:** Configurable per project

### Database Security
- **Connection:** SSL enforced
- **Access:** IP allowlisting via Vercel
- **Credentials:** Environment variables only

### Content Security
- **CSP:** Next.js built-in security headers
- **CORS:** Configurable per API route
- **Rate Limiting:** Vercel Edge Config (optional)

## Monitoring & Analytics

### Performance
- **Monitoring:** Vercel Analytics (built-in)
- **Core Web Vitals:** Automatic tracking
- **Bundle Analysis:** @next/bundle-analyzer

### Error Tracking
- **Strategy:** Project-specific
- **Recommended:** Sentry or Vercel monitoring
- **Logging:** Console + Vercel Function logs

## Package Management

### Dependencies
- **Package Manager:** pnpm
- **Lock File:** pnpm-lock.yaml
- **Node Modules:** .gitignored
- **Scripts:** Defined in package.json

### Common Dependencies
- **UI:** @radix-ui/react-* components
- **Styling:** tailwindcss, tailwindcss-animate
- **Icons:** lucide-react
- **Database:** @prisma/client, prisma
- **State:** zustand, @tanstack/react-query
- **Forms:** react-hook-form, zod
- **Testing:** vitest, @testing-library/react
- **Utilities:** clsx, tailwind-merge, date-fns

## File Structure

### Microservices Layout
```
project-root/
├── app/                    # Next.js App Router
├── features/               # Feature-based modules
│   ├── simulation/         # Simulation microservice
│   ├── price-engine/       # Price engine microservice
│   └── shared/            # Shared components
├── components/             # Global UI components
│   └── ui/                # shadcn/ui components
├── lib/                   # Utility functions
├── prisma/                # Database schema & migrations
├── public/                # Static assets
├── .env.local             # Local environment variables
└── package.json           # Dependencies & scripts
```
## Getting Started Template

### Initial Setup Commands
```bash
# Create Next.js project
pnpm create next-app@latest project-name --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"

# Install shadcn/ui
pnpm dlx shadcn@latest init

# Setup Prisma
pnpm add prisma @prisma/client
pnpm dlx prisma init

# Install common dependencies
pnpm add lucide-react next-themes zod zustand @tanstack/react-query react-hook-form date-fns

# Install dev dependencies
pnpm add -D vitest @testing-library/react @testing-library/jest-dominstall lucide-react next-themes zod
```

### Required Configuration Files
- `components.json` - shadcn/ui configuration
- `tailwind.config.ts` - TailwindCSS with shadcn/ui setup
- `prisma/schema.prisma` - Database schema
- `.env.local` - Local environment variables