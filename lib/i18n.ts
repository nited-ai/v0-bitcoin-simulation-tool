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
  Results: {
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
    tableBtcPrice: "BTC Price (€)",
    tableCollateral: "Collateral (€)",
    tableTotalDebt: "Total Debt (€)",
    tableLockedCollateral: "Locked Collateral (€)",
    tableHighestLtv: "Highest LTV (%)",
    tableBtcAmount: "BTC Amount",
    tableLiquidatedBtc: "Liquidated (BTC)",
    tableLoanCount: "Loan Count",
    tableEvents: "Events",
    tableNewLoans: "New Loans (€)",
    tableRepayments: "Repayments (€)",
    tableWithdrawal: "Withdrawal ($)",
    tableReinvestment: "Reinvestment ($)",
    tableBtcTotal: "BTC Holdings",
    paginationShowing: "Showing {{start}} to {{end}} of {{total}} months",
    paginationPrevious: "Previous",
    paginationNext: "Next",
    liquidationWarningTitle: "Warning: Liquidation!",
    liquidationWarningText:
      "In month {{month}} a liquidation occurred. Your risk profile was too aggressive for this scenario. Review your risk parameters.",
    eventWithdrawalSkipped: "Withdrawal suspended",
    eventDeleveraged: "FORCED SALE: {{amount}} BTC",
    eventLiquidated: "LIQUIDATION: Loan #{{id}}",
    eventCollateralToppedUp: "TOPPED UP: {{amount}} BTC for loan #{{id}}",
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

i18n.use(initReactI18next).init({
  resources,
  lng: "en", // Set default language to prevent hydration issues
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
  // Disable language detection to prevent server/client mismatch
  detection: {
    order: [], // Disable automatic language detection
  },
})

export default i18n
