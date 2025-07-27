'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, Clock, Download, RefreshCw, Database, Activity } from 'lucide-react'
import { csvUpdateManager, type CsvUpdateResult } from '../../data/csvUpdateManager'

interface DatabaseStatus {
  isRunning: boolean
  totalRecords: number
  dateRange: { start: string; end: string }
  lastUpdate: string
  sources: string[]
  nextUpdate: string
  updateInterval: number
}

export function CsvUpdatePanel() {
  const [isUpdating, setIsUpdating] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<CsvUpdateResult | null>(null)
  const [pendingUpdates, setPendingUpdates] = useState<string[]>([])
  const [databaseStatus, setDatabaseStatus] = useState<DatabaseStatus | null>(null)
  const [useDatabase, setUseDatabase] = useState(true)

  // Load database status on component mount
  useEffect(() => {
    if (useDatabase) {
      loadDatabaseStatus()
      // Refresh status every 30 seconds
      const interval = setInterval(loadDatabaseStatus, 30000)
      return () => clearInterval(interval)
    }
  }, [useDatabase])

  const loadDatabaseStatus = async () => {
    try {
      const { autoUpdateService } = await import('../../data/AutoUpdateService')
      const status = await autoUpdateService.getStatus()

      setDatabaseStatus({
        isRunning: !status.isRunning,
        totalRecords: status.stats.totalRecords,
        dateRange: status.stats.dateRange,
        lastUpdate: status.stats.lastUpdate,
        sources: status.stats.sources,
        nextUpdate: status.schedule.nextRun,
        updateInterval: status.schedule.intervalMinutes
      })
    } catch (error) {
      console.error('Failed to load database status:', error)
    }
  }

  const handleTriggerUpdate = async () => {
    setIsUpdating(true)
    try {
      if (useDatabase) {
        console.log('🚀 Triggering database update...')
        const { autoUpdateService } = await import('../../data/AutoUpdateService')
        const result = await autoUpdateService.forceUpdate()

        setLastUpdate({
          success: result.success,
          recordsAdded: result.recordsAdded,
          lastDate: result.lastDate,
          error: result.error,
          source: result.source
        })

        // Refresh database status
        await loadDatabaseStatus()

      } else {
        console.log('🚀 Triggering manual CSV update...')
        const result = await csvUpdateManager.triggerUpdate()
        setLastUpdate(result)

        // Refresh pending updates
        const pending = csvUpdateManager.getPendingUpdates()
        setPendingUpdates(pending)
      }

    } catch (error) {
      console.error('❌ Update failed:', error)
      setLastUpdate({
        success: false,
        recordsAdded: 0,
        lastDate: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleClearPending = () => {
    csvUpdateManager.clearPendingUpdates()
    setPendingUpdates([])
    console.log('🗑️ Pending updates cleared')
  }

  const handleDownloadUpdates = () => {
    const updates = csvUpdateManager.getPendingUpdates()
    if (updates.length === 0) {
      alert('No pending updates to download')
      return
    }

    const csvContent = updates.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `btc-price-updates-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    console.log('📥 CSV updates downloaded')
  }

  const getStatusIcon = (result: CsvUpdateResult | null) => {
    if (!result) return <Clock className="h-4 w-4" />
    if (result.success) return <CheckCircle className="h-4 w-4 text-green-500" />
    return <AlertCircle className="h-4 w-4 text-red-500" />
  }

  const getStatusBadge = (result: CsvUpdateResult | null) => {
    if (!result) return <Badge variant="secondary">Not Run</Badge>
    if (result.success && result.recordsAdded > 0) return <Badge variant="default">Updated</Badge>
    if (result.success && result.recordsAdded === 0) return <Badge variant="secondary">Up to Date</Badge>
    return <Badge variant="destructive">Failed</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Database Status Card */}
      {useDatabase && databaseStatus && (
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Status
            </CardTitle>
            <CardDescription>
              Automatic Bitcoin price data management
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Total Records</div>
                <div className="text-2xl font-bold">{databaseStatus.totalRecords.toLocaleString()}</div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Date Range</div>
                <div className="text-sm text-muted-foreground">
                  {databaseStatus.dateRange.start} to {databaseStatus.dateRange.end}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Auto-Update</div>
                <div className="flex items-center gap-2">
                  <Activity className={`h-4 w-4 ${databaseStatus.isRunning ? 'text-green-500' : 'text-gray-400'}`} />
                  <span className="text-sm">
                    {databaseStatus.isRunning ? 'Running' : 'Stopped'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Next Update</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(databaseStatus.nextUpdate).toLocaleTimeString()}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Data Sources</div>
              <div className="flex gap-1">
                {databaseStatus.sources.map(source => (
                  <Badge key={source} variant="outline" className="text-xs">
                    {source}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Update Manager Card */}
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            {useDatabase ? 'Database Update Manager' : 'CSV Update Manager'}
          </CardTitle>
          <CardDescription>
            {useDatabase
              ? 'Manage automatic Bitcoin price data updates'
              : 'Manage Bitcoin price data updates for the CSV file'
            }
          </CardDescription>
        </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Update Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Update Status</h3>
            {getStatusBadge(lastUpdate)}
          </div>
          
          {lastUpdate && (
            <div className="bg-muted p-3 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm">
                {getStatusIcon(lastUpdate)}
                <span className="font-medium">
                  {lastUpdate.success ? 'Success' : 'Failed'}
                </span>
                {lastUpdate.source && (
                  <Badge variant="outline" className="text-xs">
                    {lastUpdate.source}
                  </Badge>
                )}
              </div>
              
              {lastUpdate.success ? (
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>Records Added: <span className="font-medium">{lastUpdate.recordsAdded}</span></div>
                  <div>Last Date: <span className="font-medium">{lastUpdate.lastDate}</span></div>
                </div>
              ) : (
                <div className="text-sm text-red-600">
                  Error: {lastUpdate.error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Actions</h3>
          
          <div className="flex gap-2">
            <Button
              onClick={handleTriggerUpdate}
              disabled={isUpdating}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
              {isUpdating ? 'Updating...' : (useDatabase ? 'Force Update' : 'Update CSV')}
            </Button>

            <Button
              variant="outline"
              onClick={() => setUseDatabase(!useDatabase)}
              className="flex items-center gap-2"
            >
              {useDatabase ? <Database className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
              {useDatabase ? 'Switch to CSV' : 'Switch to Database'}
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => {
                const pending = csvUpdateManager.getPendingUpdates()
                setPendingUpdates(pending)
              }}
              className="flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              Check Pending
            </Button>
          </div>
        </div>

        {/* Pending Updates - Only show for CSV mode */}
        {!useDatabase && pendingUpdates.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Pending Updates</h3>
              <Badge variant="outline">{pendingUpdates.length} records</Badge>
            </div>
            
            <div className="bg-muted p-3 rounded-lg">
              <div className="text-xs font-mono space-y-1 max-h-32 overflow-y-auto">
                {pendingUpdates.slice(0, 5).map((record, index) => (
                  <div key={index} className="text-muted-foreground">
                    {record}
                  </div>
                ))}
                {pendingUpdates.length > 5 && (
                  <div className="text-muted-foreground italic">
                    ... and {pendingUpdates.length - 5} more records
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 mt-3">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleDownloadUpdates}
                  className="flex items-center gap-1"
                >
                  <Download className="h-3 w-3" />
                  Download
                </Button>
                
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleClearPending}
                  className="flex items-center gap-1"
                >
                  <AlertCircle className="h-3 w-3" />
                  Clear
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Instructions</h3>
          <div className="text-xs text-muted-foreground space-y-2">
            {useDatabase ? (
              <>
                <p>
                  🗄️ <strong>Database Mode:</strong> Automatic updates run every {databaseStatus?.updateInterval || 60} minutes
                </p>
                <p>
                  🔄 Click "Force Update" to trigger an immediate database update
                </p>
                <p>
                  📊 Database automatically detects gaps and fetches missing data from multiple APIs
                </p>
                <p>
                  ⚡ No manual intervention required - data is automatically persisted
                </p>
              </>
            ) : (
              <>
                <p>
                  1. Click "Update CSV" to fetch missing Bitcoin price data
                </p>
                <p>
                  2. Check "Pending Updates" to see new records that need to be added
                </p>
                <p>
                  3. Download the updates and manually append them to <code>public/btc-price-history.csv</code>
                </p>
                <p>
                  4. Clear pending updates after manual CSV update is complete
                </p>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
    </div>
  )
}
