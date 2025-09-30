import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ResultsExport } from '../ResultsExport'
import { useSimulation } from '../../../context/SimulationContext'

// Mock the context
vi.mock('../../../context/SimulationContext')

// Mock data for testing
const mockResults = [
  {
    month: 1,
    date: '2024-01-01',
    btcPrice: 100000,
    totalBtcAmount: 1.0,
    collateralValue: 100000,
    totalDebt: 10000,
    ltv: 10,
    highestLtv: 10,
    monthlyWithdrawal: 0,
    events: [],
    activeLoans: [],
    repaymentDue: 0,
    newLoanPrincipal: 10000,
    principalForNeeds: 10000,
    principalForReinvestment: 0,
    reinvestment: 0,
    currentBtcAmount: 1.0,
    freeBtc: 0.9,
    lockedBtc: 0.1,
    loanCount: 1,
    repaymentsDue: 0,
    withdrawalAmount: 0,
    dateString: '2024-01-01'
  },
  {
    month: 2,
    date: '2024-02-01',
    btcPrice: 110000,
    totalBtcAmount: 1.0,
    collateralValue: 110000,
    totalDebt: 10000,
    ltv: 9.09,
    highestLtv: 10,
    monthlyWithdrawal: 0,
    events: [],
    activeLoans: [],
    repaymentDue: 0,
    newLoanPrincipal: 0,
    principalForNeeds: 0,
    principalForReinvestment: 0,
    reinvestment: 0,
    currentBtcAmount: 1.0,
    freeBtc: 0.9,
    lockedBtc: 0.1,
    loanCount: 1,
    repaymentsDue: 0,
    withdrawalAmount: 0,
    dateString: '2024-02-01'
  }
]

const mockParams = {
  initialBtcAmount: 1.0,
  initialBtcPrice: 100000,
  investmentStrategy: 'rollingLoan' as const,
  simulationMonths: 12,
  monthlyWithdrawalAmount: 0,
  annualInterestRate: 0.1,
  loanTermMonths: 6,
  riskLevel: 'moderate' as const,
  platform: 'firefish' as const
}

describe('ResultsExport Integration Tests', () => {
  let mockCreateObjectURL: ReturnType<typeof vi.fn>
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>
  let mockClick: ReturnType<typeof vi.fn>
  let mockAppendChild: ReturnType<typeof vi.fn>
  let mockRemoveChild: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url')
    mockRevokeObjectURL = vi.fn()
    global.URL.createObjectURL = mockCreateObjectURL
    global.URL.revokeObjectURL = mockRevokeObjectURL

    // Mock document methods for file download
    mockClick = vi.fn()
    mockAppendChild = vi.fn()
    mockRemoveChild = vi.fn()
    
    const mockAnchor = {
      href: '',
      download: '',
      click: mockClick,
      style: { display: '' }
    }
    
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)
    vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild)
    vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild)

    // Mock useSimulation with real data
    vi.mocked(useSimulation).mockReturnValue({
      results: mockResults,
      params: mockParams,
      setParams: vi.fn(),
      currentPage: 1,
      setCurrentPage: vi.fn(),
      priceProjection: null,
      isLoading: false,
      error: null
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('CSV Export Integration', () => {
    it('should generate and download CSV file with correct data', async () => {
      render(<ResultsExport />)
      
      const csvButton = screen.getByRole('button', { name: /export csv/i })
      fireEvent.click(csvButton)
      
      // Wait for the export to complete
      await waitFor(() => {
        expect(screen.getByText(/successfully exported results as CSV/i)).toBeInTheDocument()
      })
      
      // Verify file download was triggered
      expect(mockCreateObjectURL).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()
      expect(mockAppendChild).toHaveBeenCalled()
      expect(mockRemoveChild).toHaveBeenCalled()
      
      // Verify the blob was created with CSV content
      const blobCall = mockCreateObjectURL.mock.calls[0][0]
      expect(blobCall).toBeInstanceOf(Blob)
      expect(blobCall.type).toBe('text/csv')
    })

    it('should include proper CSV headers and data', async () => {
      render(<ResultsExport />)
      
      const csvButton = screen.getByRole('button', { name: /export csv/i })
      fireEvent.click(csvButton)
      
      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalled()
      })
      
      // Get the blob content
      const blobCall = mockCreateObjectURL.mock.calls[0][0]
      const text = await blobCall.text()
      
      // Verify CSV structure
      expect(text).toContain('Month,Date,BTC Price,Total BTC,Collateral Value')
      expect(text).toContain('1,2024-01-01,100000,1,100000')
      expect(text).toContain('2,2024-02-01,110000,1,110000')
    })
  })

  describe('JSON Export Integration', () => {
    it('should generate and download JSON file with correct structure', async () => {
      render(<ResultsExport />)
      
      const jsonButton = screen.getByRole('button', { name: /export json/i })
      fireEvent.click(jsonButton)
      
      await waitFor(() => {
        expect(screen.getByText(/successfully exported results as JSON/i)).toBeInTheDocument()
      })
      
      // Verify file download was triggered
      expect(mockCreateObjectURL).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()
      
      // Verify the blob was created with JSON content
      const blobCall = mockCreateObjectURL.mock.calls[0][0]
      expect(blobCall).toBeInstanceOf(Blob)
      expect(blobCall.type).toBe('application/json')
    })

    it('should include complete data structure in JSON', async () => {
      render(<ResultsExport />)
      
      const jsonButton = screen.getByRole('button', { name: /export json/i })
      fireEvent.click(jsonButton)
      
      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalled()
      })
      
      // Get the blob content
      const blobCall = mockCreateObjectURL.mock.calls[0][0]
      const text = await blobCall.text()
      const data = JSON.parse(text)
      
      // Verify JSON structure
      expect(data).toHaveProperty('metadata')
      expect(data).toHaveProperty('summary')
      expect(data).toHaveProperty('monthlyResults')
      expect(data.metadata).toHaveProperty('exportDate')
      expect(data.metadata).toHaveProperty('simulationParams')
      expect(data.monthlyResults).toHaveLength(2)
      expect(data.monthlyResults[0]).toHaveProperty('month', 1)
      expect(data.monthlyResults[1]).toHaveProperty('month', 2)
    })
  })

  describe('TXT Export Integration', () => {
    it('should generate and download TXT file with readable format', async () => {
      render(<ResultsExport />)
      
      const txtButton = screen.getByRole('button', { name: /export txt/i })
      fireEvent.click(txtButton)
      
      await waitFor(() => {
        expect(screen.getByText(/successfully exported results as TXT/i)).toBeInTheDocument()
      })
      
      // Verify file download was triggered
      expect(mockCreateObjectURL).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()
      
      // Verify the blob was created with text content
      const blobCall = mockCreateObjectURL.mock.calls[0][0]
      expect(blobCall).toBeInstanceOf(Blob)
      expect(blobCall.type).toBe('text/plain')
    })

    it('should include human-readable summary in TXT format', async () => {
      render(<ResultsExport />)
      
      const txtButton = screen.getByRole('button', { name: /export txt/i })
      fireEvent.click(txtButton)
      
      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalled()
      })
      
      // Get the blob content
      const blobCall = mockCreateObjectURL.mock.calls[0][0]
      const text = await blobCall.text()
      
      // Verify TXT structure
      expect(text).toContain('BITCOIN SIMULATION RESULTS')
      expect(text).toContain('Export Date:')
      expect(text).toContain('SIMULATION PARAMETERS')
      expect(text).toContain('PERFORMANCE SUMMARY')
      expect(text).toContain('MONTHLY RESULTS')
    })
  })

  describe('Error Handling', () => {
    it('should handle export errors gracefully', async () => {
      // Mock createObjectURL to throw an error
      mockCreateObjectURL.mockImplementation(() => {
        throw new Error('Export failed')
      })
      
      render(<ResultsExport />)
      
      const csvButton = screen.getByRole('button', { name: /export csv/i })
      fireEvent.click(csvButton)
      
      await waitFor(() => {
        expect(screen.getByText(/export failed due to an error/i)).toBeInTheDocument()
      })
    })
  })
})
