'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export type TabValue = 'parameters' | 'price-projection' | 'strategy' | 'results'

interface TabNavigationProps {
  children?: React.ReactNode
}

export function TabNavigation({ children }: TabNavigationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get initial tab from URL or default to parameters
  const getInitialTab = (): TabValue => {
    const tabParam = searchParams.get('tab') as TabValue
    if (tabParam && ['parameters', 'price-projection', 'strategy', 'results'].includes(tabParam)) {
      return tabParam
    }
    return 'parameters'
  }

  const [activeTab, setActiveTab] = useState<TabValue>(getInitialTab)

  // Update tab when URL changes
  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabValue
    if (tabParam && ['parameters', 'price-projection', 'strategy', 'results'].includes(tabParam)) {
      setActiveTab(tabParam)
    } else {
      setActiveTab('parameters')
    }
  }, [searchParams])

  const handleTabChange = (value: string) => {
    const tabValue = value as TabValue
    setActiveTab(tabValue)

    // Update URL without page reload
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tabValue)
    router.replace(`?${params.toString()}`)
  }

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="parameters">Parameters</TabsTrigger>
          <TabsTrigger value="price-projection">Price Projection</TabsTrigger>
          <TabsTrigger value="strategy">Strategy</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>
        
        <TabsContent value="parameters" className="mt-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Parameters</h2>
              <p className="text-muted-foreground">Configure your loan parameters and investment settings.</p>
            </div>
            <div className="p-6 border rounded-lg">
              <p>Parameters content will be implemented here</p>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="price-projection" className="mt-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Price Projection</h2>
              <p className="text-muted-foreground">Select and configure Bitcoin price prediction models.</p>
            </div>
            <div className="p-6 border rounded-lg">
              <p>Price projection content will be implemented here</p>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="strategy" className="mt-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Strategy</h2>
              <p className="text-muted-foreground">Choose and configure your Bitcoin lending strategy.</p>
            </div>
            <div className="p-6 border rounded-lg">
              <p>Strategy content will be implemented here</p>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="results" className="mt-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Results</h2>
              <p className="text-muted-foreground">View your simulation results and analysis.</p>
            </div>
            <div className="p-6 border rounded-lg">
              <p>Results content will be implemented here</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
