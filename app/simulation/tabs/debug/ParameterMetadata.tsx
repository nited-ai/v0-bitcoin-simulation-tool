"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileCode, MapPin, Code2 } from "lucide-react"

/**
 * Parameter metadata for debug display
 */
export interface ParameterInfo {
  name: string
  value: string | number | boolean
  type: string
  controlledBy: string
  origin: string
  description?: string
}

interface ParameterMetadataCardProps {
  title: string
  description: string
  parameters: ParameterInfo[]
  badgeColor?: string
}

/**
 * Parameter Metadata Card Component
 * 
 * Displays parameter information with enhanced metadata showing:
 * - Parameter name (human-readable)
 * - Current value (formatted)
 * - Type/method (code reference)
 * - Controlled by (component filename)
 * - Origin (full path to component)
 */
export function ParameterMetadataCard({
  title,
  description,
  parameters,
  badgeColor = "default"
}: ParameterMetadataCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <Badge variant={badgeColor as any}>{parameters.length} parameters</Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Responsive Grid: 1 column on mobile, 2 on tablet, 4-5 on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {parameters.map((param, index) => (
            <div
              key={index}
              className="p-3 rounded-lg border-2 border-muted hover:border-primary/50 transition-colors flex flex-col"
            >
              {/* Parameter Name & Type */}
              <div className="flex items-start justify-between mb-2 gap-2">
                <h4 className="font-semibold text-sm leading-tight flex-1">{param.name}</h4>
                <Badge variant="outline" className="font-mono text-[10px] px-1 py-0 h-4 flex-shrink-0">
                  {typeof param.value}
                </Badge>
              </div>

              {/* Parameter Value - Prominent Display */}
              <div className="mb-2 p-2 bg-muted/50 rounded flex-grow">
                <div className="font-mono text-base font-bold text-primary break-all">
                  {formatValue(param.value)}
                </div>
              </div>

              {/* Compact Metadata */}
              <div className="space-y-1 text-[11px]">
                {/* Type/Method */}
                <div className="flex items-start gap-1">
                  <Code2 className="w-3 h-3 text-blue-600 mt-0.5 flex-shrink-0" />
                  <code className="text-[10px] bg-blue-50 dark:bg-blue-950/20 px-1 py-0.5 rounded break-all flex-1">
                    {param.type}
                  </code>
                </div>

                {/* Controlled By */}
                <div className="flex items-start gap-1">
                  <FileCode className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                  <code className="text-[10px] bg-green-50 dark:bg-green-950/20 px-1 py-0.5 rounded break-all flex-1">
                    {param.controlledBy}
                  </code>
                </div>

                {/* Origin Path */}
                <div className="flex items-start gap-1">
                  <MapPin className="w-3 h-3 text-purple-600 mt-0.5 flex-shrink-0" />
                  <code className="text-[10px] bg-purple-50 dark:bg-purple-950/20 px-1 py-0.5 rounded break-all flex-1">
                    {param.origin}
                  </code>
                </div>
              </div>

              {/* Parameter Description (if provided) - Collapsible */}
              {param.description && (
                <div className="mt-2 pt-2 border-t text-[10px] text-muted-foreground italic line-clamp-2" title={param.description}>
                  {param.description}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Format parameter value for display
 */
function formatValue(value: string | number | boolean): string {
  if (typeof value === 'boolean') {
    return value ? '✓ Enabled' : '✗ Disabled'
  }
  if (typeof value === 'number') {
    // Format numbers with thousand separators
    return value.toLocaleString()
  }
  return String(value)
}

