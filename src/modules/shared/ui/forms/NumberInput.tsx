"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface NumberInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  decimals?: number
  suffix?: string
  prefix?: string
  placeholder?: string
  className?: string
  disabled?: boolean
  error?: string
  warning?: string
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ 
    value, 
    onChange, 
    min, 
    max, 
    step = 1, 
    decimals = 2,
    suffix,
    prefix,
    placeholder,
    className,
    disabled,
    error,
    warning,
    ...props 
  }, ref) => {
    const [displayValue, setDisplayValue] = React.useState<string>("")
    const [isFocused, setIsFocused] = React.useState(false)

    // Format number for display
    const formatNumber = React.useCallback((num: number): string => {
      if (isNaN(num)) return ""
      
      // Handle decimals
      const formatted = decimals === 0 
        ? Math.round(num).toString()
        : num.toFixed(decimals)
      
      // Add thousand separators for large numbers (only when not focused)
      if (!isFocused && Math.abs(num) >= 1000 && decimals === 0) {
        return parseInt(formatted).toLocaleString()
      }
      
      return formatted
    }, [decimals, isFocused])

    // Parse display value to number
    const parseNumber = React.useCallback((str: string): number => {
      // Remove thousand separators and non-numeric characters except decimal point and minus
      const cleaned = str.replace(/[^\d.-]/g, "")
      const parsed = parseFloat(cleaned)
      return isNaN(parsed) ? 0 : parsed
    }, [])

    // Update display value when value prop changes
    React.useEffect(() => {
      if (!isFocused) {
        setDisplayValue(formatNumber(value))
      }
    }, [value, formatNumber, isFocused])

    // Initialize display value
    React.useEffect(() => {
      setDisplayValue(formatNumber(value))
    }, []) // Only run on mount

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      setDisplayValue(inputValue)

      // Parse and validate the number
      const numericValue = parseNumber(inputValue)
      
      // Apply min/max constraints
      let constrainedValue = numericValue
      if (min !== undefined && constrainedValue < min) {
        constrainedValue = min
      }
      if (max !== undefined && constrainedValue > max) {
        constrainedValue = max
      }

      onChange(constrainedValue)
    }

    const handleFocus = () => {
      setIsFocused(true)
      // Show raw number when focused (no formatting)
      setDisplayValue(value.toString())
    }

    const handleBlur = () => {
      setIsFocused(false)
      // Apply final formatting and constraints
      let finalValue = parseNumber(displayValue)
      
      // Apply min/max constraints
      if (min !== undefined && finalValue < min) {
        finalValue = min
      }
      if (max !== undefined && finalValue > max) {
        finalValue = max
      }

      // Update with constrained value
      onChange(finalValue)
      setDisplayValue(formatNumber(finalValue))
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow: backspace, delete, tab, escape, enter, decimal point
      if ([46, 8, 9, 27, 13, 110, 190].indexOf(e.keyCode) !== -1 ||
          // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
          (e.keyCode === 65 && e.ctrlKey === true) ||
          (e.keyCode === 67 && e.ctrlKey === true) ||
          (e.keyCode === 86 && e.ctrlKey === true) ||
          (e.keyCode === 88 && e.ctrlKey === true) ||
          // Allow: home, end, left, right, down, up
          (e.keyCode >= 35 && e.keyCode <= 40)) {
        return
      }
      
      // Ensure that it is a number and stop the keypress
      if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
        e.preventDefault()
      }

      // Handle arrow keys for increment/decrement
      if (e.keyCode === 38) { // Up arrow
        e.preventDefault()
        const newValue = Math.min(max ?? Infinity, value + step)
        onChange(newValue)
      } else if (e.keyCode === 40) { // Down arrow
        e.preventDefault()
        const newValue = Math.max(min ?? -Infinity, value - step)
        onChange(newValue)
      }
    }

    // Create the display value with prefix/suffix
    const getDisplayValueWithAffixes = () => {
      let display = displayValue
      if (prefix && display) display = `${prefix}${display}`
      if (suffix && display) display = `${display} ${suffix}`
      return display
    }

    return (
      <div className="relative">
        <Input
          ref={ref}
          type="text"
          value={isFocused ? displayValue : getDisplayValueWithAffixes()}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            error && "border-red-500 focus-visible:ring-red-500",
            warning && "border-yellow-500 focus-visible:ring-yellow-500",
            className
          )}
          {...props}
        />
        {(error || warning) && (
          <p className={cn(
            "text-sm mt-1",
            error && "text-red-500",
            warning && "text-yellow-500"
          )}>
            {error || warning}
          </p>
        )}
      </div>
    )
  }
)

NumberInput.displayName = "NumberInput"

export { NumberInput }
