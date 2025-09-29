"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useLocaleNumberFormat } from "@/shared/utils/localeNumberFormat"

export interface NumberInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  decimals?: number
  suffix?: string
  placeholder?: string
  className?: string
  disabled?: boolean
  error?: string
  warning?: string
  debounceMs?: number // Add debouncing option
  id?: string // Add id for accessibility
  name?: string // Add name for accessibility
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({
    value,
    onChange,
    min,
    max,
    step = 1,
    decimals = 2, // Default to 2 decimal places to allow decimal input
    suffix,
    placeholder,
    className,
    disabled,
    error,
    warning,
    debounceMs = 300, // Default 300ms debounce
    id,
    name,
    ...props
  }, ref) => {
    const [displayValue, setDisplayValue] = React.useState<string>("")
    const [isFocused, setIsFocused] = React.useState(false)
    const debounceTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

    // Use locale-aware number formatting
    const {
      formatForInput,
      parseNumber,
      getDecimalSeparator,
      isValidDecimalSeparator,
      config
    } = useLocaleNumberFormat()

    // Format number for display using locale-aware formatting
    const formatNumber = React.useCallback((num: number): string => {
      if (isNaN(num)) return ""
      // Use locale-aware formatting for input display
      return formatForInput(num, decimals)
    }, [decimals, formatForInput])

    // Parse string to number using locale-aware parsing
    const parseNumberLocale = React.useCallback((str: string): number => {
      return parseNumber(str)
    }, [parseNumber])

    // Update display value when value prop changes
    React.useEffect(() => {
      if (!isFocused) {
        setDisplayValue(formatNumber(value))
      }
    }, [value, formatNumber, isFocused])

    // Initialize display value
    React.useEffect(() => {
      setDisplayValue(formatNumber(value))
    }, [formatNumber, value])

    // Debounced onChange to prevent excessive updates
    const debouncedOnChange = React.useCallback((constrainedValue: number) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }

      debounceTimeoutRef.current = setTimeout(() => {
        onChange(constrainedValue)
      }, debounceMs)
    }, [onChange, debounceMs])

    // Cleanup timeout on unmount
    React.useEffect(() => {
      return () => {
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current)
        }
      }
    }, [])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      setDisplayValue(inputValue)

      // Parse and validate the number using locale-aware parsing
      const numericValue = parseNumberLocale(inputValue)

      // Apply min/max constraints
      let constrainedValue = numericValue
      if (min !== undefined && constrainedValue < min) {
        constrainedValue = min
      }
      if (max !== undefined && constrainedValue > max) {
        constrainedValue = max
      }

      // Call debounced onChange to prevent excessive updates
      debouncedOnChange(constrainedValue)
    }

    const handleFocus = () => {
      setIsFocused(true)
    }

    const handleBlur = () => {
      setIsFocused(false)
      // Format the display value on blur
      setDisplayValue(formatNumber(value))
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow: backspace, delete, tab, escape, enter
      if ([8, 9, 27, 13, 46].indexOf(e.keyCode) !== -1 ||
          // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z
          (e.keyCode === 65 && e.ctrlKey === true) ||
          (e.keyCode === 67 && e.ctrlKey === true) ||
          (e.keyCode === 86 && e.ctrlKey === true) ||
          (e.keyCode === 88 && e.ctrlKey === true) ||
          (e.keyCode === 90 && e.ctrlKey === true) ||
          // Allow: home, end, left, right, up, down
          (e.keyCode >= 35 && e.keyCode <= 40)) {
        return
      }

      // Handle decimal separator based on locale
      const currentDecimalSeparator = getDecimalSeparator()

      // Allow decimal point (period) for English locale
      if (e.keyCode === 190 || e.keyCode === 110) {
        if (currentDecimalSeparator === '.') {
          // Only allow one decimal point
          if (displayValue.includes('.')) {
            e.preventDefault()
          }
          return
        } else {
          // Block period if locale uses comma as decimal separator
          e.preventDefault()
          return
        }
      }

      // Allow comma for German locale decimal separator
      if (e.keyCode === 188) {
        if (currentDecimalSeparator === ',') {
          // Only allow one decimal comma
          if (displayValue.includes(',')) {
            e.preventDefault()
          }
          return
        } else {
          // Block comma if locale uses period as decimal separator
          e.preventDefault()
          return
        }
      }

      // Allow minus sign for negative numbers (only at beginning)
      if (e.keyCode === 189 || e.keyCode === 109) {
        // Only allow at the beginning and if min allows negative values
        if (displayValue.length > 0 || (min !== undefined && min >= 0)) {
          e.preventDefault()
        }
        return
      }

      // Allow numbers (0-9 from main keyboard and numpad)
      if ((e.keyCode >= 48 && e.keyCode <= 57) || (e.keyCode >= 96 && e.keyCode <= 105)) {
        return
      }

      // Block all other keys
      e.preventDefault()
    }

    return (
      <div className={cn("relative", className)}>
        <Input
          ref={ref}
          type="text"
          id={id}
          name={name}
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            suffix && "pr-12",
            error && "border-red-500 focus-visible:ring-red-500",
            warning && "border-yellow-500 focus-visible:ring-yellow-500"
          )}
          {...props}
        />
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
            {suffix}
          </div>
        )}
        {error && (
          <p className="text-sm text-red-500 mt-1">{error}</p>
        )}
        {warning && !error && (
          <p className="text-sm text-yellow-600 mt-1">{warning}</p>
        )}
      </div>
    )
  }
)

NumberInput.displayName = "NumberInput"
