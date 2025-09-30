import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ResultsExport } from '../ResultsExport'
import { useSimulation } from '../../../context/SimulationContext'
import { useResultsExport } from '../../../hooks/useResultsExport'

// Mock the hooks
vi.mock('../../../context/SimulationContext')
vi.mock('../../../hooks/useResultsExport')

// Mock data
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

describe('ResultsExport', () => {
  const mockExportResults = vi.fn()
  const mockCanExport = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock useSimulation
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

    // Mock useResultsExport
    vi.mocked(useResultsExport).mockReturnValue({
      exportResults: mockExportResults,
      canExport: mockCanExport,
      prepareExportData: vi.fn(),
      exportToCSV: vi.fn(),
      exportToJSON: vi.fn(),
      exportToText: vi.fn()
    })
  })

  describe('Basic Rendering', () => {
    it('should render export options when data is available', () => {
      mockCanExport.mockReturnValue(true)
      
      render(<ResultsExport />)
      
      expect(screen.getByText('Export Results')).toBeInTheDocument()
      expect(screen.getByText('CSV Spreadsheet')).toBeInTheDocument()
      expect(screen.getByText('JSON Data')).toBeInTheDocument()
      expect(screen.getByText('Text Report')).toBeInTheDocument()
    })

    it('should show empty state when no data is available', () => {
      mockCanExport.mockReturnValue(false)

      render(<ResultsExport />)

      expect(screen.getByText('Run a simulation to enable export options')).toBeInTheDocument()
    })

    it('should display recommended badge for CSV format', () => {
      mockCanExport.mockReturnValue(true)
      
      render(<ResultsExport />)
      
      expect(screen.getByText('Recommended')).toBeInTheDocument()
    })
  })

  describe('Export Functionality', () => {
    beforeEach(() => {
      mockCanExport.mockReturnValue(true)
    })

    it('should call exportResults when CSV export is clicked', async () => {
      mockExportResults.mockReturnValue(true)

      render(<ResultsExport />)

      const csvButton = screen.getByRole('button', { name: /export csv/i })
      fireEvent.click(csvButton)

      expect(mockExportResults).toHaveBeenCalledWith('csv')
    })

    it('should call exportResults when JSON export is clicked', async () => {
      mockExportResults.mockReturnValue(true)

      render(<ResultsExport />)

      const jsonButton = screen.getByRole('button', { name: /export json/i })
      fireEvent.click(jsonButton)

      expect(mockExportResults).toHaveBeenCalledWith('json')
    })

    it('should call exportResults when TXT export is clicked', async () => {
      mockExportResults.mockReturnValue(true)

      render(<ResultsExport />)

      const txtButton = screen.getByRole('button', { name: /export txt/i })
      fireEvent.click(txtButton)

      expect(mockExportResults).toHaveBeenCalledWith('txt')
    })

    it('should show success message after successful export', async () => {
      mockExportResults.mockReturnValue(true)

      render(<ResultsExport />)

      const csvButton = screen.getByRole('button', { name: /export csv/i })
      fireEvent.click(csvButton)

      await waitFor(() => {
        expect(screen.getByText(/successfully exported results as CSV/i)).toBeInTheDocument()
      })
    })

    it('should show error message when export fails', async () => {
      mockExportResults.mockReturnValue(false)

      render(<ResultsExport />)

      const csvButton = screen.getByRole('button', { name: /export csv/i })
      fireEvent.click(csvButton)

      await waitFor(() => {
        expect(screen.getByText(/export failed/i)).toBeInTheDocument()
      })
    })
  })

  describe('Print Functionality', () => {
    it('should call window.print when print button is clicked', () => {
      mockCanExport.mockReturnValue(true)
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})

      render(<ResultsExport />)

      const printButton = screen.getByRole('button', { name: /print/i })
      fireEvent.click(printButton)

      expect(printSpy).toHaveBeenCalled()

      printSpy.mockRestore()
    })
  })

  describe('Tooltips and Accessibility', () => {
    beforeEach(() => {
      mockCanExport.mockReturnValue(true)
    })

    it('should have proper ARIA labels for export buttons', () => {
      render(<ResultsExport />)

      expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /export json/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /export txt/i })).toBeInTheDocument()
    })

    it('should show format descriptions', () => {
      render(<ResultsExport />)
      
      expect(screen.getByText('Excel-compatible format with monthly data and summary')).toBeInTheDocument()
      expect(screen.getByText('Structured data format for developers and analysis tools')).toBeInTheDocument()
      expect(screen.getByText('Human-readable summary report with key metrics')).toBeInTheDocument()
    })
  })
})
