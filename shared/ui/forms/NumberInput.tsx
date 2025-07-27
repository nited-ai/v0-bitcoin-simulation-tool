"use client"

import { forwardRef, useState, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export interface NumberInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  decimals?: number
  label?: string
  placeholder?: string
  error?: string
  warning?: string
  disabled?: boolean
  className?: string
  suffix?: string
  prefix?: string
  id?: string
}

/**
 * Reusable Number Input Component
 * 
 * A controlled number input with validation, formatting, and error handling.
 * Supports min/max validation, decimal precision, and custom formatting.
 */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      value,
      onChange,
      min,
      max,
      step = 1,
      decimals = 2,
      label,
      placeholder,
      error,
      warning,
      disabled = false,
      className,
      suffix,
      prefix,
      id,
      ...props
    },
    ref
  ) => {
    const [displayValue, setDisplayValue] = useState(value.toString())
    const [isFocused, setIsFocused] = useState(false)

    /**
     * Format number for display
     */
    const formatNumber = useCallback((num: number): string => {
      if (isNaN(num)) return ""
      return num.toFixed(decimals)
    }, [decimals])

    /**
     * Parse string to number
     */
    const parseNumber = useCallback((str: string): number => {
      const cleaned = str.replace(/[^\d.-]/g, "")
      const parsed = parseFloat(cleaned)
      return isNaN(parsed) ? 0 : parsed
    }, [])

    /**
     * Validate number against constraints
     */
    const validateNumber = useCallback((num: number): string | null => {
      if (min !== undefined && num < min) {
        return `Value must be at least ${min}`
      }
      if (max !== undefined && num > max) {
        return `Value must be at most ${max}`
      }
      return null
    }, [min, max])

    /**
     * Handle input change
     */
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      setDisplayValue(inputValue)

      // Parse and validate
      const numValue = parseNumber(inputValue)
      const validationError = validateNumber(numValue)

      if (!validationError) {
        onChange(numValue)
      }
    }, [parseNumber, validateNumber, onChange])

    /**
     * Handle focus
     */
    const handleFocus = useCallback(() => {
      setIsFocused(true)
      setDisplayValue(value.toString())
    }, [value])

    /**
     * Handle blur
     */
    const handleBlur = useCallback(() => {
      setIsFocused(false)
      const numValue = parseNumber(displayValue)
      const validationError = validateNumber(numValue)

      if (!validationError) {
        // Apply constraints
        let constrainedValue = numValue
        if (min !== undefined) constrainedValue = Math.max(constrainedValue, min)
        if (max !== undefined) constrainedValue = Math.min(constrainedValue, max)

        onChange(constrainedValue)
        setDisplayValue(formatNumber(constrainedValue))
      } else {
        // Reset to last valid value
        setDisplayValue(formatNumber(value))
      }
    }, [displayValue, parseNumber, validateNumber, onChange, min, max, formatNumber, value])

    // Update display value when external value changes (but not when focused)
    if (!isFocused && displayValue !== formatNumber(value)) {
      setDisplayValue(formatNumber(value))
    }

    const hasError = !!error
    const hasWarning = !!warning && !hasError

    return (
      <div className={cn("space-y-2", className)}>
        {label && (
          <Label htmlFor={id} className={cn(hasError && "text-destructive")}>
            {label}
          </Label>
        )}
        
        <div className="relative">
          {prefix && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {prefix}
            </div>
          )}
          
          <Input
            ref={ref}
            id={id}
            type="text"
            inputMode="decimal"
            value={displayValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              hasError && "border-destructive focus-visible:ring-destructive",
              hasWarning && "border-yellow-500 focus-visible:ring-yellow-500",
              prefix && "pl-8",
              suffix && "pr-8"
            )}
            {...props}
          />
          
          {suffix && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {suffix}
            </div>
          )}
        </div>

        {/* Error/Warning Messages */}
        {hasError && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        {hasWarning && (
          <p className="text-sm text-yellow-600">{warning}</p>
        )}

        {/* Range indicators removed as per user request */}
      </div>
    )
  }
)

NumberInput.displayName = "NumberInput"
