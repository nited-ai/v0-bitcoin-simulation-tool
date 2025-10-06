/**
 * JSON API Endpoints Integration Tests
 * 
 * Tests for the JSON-only API endpoints that manage Bitcoin price data
 * without database dependencies.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as jsonDailyUpdateGET, POST as jsonDailyUpdatePOST } from '../json-daily-update/route'
import { GET as jsonBackfillGET, POST as jsonBackfillPOST } from '../json-backfill/route'
import { GET as jsonServicesGET, POST as jsonServicesPOST } from '../json-services/route'

// Mock the services
vi.mock('@/lib/services/json-only-daily-update-service', () => ({
  jsonOnlyDailyUpdateService: {
    getStatus: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    performUpdate: vi.fn()
  }
}))

vi.mock('@/lib/services/json-historical-backfill-service', () => ({
  jsonHistoricalBackfillService: {
    backfillMissingData: vi.fn(),
    backfillDateRange: vi.fn()
  }
}))

vi.mock('@/lib/services/json-service-initializer', () => ({
  initializeJsonServices: vi.fn(),
  stopJsonServices: vi.fn(),
  getInitializationStatus: vi.fn()
}))

describe('JSON API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('/api/bitcoin-prices/json-daily-update', () => {
    describe('GET', () => {
      it('should return service status', async () => {
        const { jsonOnlyDailyUpdateService } = await import('@/lib/services/json-only-daily-update-service')
        
        jsonOnlyDailyUpdateService.getStatus.mockReturnValue({
          isRunning: true,
          lastUpdateTime: new Date('2025-10-06T08:21:01.154Z'),
          nextUpdateTime: new Date('2025-10-07T00:05:00.000Z')
        })

        const request = new NextRequest('http://localhost:3000/api/bitcoin-prices/json-daily-update')
        const response = await jsonDailyUpdateGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.architecture).toBe('json-only')
        expect(data.data.service.isRunning).toBe(true)
      })

      it('should handle service errors', async () => {
        const { jsonOnlyDailyUpdateService } = await import('@/lib/services/json-only-daily-update-service')
        
        jsonOnlyDailyUpdateService.getStatus.mockImplementation(() => {
          throw new Error('Service error')
        })

        const request = new NextRequest('http://localhost:3000/api/bitcoin-prices/json-daily-update')
        const response = await jsonDailyUpdateGET(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
        expect(data.error).toContain('Failed to get JSON-only daily update service status')
      })
    })

    describe('POST', () => {
      it('should start the service', async () => {
        const { jsonOnlyDailyUpdateService } = await import('@/lib/services/json-only-daily-update-service')
        
        jsonOnlyDailyUpdateService.start.mockResolvedValue(undefined)
        jsonOnlyDailyUpdateService.getStatus.mockReturnValue({
          isRunning: true,
          lastUpdateTime: new Date(),
          nextUpdateTime: new Date()
        })

        const request = new NextRequest('http://localhost:3000/api/bitcoin-prices/json-daily-update', {
          method: 'POST',
          body: JSON.stringify({ action: 'start' })
        })
        
        const response = await jsonDailyUpdatePOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.message).toContain('started')
        expect(jsonOnlyDailyUpdateService.start).toHaveBeenCalled()
      })

      it('should stop the service', async () => {
        const { jsonOnlyDailyUpdateService } = await import('@/lib/services/json-only-daily-update-service')
        
        jsonOnlyDailyUpdateService.stop.mockResolvedValue(undefined)
        jsonOnlyDailyUpdateService.getStatus.mockReturnValue({
          isRunning: false
        })

        const request = new NextRequest('http://localhost:3000/api/bitcoin-prices/json-daily-update', {
          method: 'POST',
          body: JSON.stringify({ action: 'stop' })
        })
        
        const response = await jsonDailyUpdatePOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.message).toContain('stopped')
        expect(jsonOnlyDailyUpdateService.stop).toHaveBeenCalled()
      })

      it('should perform manual update', async () => {
        const { jsonOnlyDailyUpdateService } = await import('@/lib/services/json-only-daily-update-service')
        
        const mockUpdateResult = {
          success: true,
          currentPriceUpdated: true,
          athUpdated: false,
          jsonFilesUpdated: ['daily.json', 'current-price.json'],
          errors: [],
          duration: 1500,
          currentPrice: 123500
        }

        jsonOnlyDailyUpdateService.performUpdate.mockResolvedValue(mockUpdateResult)
        jsonOnlyDailyUpdateService.getStatus.mockReturnValue({ isRunning: false })

        const request = new NextRequest('http://localhost:3000/api/bitcoin-prices/json-daily-update', {
          method: 'POST',
          body: JSON.stringify({ action: 'update' })
        })
        
        const response = await jsonDailyUpdatePOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.updateResult.currentPrice).toBe(123500)
        expect(jsonOnlyDailyUpdateService.performUpdate).toHaveBeenCalled()
      })

      it('should handle invalid actions', async () => {
        const request = new NextRequest('http://localhost:3000/api/bitcoin-prices/json-daily-update', {
          method: 'POST',
          body: JSON.stringify({ action: 'invalid' })
        })
        
        const response = await jsonDailyUpdatePOST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toContain('Invalid action')
      })
    })
  })

  describe('/api/bitcoin-prices/json-backfill', () => {
    describe('GET', () => {
      it('should return backfill service information', async () => {
        const request = new NextRequest('http://localhost:3000/api/bitcoin-prices/json-backfill')
        const response = await jsonBackfillGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.service).toBe('JSON Historical Backfill Service')
        expect(data.data.architecture).toBe('json-only')
        expect(data.data.defaultMissingRange.startDate).toBe('2025-08-19')
      })
    })

    describe('POST', () => {
      it('should backfill missing data', async () => {
        const { jsonHistoricalBackfillService } = await import('@/lib/services/json-historical-backfill-service')
        
        const mockBackfillResult = {
          success: true,
          recordsAdded: 48,
          dateRange: { startDate: '2025-08-19', endDate: '2025-10-06' },
          athUpdated: true,
          newATH: 125360.89,
          errors: [],
          duration: 2500
        }

        jsonHistoricalBackfillService.backfillMissingData.mockResolvedValue(mockBackfillResult)

        const request = new NextRequest('http://localhost:3000/api/bitcoin-prices/json-backfill', {
          method: 'POST',
          body: JSON.stringify({ action: 'backfill-missing' })
        })
        
        const response = await jsonBackfillPOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.backfillResult.recordsAdded).toBe(48)
        expect(data.data.backfillResult.athUpdated).toBe(true)
      })

      it('should backfill specific date range', async () => {
        const { jsonHistoricalBackfillService } = await import('@/lib/services/json-historical-backfill-service')
        
        const mockBackfillResult = {
          success: true,
          recordsAdded: 10,
          dateRange: { startDate: '2025-09-01', endDate: '2025-09-10' },
          athUpdated: false,
          errors: [],
          duration: 1200
        }

        jsonHistoricalBackfillService.backfillDateRange.mockResolvedValue(mockBackfillResult)

        const request = new NextRequest('http://localhost:3000/api/bitcoin-prices/json-backfill', {
          method: 'POST',
          body: JSON.stringify({
            action: 'backfill-range',
            startDate: '2025-09-01',
            endDate: '2025-09-10'
          })
        })
        
        const response = await jsonBackfillPOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.backfillResult.recordsAdded).toBe(10)
        expect(jsonHistoricalBackfillService.backfillDateRange).toHaveBeenCalledWith(
          '2025-09-01',
          '2025-09-10'
        )
      })

      it('should validate date range parameters', async () => {
        const request = new NextRequest('http://localhost:3000/api/bitcoin-prices/json-backfill', {
          method: 'POST',
          body: JSON.stringify({
            action: 'backfill-range'
            // Missing startDate and endDate
          })
        })
        
        const response = await jsonBackfillPOST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toContain('startDate and endDate are required')
      })

      it('should validate date format', async () => {
        const request = new NextRequest('http://localhost:3000/api/bitcoin-prices/json-backfill', {
          method: 'POST',
          body: JSON.stringify({
            action: 'backfill-range',
            startDate: 'invalid-date',
            endDate: '2025-09-10'
          })
        })
        
        const response = await jsonBackfillPOST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toContain('Invalid date format')
      })
    })
  })

  describe('/api/bitcoin-prices/json-services', () => {
    describe('GET', () => {
      it('should return service initialization status', async () => {
        const { getInitializationStatus } = await import('@/lib/services/json-service-initializer')
        
        getInitializationStatus.mockReturnValue({
          isInitialized: true,
          services: {
            jsonOnlyDailyUpdate: true
          }
        })

        const request = new NextRequest('http://localhost:3000/api/bitcoin-prices/json-services')
        const response = await jsonServicesGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.architecture).toBe('json-only')
        expect(data.data.status.isInitialized).toBe(true)
        expect(data.data.benefits).toContain('No database configuration required')
      })
    })

    describe('POST', () => {
      it('should initialize services', async () => {
        const { initializeJsonServices, getInitializationStatus } = await import('@/lib/services/json-service-initializer')
        
        initializeJsonServices.mockResolvedValue(undefined)
        getInitializationStatus.mockReturnValue({
          isInitialized: true,
          services: { jsonOnlyDailyUpdate: true }
        })

        const request = new NextRequest('http://localhost:3000/api/bitcoin-prices/json-services', {
          method: 'POST',
          body: JSON.stringify({ action: 'initialize' })
        })
        
        const response = await jsonServicesPOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.message).toContain('initialized successfully')
        expect(initializeJsonServices).toHaveBeenCalled()
      })

      it('should stop services', async () => {
        const { stopJsonServices, getInitializationStatus } = await import('@/lib/services/json-service-initializer')
        
        stopJsonServices.mockResolvedValue(undefined)
        getInitializationStatus.mockReturnValue({
          isInitialized: false,
          services: { jsonOnlyDailyUpdate: false }
        })

        const request = new NextRequest('http://localhost:3000/api/bitcoin-prices/json-services', {
          method: 'POST',
          body: JSON.stringify({ action: 'stop' })
        })
        
        const response = await jsonServicesPOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.message).toContain('stopped successfully')
        expect(stopJsonServices).toHaveBeenCalled()
      })

      it('should restart services', async () => {
        const { initializeJsonServices, stopJsonServices, getInitializationStatus } = await import('@/lib/services/json-service-initializer')
        
        stopJsonServices.mockResolvedValue(undefined)
        initializeJsonServices.mockResolvedValue(undefined)
        getInitializationStatus.mockReturnValue({
          isInitialized: true,
          services: { jsonOnlyDailyUpdate: true }
        })

        const request = new NextRequest('http://localhost:3000/api/bitcoin-prices/json-services', {
          method: 'POST',
          body: JSON.stringify({ action: 'restart' })
        })
        
        const response = await jsonServicesPOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.message).toContain('restarted successfully')
        expect(stopJsonServices).toHaveBeenCalled()
        expect(initializeJsonServices).toHaveBeenCalled()
      })
    })
  })

  describe('CORS handling', () => {
    it('should handle OPTIONS requests for all endpoints', async () => {
      const { OPTIONS: dailyUpdateOPTIONS } = await import('../json-daily-update/route')
      const { OPTIONS: backfillOPTIONS } = await import('../json-backfill/route')
      const { OPTIONS: servicesOPTIONS } = await import('../json-services/route')

      const responses = await Promise.all([
        dailyUpdateOPTIONS(),
        backfillOPTIONS(),
        servicesOPTIONS()
      ])

      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
        expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET')
        expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST')
      })
    })
  })
})
