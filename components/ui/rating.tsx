import React from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface RatingProps {
  rating: number
  maxRating?: number
  size?: "sm" | "md" | "lg"
  showNumber?: boolean
  className?: string
}

export function Rating({ 
  rating, 
  maxRating = 5, 
  size = "md", 
  showNumber = true,
  className 
}: RatingProps) {
  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4", 
    lg: "w-5 h-5"
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex">
        {Array.from({ length: maxRating }, (_, index) => {
          const starNumber = index + 1
          const isFilled = starNumber <= rating
          const isPartial = starNumber > rating && starNumber - 1 < rating
          
          return (
            <Star
              key={index}
              className={cn(
                sizeClasses[size],
                isFilled 
                  ? "fill-yellow-400 text-yellow-400" 
                  : isPartial
                  ? "fill-yellow-200 text-yellow-400"
                  : "fill-gray-200 text-gray-300"
              )}
            />
          )
        })}
      </div>
      {showNumber && (
        <span className="text-sm text-muted-foreground ml-1">
          {rating}/{maxRating}
        </span>
      )}
    </div>
  )
}
