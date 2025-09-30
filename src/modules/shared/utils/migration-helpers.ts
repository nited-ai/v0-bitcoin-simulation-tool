/**
 * Migration Helpers
 * 
 * Utilities to assist with the price projection format standardization migration.
 * These helpers provide validation, logging, and conversion utilities for the migration process.
 * 
 * @deprecated These utilities are temporary and will be removed after Phase 4 completion.
 */

import type {
  PriceProjectionResult as NewPriceProjectionResult,
  ProjectionPoint
} from "../../../../app/simulation/price-models/types"
import type {
  PriceChartDataPoint
} from "../../price-data/types"

/**
 * Old Price Projection Result format (for backward compatibility)
 * @deprecated Inline type definition - original module removed in Phase 4
 */
interface OldPriceProjectionResult {
  projectedPrices: Array<{
    month: number
    date: string
    price: number
  }>
  projectionPoints: Array<{
    timestamp: number
    price: number
    date: string
  }>
  metadata: {
    model: string
    version: string
    parameters: Record<string, any>
    generatedAt: string
    totalMonths: number
    initialPrice: number
    finalPrice: number
  }
}

/**
 * Migration phase tracking
 */
export enum MigrationPhase {
  PHASE_1_FOUNDATION = 'Phase 1: Foundation & Service Layer',
  PHASE_2_HOOKS = 'Phase 2: Hooks & State Management',
  PHASE_3_COMPONENTS = 'Phase 3: Components & UI',
  PHASE_4_CLEANUP = 'Phase 4: Cleanup & Optimization'
}

/**
 * Migration status for a file or component
 */
export interface MigrationStatus {
  filePath: string
  phase: MigrationPhase
  status: 'not-started' | 'in-progress' | 'complete' | 'blocked'
  usesNewFormat: boolean
  usesOldFormat: boolean
  usesLegacyFormat: boolean
  blockedBy?: string[]
  notes?: string
}

/**
 * Log migration progress
 */
export function logMigrationProgress(
  component: string,
  phase: MigrationPhase,
  action: string,
  details?: Record<string, any>
) {
  if (process.env.NODE_ENV === 'development') {
    const emoji = getPhaseEmoji(phase)
    console.log(`${emoji} [${phase}] ${component}: ${action}`, details || '')
  }
}

/**
 * Get emoji for migration phase
 */
function getPhaseEmoji(phase: MigrationPhase): string {
  switch (phase) {
    case MigrationPhase.PHASE_1_FOUNDATION:
      return '🏗️'
    case MigrationPhase.PHASE_2_HOOKS:
      return '🪝'
    case MigrationPhase.PHASE_3_COMPONENTS:
      return '🧩'
    case MigrationPhase.PHASE_4_CLEANUP:
      return '🧹'
    default:
      return '📦'
  }
}

/**
 * Validate that a projection result matches the new standard format
 */
export function validateNewFormat(
  projection: any
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check required top-level properties
  if (!projection.modelName || typeof projection.modelName !== 'string') {
    errors.push('Missing or invalid modelName')
  }
  if (!projection.modelVersion || typeof projection.modelVersion !== 'string') {
    errors.push('Missing or invalid modelVersion')
  }
  if (!Array.isArray(projection.projectionPoints)) {
    errors.push('Missing or invalid projectionPoints array')
  }
  if (!projection.metadata || typeof projection.metadata !== 'object') {
    errors.push('Missing or invalid metadata object')
  }

  // Check projection points structure
  if (Array.isArray(projection.projectionPoints)) {
    projection.projectionPoints.forEach((point: any, index: number) => {
      if (typeof point.timestamp !== 'number') {
        errors.push(`Point ${index}: missing or invalid timestamp`)
      }
      if (typeof point.price !== 'number') {
        errors.push(`Point ${index}: missing or invalid price`)
      }
      if (typeof point.confidence !== 'number') {
        errors.push(`Point ${index}: missing or invalid confidence`)
      }
    })
  }

  // Check metadata structure
  if (projection.metadata) {
    const requiredMetadata = [
      'totalMonths',
      'totalGrowth',
      'averageMonthlyGrowth',
      'generatedAt'
    ]
    requiredMetadata.forEach(field => {
      if (!(field in projection.metadata)) {
        errors.push(`Metadata missing required field: ${field}`)
      }
    })
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Detect which format a projection result is using
 */
export function detectFormat(
  projection: any
): 'new' | 'old' | 'legacy' | 'unknown' {
  // Check for new format
  if (
    projection.modelName &&
    projection.modelVersion &&
    Array.isArray(projection.projectionPoints) &&
    projection.projectionPoints[0]?.timestamp &&
    projection.projectionPoints[0]?.confidence !== undefined
  ) {
    return 'new'
  }

  // Check for old format
  if (
    Array.isArray(projection.projectedPrices) &&
    Array.isArray(projection.projectionPoints) &&
    projection.metadata?.model
  ) {
    return 'old'
  }

  // Check for legacy format (array of PriceChartDataPoint)
  if (
    Array.isArray(projection) &&
    projection[0]?.date &&
    projection[0]?.days !== undefined
  ) {
    return 'legacy'
  }

  return 'unknown'
}

/**
 * Compare two projection results for equality (useful for testing)
 */
export function compareProjections(
  a: NewPriceProjectionResult,
  b: NewPriceProjectionResult,
  tolerance: number = 0.01
): { equal: boolean; differences: string[] } {
  const differences: string[] = []

  // Compare metadata
  if (a.modelName !== b.modelName) {
    differences.push(`modelName: ${a.modelName} !== ${b.modelName}`)
  }
  if (a.modelVersion !== b.modelVersion) {
    differences.push(`modelVersion: ${a.modelVersion} !== ${b.modelVersion}`)
  }

  // Compare projection points count
  if (a.projectionPoints.length !== b.projectionPoints.length) {
    differences.push(
      `projectionPoints length: ${a.projectionPoints.length} !== ${b.projectionPoints.length}`
    )
  }

  // Compare projection points (with tolerance for floating point)
  const minLength = Math.min(a.projectionPoints.length, b.projectionPoints.length)
  for (let i = 0; i < minLength; i++) {
    const pointA = a.projectionPoints[i]
    const pointB = b.projectionPoints[i]

    if (Math.abs(pointA.timestamp - pointB.timestamp) > tolerance) {
      differences.push(`Point ${i} timestamp: ${pointA.timestamp} !== ${pointB.timestamp}`)
    }
    if (Math.abs(pointA.price - pointB.price) > tolerance) {
      differences.push(`Point ${i} price: ${pointA.price} !== ${pointB.price}`)
    }
  }

  return {
    equal: differences.length === 0,
    differences
  }
}

/**
 * Create a migration report for a component
 */
export function createMigrationReport(
  componentName: string,
  beforeFormat: 'new' | 'old' | 'legacy' | 'unknown',
  afterFormat: 'new' | 'old' | 'legacy' | 'unknown',
  testsPass: boolean,
  notes?: string
): string {
  const timestamp = new Date().toISOString()
  return `
Migration Report: ${componentName}
Generated: ${timestamp}

Format Transition:
  Before: ${beforeFormat}
  After: ${afterFormat}

Tests: ${testsPass ? '✅ PASS' : '❌ FAIL'}

${notes ? `Notes:\n${notes}` : ''}
`.trim()
}

/**
 * Check if a file has been migrated by looking for migration markers
 */
export function isMigrated(fileContent: string): boolean {
  // Look for migration markers in comments
  const markers = [
    '// Phase 1 Migration: Complete',
    '// Phase 2 Migration: Complete',
    '// Phase 3 Migration: Complete',
    '// Migrated to new standard format'
  ]

  return markers.some(marker => fileContent.includes(marker))
}

/**
 * Generate migration checklist for a component
 */
export function generateMigrationChecklist(componentName: string): string[] {
  return [
    `[ ] Review ${componentName} current format usage`,
    `[ ] Write tests for ${componentName} with new format`,
    `[ ] Update ${componentName} to use new format`,
    `[ ] Verify backward compatibility`,
    `[ ] Run all tests`,
    `[ ] Update documentation`,
    `[ ] Add migration marker comment`,
    `[ ] Commit changes`
  ]
}

/**
 * Export all utilities
 */
export const MigrationHelpers = {
  logMigrationProgress,
  validateNewFormat,
  detectFormat,
  compareProjections,
  createMigrationReport,
  isMigrated,
  generateMigrationChecklist
}

