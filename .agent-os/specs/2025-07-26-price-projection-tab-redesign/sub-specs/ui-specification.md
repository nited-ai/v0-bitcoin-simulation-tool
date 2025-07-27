# UI Specification

This is the UI specification for the spec detailed in @.agent-os/specs/2025-07-26-price-projection-tab-redesign/spec.md

> Created: 2025-07-26
> Version: 1.0.0

## Component Architecture

### Main Tab Navigation
```tsx
<Tabs defaultValue="parameters" className="w-full">
  <TabsList className="grid w-full grid-cols-4">
    <TabsTrigger value="parameters">Parameters</TabsTrigger>
    <TabsTrigger value="price-projection">Price Projection</TabsTrigger>
    <TabsTrigger value="strategy">Strategy</TabsTrigger>
    <TabsTrigger value="results">Results</TabsTrigger>
  </TabsList>
  
  <TabsContent value="price-projection">
    {/* Price Projection Tab Content */}
  </TabsContent>
</Tabs>
```

### Price Projection Tab Layout
```tsx
<div className="space-y-6">
  {/* Header Section */}
  <div>
    <h2 className="text-2xl font-bold">Price Model</h2>
    <p className="text-muted-foreground">Define your expectations for price development.</p>
  </div>

  {/* Model Selection */}
  <Card>
    <CardHeader>
      <CardTitle>Select Model</CardTitle>
    </CardHeader>
    <CardContent>
      <Select>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Choose price prediction model" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="manual">
            <div className="flex flex-col">
              <span className="font-medium">Manual Growth Rates</span>
              <span className="text-sm text-muted-foreground">User-defined annual growth rates for custom price projections</span>
            </div>
          </SelectItem>
          <SelectItem value="powerLaw">
            <div className="flex flex-col">
              <span className="font-medium">Power Law Model</span>
              <span className="text-sm text-muted-foreground">Bitcoin price prediction based on logarithmic regression since genesis</span>
            </div>
          </SelectItem>
          <SelectItem value="cycleRepeat">
            <div className="flex flex-col">
              <span className="font-medium">Cycle Repeat Model</span>
              <span className="text-sm text-muted-foreground">Bitcoin price prediction based on repeating historical cycles</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </CardContent>
  </Card>

  {/* Price Chart */}
  <Card>
    <CardHeader>
      <CardTitle>Bitcoin Price Forecast</CardTitle>
      <CardDescription>Historical and projected Bitcoin price based on the selected model.</CardDescription>
    </CardHeader>
    <CardContent>
      {/* Recharts implementation with historical + projected data */}
      <div className="h-[400px] w-full">
        {/* Chart component will be implemented here */}
      </div>
      
      {/* Chart Legend with Price Line Selection */}
      <div className="mt-4 flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-blue-500"></div>
          <span className="text-sm">Historical Price</span>
        </div>
        <div className="flex items-center gap-2 cursor-pointer">
          <div className="h-3 w-3 rounded-full bg-green-500"></div>
          <span className="text-sm">Fit Line (Average)</span>
        </div>
        <div className="flex items-center gap-2 cursor-pointer">
          <div className="h-3 w-3 rounded-full bg-red-500"></div>
          <span className="text-sm">Support Line</span>
        </div>
        <div className="flex items-center gap-2 cursor-pointer">
          <div className="h-3 w-3 rounded-full bg-orange-500"></div>
          <span className="text-sm">Volatile Line</span>
        </div>
      </div>
    </CardContent>
  </Card>

  {/* Model Configuration */}
  <Card>
    <CardHeader>
      <CardTitle>Define the annual growth rates of the BTC price.</CardTitle>
    </CardHeader>
    <CardContent>
      {/* Dynamic form based on selected model */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Manual Growth Rates - 12 inputs */}
        <div className="space-y-2">
          <Label htmlFor="year1">Year 1 (%)</Label>
          <Input id="year1" type="number" defaultValue="180" />
        </div>
        {/* ... repeat for years 2-12 */}
      </div>
    </CardContent>
  </Card>
</div>
```

## shadcn/ui Components Used

### Core Components
- **Tabs, TabsList, TabsTrigger, TabsContent** - Main navigation structure
- **Card, CardHeader, CardTitle, CardDescription, CardContent** - Content containers
- **Select, SelectTrigger, SelectValue, SelectContent, SelectItem** - Model selection dropdown
- **Input, Label** - Form inputs for model parameters
- **Button** - Action buttons for generating projections

### Layout Components
- **div with Tailwind classes** - Grid layouts and spacing
- **space-y-*, grid, flex** - Responsive layout utilities

## Responsive Design

### Desktop (lg+)
- 6-column grid for growth rate inputs
- Full-width chart with optimal height
- Side-by-side layout for model info and parameters

### Tablet (md)
- 3-column grid for growth rate inputs
- Stacked layout for better readability
- Maintained chart proportions

### Mobile (sm)
- 2-column grid for growth rate inputs
- Single-column layout
- Compressed chart height for mobile viewing

## Accessibility Features

- Proper ARIA labels for all interactive elements
- Keyboard navigation support for tabs and form inputs
- High contrast colors for chart elements
- Screen reader friendly descriptions for complex charts
- Focus management between tab transitions

## Visual Design Principles

- **Dark Theme Compatibility** - All components work with dark/light themes
- **Consistent Spacing** - Using Tailwind's space-y-6 for vertical rhythm
- **Clear Hierarchy** - Card-based layout with proper heading structure
- **Interactive Feedback** - Hover states and selection indicators
- **Professional Appearance** - Clean, modern design suitable for financial tools
