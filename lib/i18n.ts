import i18n from "i18next"
import { initReactI18next } from "react-i18next"

// Define fallback translations to prevent import errors
const fallbackTranslations = {
  LocaleSwitcher: {
    placeholder: "Language",
  },
  Page: {
    title: "FIRE hodl Simulator",
    description: "Simulate savings, withdrawals and loans secured by Bitcoin",
  },
  Navigation: {
    title: "Navigation",
    parameters: { label: "Parameters", shortLabel: "Params" },
    priceProjection: { label: "Price Projection", shortLabel: "Price" },
    strategy: { label: "Strategy", shortLabel: "Strategy" },
    results: { label: "Results", shortLabel: "Results" },
    comingSoon: { badge: "Coming Soon" },
    backToLanding: { button: "Back to Landing" }
  },
  Tabs: {
    parameters: "Parameters",
    results: "Results",
    chart: "Chart",
    howItWorks: "How It Works",
  },
  Parameters: {
    runSimulation: "Run Simulation",
    calculating: "Calculating...",
    reset: "Reset All Parameters",
    exportCsv: "Export CSV",
    errorsTitle: "Validation Errors",
  },
  BasicParameters: {
    title: "Basic Parameters",
    initialBtcPrice: {
      label: "Initial BTC Price",
      tooltip: "Starting Bitcoin price in USD for the simulation",
      placeholder: "100,000"
    },
    btcAmount: {
      label: "BTC Amount",
      tooltip: "Amount of Bitcoin to simulate with"
    },
    monthlyAmount: {
      label: "Monthly Savings/Withdrawal",
      tooltip: "Monthly amount to save or withdraw"
    }
  },
  LoanParameters: {
    title: "Loan Parameters",
    platform: { label: "Platform" },
    interestRate: { label: "Interest Rate" },
    loanTerm: { label: "Loan Term" },
    maxLoanAmount: { label: "Max Loan Amount" },
    initialLtv: { label: "Initial LTV" },
    liquidationFee: { label: "Liquidation Fee" },
    percentOfBtcStack: "% of BTC stack",
    infinity: "Infinity",
    loanBreakdown: "Loan Breakdown",
    totalInterest: "Total Interest",
    originationFee: "Origination Fee",
    totalRepayment: "Total Repayment",
    loanAmountBreakdown: "Loan Amount",
    percentOf: "% of",
    forMonths: "for {{count}} months",
    ofLoan: "{{percent}}% of {{amount}} loan",
    loanPlusCosts: "Loan + {{costs}} costs",
    tooltips: {
      loanAmountPercentage: "Percentage of your total BTC stack value to use as loan amount",
      loanAmountDirect: "Direct USD amount to borrow",
      initialLtv: "Loan-to-Value ratio - percentage of collateral value that can be borrowed",
      initialLtvMax: "Maximum allowed by {{platform}} platform: {{maxLtv}}%",
      interestRate: "Yearly interest rate charged on the loan amount, compounded over the loan term",
      loanTerm: "Duration of the loan repayment period. Choose 'Infinity' for interest-only loans with no fixed repayment schedule",
      loanAmountBreakdown: "Initial loan principal amount",
      totalInterest: "Total interest paid over the loan term",
      totalInterestFormula: "Formula: Loan Amount × Annual Rate × Term (months) ÷ 12",
      originationFee: "One-time fee charged when the loan is originated",
      originationFeeFormula: "Formula: Loan Amount × Platform Origination Fee %",
      totalRepayment: "Total amount you'll pay back over the loan term",
      totalRepaymentFormula: "Formula: Loan Principal + Origination Fee + Total Interest"
    }
  },
  Results: {
    title: "Results",
    loading: "Loading simulation results...",
    description: "View your simulation results and analysis.",
    running: "Running...",
    runSimulation: "Run Simulation",
    noResultsTitle: "No Results Available",
    waitingForData: "Waiting for price data to load...",
    invalidParams: "Please configure valid parameters first",
    runToSeeResults: "Run a simulation to see your results here",
    configureAndRun: "Configure your parameters and run a simulation to see detailed results, charts, and analysis.",
    runningSimulation: "Running Simulation...",
    portfolioPerformance: "Portfolio Performance",
    financialAnalysis: "Financial Analysis",
    riskAssessment: "Risk Assessment",
    simulationSummary: "Simulation results for {{months}} months with {{btc}} BTC",
    rerunning: "Re-running...",
    rerunSimulation: "Re-run Simulation",
    advancedFeaturesTitle: "🚧 Advanced Features Coming Soon",
    advancedFeaturesDescription: "Phase 5 features will be added next",
    scenarioComparison: "Scenario Comparison",
    scenarioComparisonDescription: "Compare different parameter sets side-by-side",
    stressTesting: "Stress Testing",
    stressTestingDescription: "Advanced stress testing and sensitivity analysis",
    summaryTitle: "Summary",
    firstLiquidation: "First Liquidation",
    none: "None",
    month: "Month",
    maxDebt: "Maximum Debt",
    finalCollateral: "Final Collateral Value",
    finalNetWorth: "Final Net Worth",
    finalBtcAmount: "Final BTC Holdings",
    monthlyResults: "Monthly Results",
    monthlyResultsDescription: "Detailed breakdown of the simulation",
    tableMonth: "Month",
    tableDate: "Date",
    tableBtcPrice: "BTC Price ($)",
    tableCollateral: "Collateral ($)",
    tableTotalDebt: "Total Debt ($)",
    tableLockedCollateral: "Locked Collateral ($)",
    tableHighestLtv: "Highest LTV (%)",
    tableBtcAmount: "BTC Amount",
    tableLiquidatedBtc: "Liquidated (BTC)",
    tableMaxSafeDebt: "Max Safe Debt ($)",
    tableLoanCount: "Loan Count",
    tableEvents: "Events",
    tableNewLoans: "New Loans ($)",
    tableRepayments: "Repayments ($)",
    tableWithdrawal: "Withdrawal ($)",
    tableReinvestment: "Reinvestment ($)",
    tableBtcTotal: "BTC Holdings",
    paginationShowing: "Showing {{start}} to {{end}} of {{total}} months",
    paginationPrevious: "Previous",
    paginationNext: "Next",
    liquidationWarningTitle: "Warning: Liquidation!",
    liquidationWarningText: "In month {{month}} a liquidation occurred. Your risk profile was too aggressive for this scenario. Review your risk parameters.",
    eventWithdrawalSkipped: "Withdrawal suspended",
    eventDeleveraged: "FORCED SALE: {{amount}} BTC",
    eventLiquidated: "LIQUIDATION: Loan #{{id}}",
    eventCollateralToppedUp: "TOPPED UP: {{amount}} BTC for loan #{{id}}"
  },
  CollateralVisualization: {
    freeCollateral: "Free Collateral",
    lockedCollateral: "Locked Collateral",
    title: "Collateral Consumption",
    tooltip: {
      title: "Understanding Collateral Usage",
      description: "This pie chart shows how your Bitcoin collateral is divided between available and locked amounts.",
      interpretation: "Green area: Free collateral that can be used for additional loans. Red area: Locked collateral required to secure your current loan.",
      implications: "A larger green area means more flexibility for additional borrowing. A larger red area indicates higher loan utilization and less available collateral."
    }
  },
  PriceDropTolerance: {
    title: "Price Drop Tolerance",
    noLoanAmount: "No loan amount specified",
    priceDropTolerance: "Price Drop Tolerance",
    liquidationPrice: "Liquidation Price",
    fromCurrentPrice: "From Current Price",
    fromATH: "From ATH",
    immediate: "Immediate",
    trueTopUp: "True (Top-up)",
    tooltip: {
      title: "Understanding Price Drop Tolerance",
      description: "These gauge charts show different liquidation risk scenarios based on Bitcoin price movements.",
      scenarios: {
        immediate: "Immediate: Shows liquidation risk without the ability to add more collateral. Critical during rapid price drops.",
        trueTopUp: "True (Top-up): Accounts for your ability to add additional collateral to avoid liquidation."
      },
      interpretation: "Red areas indicate high liquidation risks. Green areas show safe price levels. Percentages indicate how far Bitcoin price can drop before liquidation occurs.",
      implications: "Use this information to adjust your loan strategy. Lower LTV ratios provide more protection against price drops."
    }
  },
  ValidationSummary: {
    title: "Parameter Validation",
    showDetails: "Show Details"
  },
  PortfolioValueChart: {
    title: "Portfolio Value Over Time",
    description: "Track your portfolio value, net worth, and debt levels throughout the simulation",
    portfolioValue: "Portfolio Value",
    totalDebt: "Total Debt",
    netWorth: "Net Worth"
  },
  RiskLevelSelector: {
    title: "Risk Level Presets",
    riskWarning: "Lending against Bitcoin is highly speculative and carries significant risk. This is not financial advice. Use at your own risk. Bitcoin prices has dropped by 90% in the past. It can happen again. Don't get greedy. Don't use money you can't afford to lose.",
    conservative: {
      name: "Conservative",
      description: "Low-risk approach with safety-first mindset",
      badge: "Safe"
    },
    moderate: {
      name: "Moderate",
      description: "Balanced approach for typical investors",
      badge: "Balanced"
    },
    optimistic: {
      name: "Optimistic",
      description: "Growth-focused with higher risk tolerance",
      badge: "Growth"
    },
    moonshots: {
      name: "Moonshots",
      description: "Maximum risk for maximum potential returns",
      badge: "High Risk"
    }
  },
  PlatformSelector: {
    title: "Lending Platform",
    visitPlatform: "Visit Platform",
    firefish: {
      name: "Firefish",
      description: "Flexible lending platform with competitive rates",
      badge: "Non Custodial"
    },
    strike: {
      name: "Strike",
      description: "Lightning-fast loans with instant approval",
      badge: "Low Rates"
    },
    custom: {
      name: "Custom",
      description: "Configure your own platform parameters",
      badge: "Custom"
    }
  },
  LoanUsageVisualization: {
    used: "Used",
    available: "Available",
    loanAvailable: "Loan Available",
    loanTaken: "Loan Taken",
    title: "Loan Utilization",
    tooltip: {
      title: "Understanding Loan Utilization",
      description: "This donut chart shows your current loan usage relative to your maximum loan capacity based on the selected platform.",
      interpretation: "Blue area: Already borrowed loan amount. Gray area: Still available loan capacity within your LTV limits.",
      implications: "Higher utilization (more blue) means less room for additional loans. Lower utilization provides more flexibility but may represent unused borrowing opportunities."
    }
  },
  PriceModelSelector: {
    title: "Select Model and Simulation Length",
    description: "Select and configure Bitcoin price projection models and simulation timeline",
    priceProjectionModel: "Price Projection Model",
    choosePriceModel: "Choose price prediction model",
    loadingModels: "Loading models...",
    errorLoadingModels: "Error loading models",
    noModelsAvailable: "No models available",
    customModel: "Custom Model",
    customModelDescription: "Create your own price projection model",
    comingSoon: "Coming Soon"
  },
  ManualGrowthInterface: {
    title: "Manual Growth Rate Model",
    description: "Customize Bitcoin price projections with user-defined annual growth rates",
    quickPresets: "Quick Presets",
    presets: {
      conservative: {
        name: "Conservative",
        description: "Conservative growth with low volatility"
      },
      moderate: {
        name: "Moderate",
        description: "Moderate but diminishing cycle growth with decreasing volatility"
      },
      optimistic: {
        name: "Optimistic",
        description: "High growth potential with significant volatility"
      },
      moonshot: {
        name: "Moonshot",
        description: "Extreme bull case scenario"
      },
      custom: {
        name: "Custom",
        description: "Customize individual growth rates"
      }
    }
  },
  BasicParams: {
    title: "Basic Parameters",
    description: "Bitcoin and loan basic settings",
    btcAmount: "BTC Amount",
    btcAmountTooltip: "The initial amount of Bitcoin to be used as collateral for the loans.",
    initialBtcPrice: "Initial BTC Price (€)",
    initialBtcPriceTooltip: "The starting price of Bitcoin in Euro for the simulation. Can be automatically fetched.",
    loanTerm: "Loan Term (Months)",
    loanTermTooltip: "The term of each individual bullet loan in months.",
    simulationDuration: "Simulation Duration (Months)",
    simulationDurationTooltip: "The total duration of the simulation in months.",
    interestRate: "Interest Rate p.a. (%)",
    interestRateTooltip: "The annual interest rate for the bullet loans taken.",
    originationFee: "Loan Fee (%)",
    originationFeeTooltip: "The percentage fee charged for each loan origination.",
    maxLoanAmount: "Max. Loan Amount ($)",
    maxLoanAmountTooltip:
      "The maximum amount of a single loan. If higher amounts are needed, multiple loans will be taken.",
  },
  Strategy: {
    title: "Strategy: Savings/Withdrawal",
    description: "Define your monthly savings or withdrawal goals.",
    monthlyWithdrawal: "Monthly Savings/Withdrawal Amount ($)",
    monthlyWithdrawalTooltip: "Positive values: Monthly savings added to BTC stack. Negative values: Monthly withdrawals from BTC stack for living expenses.",
  },
  RiskManagement: {
    title: "Risk Management & Leverage",
    description: "Define your personal risk tolerance through the target debt ratio.",
    targetLtv: "Target Debt Ratio (LTV) (%)",
    targetLtvTooltip:
      "This is your primary risk control. The simulation will keep total debt below this percentage of current total collateral value. Any excess loan capacity will be used for leveraged reinvestments.",
    liquidationLtv: "Platform Liquidation Limit (%)",
    liquidationLtvTooltip:
      "The platform's 'red line'. When the LTV of a SINGLE loan reaches this value, its collateral is considered liquidated.",
    liquidationFee: "Liquidation Fee (%)",
    liquidationFeeTooltip: "The fee the platform retains from the sold collateral in case of liquidation.",
  },
  EconomicAssumptions: {
    title: "Price Model",
    description: "Define your expectations for price development.",
    inflation: "Expected Annual Inflation (%)",
    inflationTooltip:
      "The expected annual inflation rate. This value is used to calculate the real (inflation-adjusted) value of assets and debts.",
  },
  PriceModel: {
    title: "Price Model",
    description: "Choose the model for Bitcoin price forecasting over time.",
    selectModel: "Select Model",
    manualGrowth: "Manual Growth Rates",
    powerLaw: "Power Law Model",
    cycleRepeat: "Cycle Repeat (Historical)",
    cycleRepeatPowerLaw: "Cycle Repeat (Power Law)",
    prognosisLine: "Select Price Projection Line",
    prognosisLineTooltip: "The BTC price in the simulation will follow this line.",
    fit: "Fit (Green)",
    support: "Support (Red)",
    resistance: "Resistance (Purple)",
    manualSettingsTitle: "Manual Model Settings",
    manualSettingsDescription: "Define the annual growth rates of the BTC price.",
    year: "Year",
  },
  InvestmentStrategy: {
    title: "Investment Strategy",
    description: "Choose how investment decisions are made based on market conditions.",
    selectStrategy: "Select Strategy",
    defaultStrategy: "Default Strategy",
    athBasedStrategy: "ATH-Based Strategy",
    movingAverageStrategy: "Moving Average Strategy",
    athSettingsTitle: "ATH-Based Strategy Settings",
    athSettingsDescription: "Configure the All-Time High based investment limits.",
    athThreshold: "ATH Threshold (%)",
    athThresholdTooltip: "Investment is blocked when BTC price exceeds this percentage of the All-Time High.",
    movingAverageSettingsTitle: "Moving Average Strategy Settings",
    movingAverageSettingsDescription: "Configure the moving average based investment adjustments.",
    movingAveragePeriod: "Moving Average Period (Weeks)",
    movingAveragePeriodTooltip: "The period in weeks for calculating the moving average (default: 200 weeks).",
    investmentMultiplier: "Investment Multiplier",
    investmentMultiplierTooltip: "Base multiplier for investment capacity when above moving average.",
    settingsTitle: "Settings",
    explanationTitle: "Strategy Explanation",
    functionality: "How It Works",
    suitability: "Suitability",
    criteria: "Decision Criteria",
    securityRating: "Security Rating",
    complexityRating: "Complexity Rating",
    securityTooltip: "1 = Very risky, 5 = Very safe",
    complexityTooltip: "1 = Very simple, 5 = Very complex",
    ratingOutOf5: "out of 5",
  },
  Chart: {
    debtVsCollateralTitle: "Portfolio Overview: Assets, Debt & Price",
    debtVsCollateralDescription: "Detailed view of assets, debt and price development.",
    legendLockedCollateral: "Locked Collateral Value",
    legendBtcPrice: "BTC Price",
    btcPriceTitle: "Bitcoin Price Development",
    btcPriceDescription: "BTC price over the simulation duration",
    amountInEur: "Amount (€)",
    btcPriceInEur: "BTC Price (€)",
    date: "Date",
    legendCollateral: "Collateral Value (Total)",
    legendTotalDebt: "Total Debt",
    legendRealCollateral: "Real Assets",
    legendRealDebt: "Real Debt",
  },
  PriceModelChart: {
    loading: "Loading chart data...",
    noData: "No data available to display. Please run a simulation.",
    title: "Bitcoin Price Forecast",
    description: "Historical and projected Bitcoin price based on the selected model.",
    projectedPrice: "Projected Price",
    historicalPrice: "Historical Price",
    resistance: "Resistance",
    fit: "Fit (Forecast)",
    support: "Support (Safety)",
  },
  HowItWorks: {
    title: "Understanding the 'Buy, Borrow, Die' Strategy",
    description:
      "Learn the philosophy, opportunities and risks behind the strategy of living off your Bitcoin wealth without ever selling it.",
    section1Title: "1. The Core Philosophy: Borrow Instead of Sell",
    section1Text1:
      "The basic idea is simple: Instead of selling parts of your Bitcoin to obtain liquidity, you use your Bitcoin holdings as collateral to take out a loan. You receive dollars to cover your living expenses while your Bitcoin wealth remains untouched and continues to participate in potential value growth.",
    section1Text2: "Why is this potentially more advantageous than selling? The answer often lies in tax law.",
    section2Title: "2. The Tax Advantage: A Decisive Factor",
    section2Text1:
      "In many countries (including Germany, Austria and Switzerland), taking out a loan is not a taxable event. You don't realize capital gains and therefore pay no taxes on the liquidity received. A sale, on the other hand, usually triggers a tax liability on the profit made.",
    section2Text2:
      "In the long term, the concept of 'step-up in basis' comes into play. When you die, your wealth is transferred to your heirs. They often inherit the assets at market value on the date of death. If they then sell a small portion to pay off the loans, the tax burden is minimal or zero, as hardly any taxable gain has arisen between inheritance and sale. The entire appreciation during your lifetime thus often remains tax-free.",
    section2Disclaimer:
      "Note: This is not tax advice. Laws are complex and can change. Always consult a qualified tax advisor.",
    section3Title: "3. Risk Management: Controlling Volatility",
    section3Text1:
      "The biggest danger of this strategy is Bitcoin's high volatility. If the price of your collateral falls sharply, your loan-to-value (LTV) can reach a critical threshold, leading to a 'margin call' or forced liquidation. Then your Bitcoin is sold at the most unfavorable time to cover the loan.",
    section3Text2:
      "This is exactly where this simulator comes in. The most important parameter is the 'Target Debt Ratio (LTV)'. If you enter 50% here, for example, the simulation will always keep total debt below 50% of the current collateral value. If the price falls, reinvestments are automatically stopped and if necessary BTC is sold to stay below the limit. This is your main tool for controlling risk.",
    section4Title: "4. Inflation: The Silent Friend of the Debtor",
    section4Text1:
      "While interest causes costs, inflation works for you. A loan of €100,000 has only a purchasing power of about €82,000 after 10 years with 2% annual inflation. Your debts become worth less in real terms. Our simulator allows you to set an expected inflation to visualize the real value of your debts and your wealth over time. Ideally, the appreciation of your Bitcoin far exceeds the sum of interest and inflation.",
  },
  ATHAlert: {
    lowerRisk: "Lower Risk",
    mediumRisk: "Medium Risk",
    higherRisk: "Higher Risk",
    loadingTitle: "Loading ATH data...",
    loadingDescription: "Fetching current All-Time High information",
    currentPriceIs: "Current price is",
    belowAthOf: "below ATH of",
    atNewAth: "at new ATH of",
    riskDescriptions: {
      low: "Favorable conditions for larger loan amounts and higher LTV percentages",
      medium: "Moderate loan amounts and LTV percentages recommended",
      high: "Smaller loan amounts and lower LTV percentages recommended"
    },
    fallbackDataNotice: "Using fallback ATH data."
  },
  Errors: {
    failedToLoadHistoricalData:
      "Historical data for the price model could not be loaded. Please try again or select a different model.",
    historicalDataNotReady:
      "Historical data for the cycle repeat model is not yet ready. Please wait a moment and try again.",
  },
}

// Try to import translations, fall back to inline definitions if files don't exist
let enTranslation = fallbackTranslations
let deTranslation = fallbackTranslations
let esTranslation = fallbackTranslations

try {
  // These imports will be handled at build time
  enTranslation = require("../public/locales/en/translation.json")
} catch (e) {
  console.warn("English translation file not found, using fallback")
}

try {
  deTranslation = require("../public/locales/de/translation.json")
} catch (e) {
  console.warn("German translation file not found, using fallback")
}

try {
  esTranslation = require("../public/locales/es/translation.json")
} catch (e) {
  console.warn("Spanish translation file not found, using fallback")
}

const resources = {
  en: {
    translation: enTranslation,
  },
  de: {
    translation: deTranslation,
  },
  "de-DE": {
    translation: deTranslation,
  },
  es: {
    translation: esTranslation,
  },
}

// Get saved language preference from localStorage (client-side only)
const getSavedLanguage = (): string => {
  if (typeof window === 'undefined') return 'en' // Server-side default

  try {
    const savedLang = localStorage.getItem('preferred-language')
    if (savedLang && ['en', 'de', 'es'].includes(savedLang)) {
      return savedLang
    }
  } catch (error) {
    console.warn('Failed to read language preference from localStorage:', error)
  }

  return 'en' // Default fallback
}

i18n.use(initReactI18next).init({
  resources,
  lng: getSavedLanguage(), // Use saved language preference or default to English
  fallbackLng: "en",
  debug: false,
  interpolation: {
    escapeValue: false, // not needed for react as it escapes by default
  },
  // Remove backend since we're loading translations directly
  // This prevents hydration mismatches
  react: {
    useSuspense: false, // Disable suspense to prevent hydration issues
  },
  // Enable language detection for client-side hydration
  detection: {
    order: ['localStorage'], // Check localStorage for saved language
    lookupLocalStorage: 'preferred-language',
    caches: ['localStorage'],
  },
})

export default i18n
