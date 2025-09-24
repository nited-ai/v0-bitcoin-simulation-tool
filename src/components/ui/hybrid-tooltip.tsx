'use client'

import React, { PropsWithChildren, createContext, useContext, useEffect, useState } from 'react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './tooltip'
import { Popover, PopoverTrigger, PopoverContent } from './popover'
import { TooltipContentProps, TooltipProps, TooltipProviderProps, TooltipTriggerProps } from '@radix-ui/react-tooltip'
import { PopoverContentProps, PopoverProps, PopoverTriggerProps } from '@radix-ui/react-popover'

// Touch detection context
const TouchContext = createContext<boolean | undefined>(undefined)
const useTouch = () => useContext(TouchContext)

// TouchProvider component for touch device detection
const TouchProvider = (props: PropsWithChildren) => {
  const [isTouch, setTouch] = useState<boolean>()

  useEffect(() => {
    const mediaQuery = window.matchMedia('(pointer: coarse)')
    
    // Set initial value
    setTouch(mediaQuery.matches)
    
    // Listen for changes
    const handleChange = () => {
      setTouch(mediaQuery.matches)
    }
    
    mediaQuery.addEventListener('change', handleChange)
    
    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  return <TouchContext.Provider value={isTouch} {...props} />
}

// HybridTooltipProvider with optimized settings
const HybridTooltipProvider = (props: TooltipProviderProps) => {
  return <TooltipProvider delayDuration={0} {...props} />
}

// Enhanced Tooltip Context for sharing state between components
const EnhancedTooltipContext = createContext<{
  clickOpen: boolean
  setClickOpen: (open: boolean) => void
}>({
  clickOpen: false,
  setClickOpen: () => {}
})

// Enhanced Tooltip for non-touch devices with hover + click functionality
const EnhancedTooltip = (props: TooltipProps) => {
  const [clickOpen, setClickOpen] = useState(false)

  // If click is active, use controlled mode, otherwise let hover work naturally
  const tooltipProps = clickOpen
    ? { ...props, open: true, onOpenChange: setClickOpen }
    : props

  return (
    <EnhancedTooltipContext.Provider value={{ clickOpen, setClickOpen }}>
      <Tooltip {...tooltipProps}>
        {props.children}
      </Tooltip>
    </EnhancedTooltipContext.Provider>
  )
}

// Enhanced Tooltip Trigger with dual hover + click functionality
const EnhancedTooltipTrigger = ({
  onClick,
  onKeyDown,
  ...props
}: TooltipTriggerProps & {
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
  onKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void
}) => {
  const { clickOpen, setClickOpen } = useContext(EnhancedTooltipContext)

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    // Toggle persistent tooltip on click
    setClickOpen(!clickOpen)
    onClick?.(event)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    // Handle keyboard navigation
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setClickOpen(!clickOpen)
    } else if (event.key === 'Escape') {
      setClickOpen(false)
    }
    onKeyDown?.(event)
  }

  // Handle click outside to close persistent tooltip
  useEffect(() => {
    if (!clickOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      const currentElement = document.activeElement

      // If click is outside the trigger and tooltip content, close it
      if (currentElement && !currentElement.contains(target)) {
        setClickOpen(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [clickOpen])

  return (
    <TooltipTrigger
      {...props}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    />
  )
}

// Main HybridTooltip component
const HybridTooltip = (props: TooltipProps & PopoverProps) => {
  const isTouch = useTouch()
  
  if (isTouch) {
    return <Popover {...props} />
  }
  
  return <EnhancedTooltip {...props} />
}

// HybridTooltipTrigger component
const HybridTooltipTrigger = (props: TooltipTriggerProps & PopoverTriggerProps) => {
  const isTouch = useTouch()
  
  if (isTouch) {
    return <PopoverTrigger {...props} />
  }
  
  return <EnhancedTooltipTrigger {...props} />
}

// HybridTooltipContent component
const HybridTooltipContent = (props: TooltipContentProps & PopoverContentProps) => {
  const isTouch = useTouch()
  
  if (isTouch) {
    return <PopoverContent {...props} />
  }
  
  return <TooltipContent {...props} />
}

export { 
  TouchProvider, 
  useTouch,
  HybridTooltipProvider, 
  HybridTooltip, 
  HybridTooltipTrigger, 
  HybridTooltipContent,
  EnhancedTooltip,
  EnhancedTooltipTrigger
}
