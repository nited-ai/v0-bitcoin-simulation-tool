# Development Best Practices

> Version: 1.0.0
> Last updated: 2025-01-20
> Scope: Global development standards

## Context

This file is part of the Agent OS standards system. These global best practices are referenced by all product codebases and provide default development guidelines. Individual projects may extend or override these practices in their `.agent-os/product/dev-best-practices.md` file.

## Core Principles

### Keep It Simple
- Implement code in the fewest lines possible
- Avoid over-engineering solutions
- Choose straightforward approaches over clever ones
- Prefer composition over inheritance
- Use TypeScript's type system to catch errors early

### Optimize for Readability
- Prioritize code clarity over micro-optimizations
- Write self-documenting code with clear variable names
- Add comments for "why" not "what"
- Use descriptive function and component names
- Keep functions small and focused (< 50 lines)

### DRY (Don't Repeat Yourself)
- Extract repeated business logic to custom hooks
- Extract repeated UI markup to reusable components
- Create utility functions for common operations
- Use TypeScript interfaces for shared data structures

## Microservices & Component Architecture

### Component Isolation
- Each component should be **completely self-contained**
- Components must function independently without external dependencies
- Avoid tight coupling between components
- Use props and context for data flow, never direct imports of component state

### Modular Structure
- **Small, focused components** (< 200 lines each)
- **Single responsibility principle** - one component, one purpose
- **Clear separation of concerns** - UI, logic, and data handling
- **Independent testing** - each component testable in isolation

### Microservice Principles
- Each feature module should be **independently deployable**
- **Parallel team development** - multiple developers can work simultaneously
- **Easy to locate and fix bugs** - clear module boundaries
- **Simple to add new features** - plug-and-play architecture

### Example Module Structure
```
app/
├── features/
│   ├── simulation/                    # Simulation Microservice
│   │   ├── components/               # UI Components
│   │   ├── hooks/                    # Business Logic
│   │   ├── services/                 # API Layer
│   │   ├── types/                    # TypeScript Definitions
│   │   └── index.ts                  # Public API
│   ├── price-engine/                 # Price Engine Microservice
│   │   ├── models/                   # Price Models
│   │   ├── cache/                    # Caching Layer
│   │   ├── utils/                    # Calculations
│   │   └── index.ts                  # Public API
│   └── shared/                       # Shared Components
│       ├── ui/                       # Reusable UI
│       ├── hooks/                    # Shared Hooks
│       └── utils/                    # Common Utilities
```

## Dependencies

### Choose Libraries Wisely
When adding third-party dependencies:
- Select the most popular and actively maintained option
- Check the library's GitHub repository for:
  - Recent commits (within last 6 months)
  - Active issue resolution
  - Number of stars/downloads
  - Clear documentation
  - TypeScript support
- Prefer libraries with tree-shaking support
- Avoid dependencies that bundle large amounts of unused code

### Recommended Stack
- **UI Components**: shadcn/ui (built on Radix UI)
- **State Management**: React Context + useReducer or Zustand
- **Data Fetching**: React Query/TanStack Query
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts or Chart.js
- **Utilities**: date-fns, clsx, tailwind-merge

## Code Organization

### File Structure
- Keep files focused on a single responsibility
- Group related functionality together
- Use consistent naming conventions
- Export components and utilities through index files
- Separate concerns: components, hooks, services, types

### Component Best Practices

#### Component Size
- **Maximum 200 lines** per component file
- Extract complex logic to custom hooks
- Split large components into smaller sub-components
- Use composition patterns for flexibility

#### Props and State
- Use TypeScript interfaces for all props
- Prefer controlled components over uncontrolled
- Lift state up when shared between components
- Use React Context for deeply nested prop drilling

#### Example Component Structure
```typescript
// components/simulation/simulation-card.tsx
import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

import { useSimulation } from "../hooks/use-simulation"
import type { SimulationParams } from "../types"

interface SimulationCardProps {
  params: SimulationParams
  onParamsChange: (params: SimulationParams) => void
}

export function SimulationCard({ params, onParamsChange }: SimulationCardProps) {
  const { runSimulation, isLoading, results } = useSimulation()

  const handleRunSimulation = async () => {
    const simulationResults = await runSimulation(params)
    // Handle results
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Bitcoin Simulation</CardTitle>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleRunSimulation}
          disabled={isLoading}
          className="w-full">
          {isLoading ? "Running..." : "Start Simulation"}
        </Button>
      </CardContent>
    </Card>
  )
}
```

### Custom Hooks Pattern
- Extract business logic to custom hooks
- Keep components focused on rendering
- Make hooks reusable across components
- Use TypeScript for hook parameters and return types

```typescript
// hooks/use-simulation.ts
import { useState, useCallback } from "react"
import type { SimulationParams, SimulationResult } from "../types"

export function useSimulation() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<SimulationResult | null>(null)

  const runSimulation = useCallback(async (params: SimulationParams) => {
    setIsLoading(true)
    try {
      // Simulation logic here
      const result = await simulateStrategy(params)
      setResults(result)
      return result
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { runSimulation, isLoading, results }
}
```

## Testing

### Testing Strategy
- **Unit Tests**: Test individual components and hooks in isolation
- **Integration Tests**: Test component interactions and data flow
- **E2E Tests**: Test critical user journeys
- Use React Testing Library for component tests
- Use Vitest or Jest for unit tests

### Test Organization
- Co-locate tests with components (`component.test.tsx`)
- Create test utilities for common setup
- Mock external dependencies and API calls
- Test both happy path and error conditions

### Example Test Structure
```typescript
// components/simulation/simulation-card.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { SimulationCard } from "./simulation-card"
import type { SimulationParams } from "../types"

const mockParams: SimulationParams = {
  btcAmount: 1,
  initialBtcPrice: 50000,
  simulationMonths: 12
}

describe("SimulationCard", () => {
  it("renders simulation button", () => {
    render(<SimulationCard params={mockParams} onParamsChange={jest.fn()} />)
    expect(screen.getByText("Start Simulation")).toBeInTheDocument()
  })

  it("shows loading state when running simulation", async () => {
    render(<SimulationCard params={mockParams} onParamsChange={jest.fn()} />)
    
    fireEvent.click(screen.getByText("Start Simulation"))
    
    await waitFor(() => {
      expect(screen.getByText("Running...")).toBeInTheDocument()
    })
  })
})
```

## Performance

### React Performance
- Use `React.memo()` for expensive components
- Implement `useMemo()` and `useCallback()` for expensive calculations
- Avoid creating objects/functions in render
- Use lazy loading for large components
- Implement proper key props for lists

### Bundle Optimization
- Use dynamic imports for code splitting
- Implement route-based code splitting with Next.js
- Optimize images with Next.js Image component
- Use tree-shaking friendly imports

### Caching Strategy
- Cache expensive calculations with `useMemo()`
- Implement proper cache invalidation
- Use React Query for server state caching
- Cache static data at build time when possible

## Error Handling

### Error Boundaries
- Implement error boundaries for each major feature
- Provide fallback UI for component errors
- Log errors for debugging and monitoring

### Async Error Handling
- Always handle Promise rejections
- Provide user-friendly error messages
- Implement retry mechanisms for transient failures
- Use proper loading and error states

```typescript
// components/error-boundary.tsx
import React from "react"

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-200 rounded-md bg-red-50">
          <h2 className="text-lg font-semibold text-red-800">
            Something went wrong
          </h2>
          <p className="text-red-600">
            Please refresh the page or try again later.
          </p>
        </div>
      )
    }

    return this.props.children
  }
}
```

## Documentation

### Component Documentation
- Document component props with TypeScript interfaces
- Add JSDoc comments for complex components
- Include usage examples in component files
- Document any side effects or external dependencies

### API Documentation
- Document all exported functions and hooks
- Include parameter types and return types
- Provide usage examples
- Document error conditions and edge cases

---