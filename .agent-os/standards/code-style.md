# Code Style Guide

> Version: 1.0.0
> Last Updated: 2025-01-20

## Context

This file is part of the Agent OS standards system. These global code style rules are referenced by all product codebases and provide default formatting guidelines. Individual projects may extend or override these rules in their `.agent-os/product/code-style.md` file.

## General Formatting

### Indentation
- Use 2 spaces for indentation (never tabs)
- Maintain consistent indentation throughout files
- Align nested structures for readability

### Naming Conventions
- **Functions and Variables**: Use camelCase (e.g., `userProfile`, `calculateTotal`)
- **Components and Classes**: Use PascalCase (e.g., `UserProfile`, `PaymentProcessor`)
- **Constants**: Use UPPER_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`)
- **Files**: Use kebab-case for components (e.g., `user-profile.tsx`) or camelCase for utilities (e.g., `calculateTotal.ts`)
- **Types and Interfaces**: Use PascalCase with descriptive names (e.g., `SimulationParams`, `PriceChartData`)

### String Formatting
- Use double quotes for strings: `"Hello World"`
- Use template literals for interpolation: `` `Hello ${name}` ``
- Use single quotes only in JSX attributes when needed to avoid escaping

## TypeScript/React Formatting

### Component Structure
- Use function declarations for components
- Export components as default when single export
- Use named exports for utilities and types
- Place imports in order: React, third-party, local components, utilities, types

### Example Component Structure

```tsx
import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { SimulationChart } from "./simulation-chart"
import { calculateResults } from "@/lib/utils"
import type { SimulationParams, SimulationResult } from "@/types/simulation"

interface SimulationPageProps {
  params: SimulationParams
  onParamsChange: (params: SimulationParams) => void
}

export default function SimulationPage({ params, onParamsChange }: SimulationPageProps) {
  const [results, setResults] = React.useState<SimulationResult | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  const handleRunSimulation = async () => {
    setIsLoading(true)
    try {
      const simulationResults = await calculateResults(params)
      setResults(simulationResults)
    } catch (error) {
      console.error("Simulation failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Bitcoin Simulation</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleRunSimulation}
            disabled={isLoading}
            className="w-full mb-4">
            {isLoading ? "Calculating..." : "Run Simulation"}
          </Button>
          {results && <SimulationChart data={results} />}
        </CardContent>
      </Card>
    </div>
  )
}
```

## JSX/TSX Formatting

### Structure Rules
- Use 2 spaces for indentation
- Place nested elements on new lines with proper indentation
- Self-closing tags should end with `/>` with a space before
- Use fragments `<>` instead of `<React.Fragment>` when no key needed

### Attribute Formatting
- Place each JSX attribute on its own line when multiple attributes
- Align attributes vertically
- Keep the closing `>` on the same line as the last attribute
- Use double quotes for string attributes

### Example JSX Structure

```tsx
<div className="container mx-auto p-4">
  <Card className="w-full max-w-4xl mx-auto">
    <CardHeader className="text-center">
      <CardTitle className="text-2xl font-bold text-primary">
        Bitcoin Simulation Tool
      </CardTitle>
      <CardDescription>
        Simulate Bitcoin-backed loan strategies over time
      </CardDescription>
    </CardHeader>
    <CardContent>
      <Button
        onClick={handleSubmit}
        disabled={isLoading}
        variant="default"
        size="lg"
        className="w-full">
        {isLoading ? "Processing..." : "Start Simulation"}
      </Button>
    </CardContent>
  </Card>
</div>
```

## Tailwind CSS Preferences

### Multi-line CSS classes in JSX

- We use a unique multi-line formatting style when writing Tailwind CSS classes in JSX className attributes, where the classes for each responsive size are written on their own dedicated line.
- The top-most line should be the smallest size (no responsive prefix). Each line below it should be the next responsive size up.
- Each line of CSS classes should be aligned vertically.
- hover, focus, and dark mode classes should be on their own additional dedicated lines.
- We implement one additional responsive breakpoint size called 'xs' which represents 400px.
- If there are any custom CSS classes being used, those should be included at the start of the first line.

**Example of multi-line Tailwind CSS classes:**

```tsx
<div className="custom-cta bg-gray-50 dark:bg-gray-900 p-4 rounded cursor-pointer w-full
                hover:bg-gray-100 dark:hover:bg-gray-800
                focus:ring-2 focus:ring-primary focus:outline-none
                xs:p-6
                sm:p-8 sm:font-medium
                md:p-10 md:text-lg
                lg:p-12 lg:text-xl lg:font-semibold lg:w-3/5
                xl:p-14 xl:text-2xl
                2xl:p-16 2xl:text-3xl 2xl:font-bold 2xl:w-3/4">
  I'm a call-to-action!
</div>
```

## TypeScript Specific Rules

### Type Definitions
- Use `interface` for object shapes that might be extended
- Use `type` for unions, primitives, and computed types
- Export types from dedicated files when shared across components
- Use generic types for reusable components

### Example Type Definitions

```typescript
// interfaces/simulation.ts
export interface SimulationParams {
  btcAmount: number
  initialBtcPrice: number
  simulationMonths: number
  priceModel: PriceModel
}

export type PriceModel = "manual" | "powerLaw" | "cycleRepeat"

export interface SimulationResult {
  finalBtcAmount: number
  totalDebt: number
  monthlyResults: MonthlyResult[]
}

// Generic component props
interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  onRowSelect?: (row: T) => void
}
```

### Function Signatures
- Use arrow functions for inline callbacks
- Use function declarations for main component functions
- Always type function parameters and return types for exported functions

```typescript
// Utility function with explicit types
export function calculateCompoundInterest(
  principal: number,
  rate: number,
  time: number,
  monthlyPayment: number
): number {
  return principal * Math.pow(1 + rate / 12, time * 12) + 
         monthlyPayment * ((Math.pow(1 + rate / 12, time * 12) - 1) / (rate / 12))
}

// Component with typed props
export default function PriceChart({ data, height = 400 }: {
  data: PriceChartData[]
  height?: number
}) {
  // Component implementation
}
```

## Code Comments

### When to Comment
- Add brief comments above non-obvious business logic
- Document complex algorithms or calculations
- Explain the "why" behind implementation choices
- Document API interfaces and expected data structures

### Comment Maintenance
- Never remove existing comments unless removing the associated code
- Update comments when modifying code to maintain accuracy
- Keep comments concise and relevant

### Comment Format
```typescript
/**
 * Calculate compound interest with monthly contributions
 * Uses the formula: A = P(1 + r/n)^(nt) + PMT × (((1 + r/n)^(nt) - 1) / (r/n))
 */
export function calculateCompoundInterest(
  principal: number,
  rate: number,
  time: number,
  monthlyPayment: number
): number {
  // Convert annual rate to monthly
  const monthlyRate = rate / 12
  const totalMonths = time * 12
  
  // Calculate compound growth of principal
  const principalGrowth = principal * Math.pow(1 + monthlyRate, totalMonths)
  
  // Calculate future value of monthly payments
  const paymentGrowth = monthlyPayment * 
    ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate)
  
  return principalGrowth + paymentGrowth
}
```

## File Organization

### Import Order
1. React and React-related imports
2. Third-party library imports
3. UI component imports (shadcn/ui)
4. Local component imports
5. Utility function imports
6. Type imports (with `type` keyword)

```typescript
import React, { useState, useEffect } from "react"
import { format } from "date-fns"
import { LineChart, Line, XAxis, YAxis } from "recharts"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

import { PriceChart } from "./price-chart"
import { ResultsTable } from "./results-table"

import { calculateResults, formatCurrency } from "@/lib/utils"
import type { SimulationParams, SimulationResult } from "@/types/simulation"
```

### Export Patterns
- Use default exports for main components
- Use named exports for utilities, hooks, and types
- Group related exports in index files when appropriate

```typescript
// components/simulation/index.ts
export { default as SimulationPage } from "./simulation-page"
export { default as ParametersCard } from "./parameters-card"
export { default as ResultsChart } from "./results-chart"
export type { SimulationPageProps } from "./types"
```

---