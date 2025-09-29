'use client'

import { useState, useCallback, useRef } from 'react'
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ReferenceLine,
  Dot
} from 'recharts'
import { format } from 'date-fns'

interface DataPoint {
  timestamp: number
  date: string
  price: number
  isProjection?: boolean
  isDraggable?: boolean
  yearIndex?: number
}

interface InteractiveProjectionChartProps {
  historicalData: DataPoint[]
  projectionData: DataPoint[]
  growthRates: number[]
  onGrowthRatesChange: (rates: number[]) => void
  startingPrice: number
  className?: string
}

interface DragState {
  isDragging: boolean
  dragIndex: number | null
  startY: number
  startPrice: number
}

// Custom draggable dot component
const DraggableDot = ({ 
  cx, 
  cy, 
  payload, 
  onDragStart, 
  onDrag, 
  onDragEnd,
  isDragging 
}: any) => {
  if (!payload?.isDraggable) return null

  return (
    <Dot
      cx={cx}
      cy={cy}
      r={isDragging ? 8 : 6}
      fill={isDragging ? "#3b82f6" : "#6366f1"}
      stroke="#ffffff"
      strokeWidth={2}
      style={{ 
        cursor: 'grab',
        filter: isDragging ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' : 'none'
      }}
      onMouseDown={(e: any) => {
        e.preventDefault()
        onDragStart(e, payload.yearIndex, cy, payload.price)
      }}
    />
  )
}

export function InteractiveProjectionChart({
  historicalData,
  projectionData,
  growthRates,
  onGrowthRatesChange,
  startingPrice,
  className
}: InteractiveProjectionChartProps) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragIndex: null,
    startY: 0,
    startPrice: 0
  })
  
  const chartRef = useRef<HTMLDivElement>(null)

  // Combine historical and projection data
  const combinedData = [
    ...historicalData.map(d => ({ ...d, isProjection: false })),
    ...projectionData.map((d, index) => ({ 
      ...d, 
      isProjection: true,
      isDraggable: index % 12 === 11, // Make yearly points draggable
      yearIndex: Math.floor(index / 12)
    }))
  ]

  // Find the separation point between historical and projection data
  const separationTimestamp = historicalData[historicalData.length - 1]?.timestamp

  const handleDragStart = useCallback((
    e: React.MouseEvent, 
    yearIndex: number, 
    startY: number, 
    startPrice: number
  ) => {
    e.preventDefault()
    setDragState({
      isDragging: true,
      dragIndex: yearIndex,
      startY,
      startPrice
    })

    // Add global mouse event listeners with throttling for performance
    let lastUpdateTime = 0
    const throttleMs = 16 // ~60fps throttling

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now()
      if (now - lastUpdateTime < throttleMs) return
      lastUpdateTime = now

      if (!chartRef.current) return

      // Use requestAnimationFrame to prevent forced reflow
      requestAnimationFrame(() => {
        const rect = chartRef.current!.getBoundingClientRect()
        const chartHeight = rect.height - 60 // Account for margins
        const deltaY = e.clientY - startY

        // Convert pixel movement to price change (logarithmic scale)
        const priceRatio = Math.exp(-deltaY / (chartHeight / 6)) // Adjust sensitivity
        const newPrice = startPrice * priceRatio

        // Calculate new growth rate based on price change
        const previousPrice = yearIndex === 0 ? startingPrice :
          startingPrice * growthRates.slice(0, yearIndex).reduce((acc, rate) => acc * (1 + rate / 100), 1)

        const newGrowthRate = ((newPrice / previousPrice) - 1) * 100

        // Clamp growth rate to reasonable bounds
        const clampedRate = Math.max(-95, Math.min(500, newGrowthRate))

        // Update growth rates
        const newRates = [...growthRates]
        newRates[yearIndex] = Math.round(clampedRate)
        onGrowthRatesChange(newRates)
      })
    }

    const handleMouseUp = () => {
      // Use requestAnimationFrame to prevent forced reflow on mouseup
      requestAnimationFrame(() => {
        setDragState({
          isDragging: false,
          dragIndex: null,
          startY: 0,
          startPrice: 0
        })
      })
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [growthRates, onGrowthRatesChange, startingPrice])

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null

    const data = payload[0].payload
    const date = new Date(data.timestamp)
    const isProjection = data.isProjection

    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg">
        <p className="font-medium">
          {format(date, 'MMM yyyy')}
        </p>
        <p className={`text-sm ${isProjection ? 'text-blue-600' : 'text-gray-600'}`}>
          {isProjection ? 'Projected' : 'Historical'}: €{data.price.toLocaleString()}
        </p>
        {data.isDraggable && (
          <p className="text-xs text-muted-foreground mt-1">
            💡 Drag to adjust growth rate
          </p>
        )}
      </div>
    )
  }

  // Format Y-axis values
  const formatYAxis = (value: number) => {
    if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `€${(value / 1000).toFixed(0)}k`
    return `€${value}`
  }

  // Format X-axis values
  const formatXAxis = (timestamp: number) => {
    return format(new Date(timestamp), 'MMM yy')
  }

  return (
    <div ref={chartRef} className={className}>
      <ResponsiveContainer width="100%" height={500}>
        <LineChart
          data={combinedData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          
          <XAxis 
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={formatXAxis}
            tick={{ fontSize: 12 }}
          />
          
          <YAxis 
            scale="log"
            domain={['dataMin * 0.8', 'dataMax * 1.2']}
            tickFormatter={formatYAxis}
            tick={{ fontSize: 12 }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Legend />

          {/* Separation line between historical and projection */}
          {separationTimestamp && (
            <ReferenceLine 
              x={separationTimestamp} 
              stroke="#94a3b8" 
              strokeDasharray="5 5"
              label={{ value: "Projection Start", position: "top" }}
            />
          )}

          {/* Historical data line */}
          <Line
            type="monotone"
            dataKey="price"
            stroke="#6b7280"
            strokeWidth={2}
            dot={false}
            name="Historical Price"
            connectNulls={false}
            data={historicalData}
          />

          {/* Projection data line with draggable dots */}
          <Line
            type="monotone"
            dataKey="price"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={<DraggableDot 
              onDragStart={handleDragStart}
              isDragging={dragState.isDragging}
            />}
            name="Price Projection"
            connectNulls={false}
            data={projectionData.map((d, index) => ({
              ...d,
              isDraggable: index % 12 === 11,
              yearIndex: Math.floor(index / 12)
            }))}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Drag instructions */}
      <div className="mt-4 text-center">
        <p className="text-sm text-muted-foreground">
          💡 <strong>Interactive Chart:</strong> Drag the blue dots on the projection line to adjust annual growth rates
        </p>
      </div>
    </div>
  )
}
