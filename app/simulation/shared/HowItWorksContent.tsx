"use client"

import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info } from "lucide-react"

/**
 * How It Works Content Component
 * 
 * Displays comprehensive documentation about how the Bitcoin simulation tool works,
 * including explanations of the loan mechanics, risk management, and investment strategies.
 */
export function HowItWorksContent() {
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("HowItWorks.title")}</CardTitle>
        <CardDescription>{t("HowItWorks.description")}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4 text-base prose dark:prose-invert max-w-none">
        {/* Section 1: Basic Concept */}
        <h3>{t("HowItWorks.section1Title")}</h3>
        <p>{t("HowItWorks.section1Text1")}</p>
        <p>{t("HowItWorks.section1Text2")}</p>
        
        {/* Section 2: Loan Mechanics */}
        <h3>{t("HowItWorks.section2Title")}</h3>
        <p>{t("HowItWorks.section2Text1")}</p>
        <p>{t("HowItWorks.section2Text2")}</p>
        
        {/* Disclaimer Alert */}
        <Alert variant="default">
          <Info className="h-4 w-4" />
          <AlertDescription>{t("HowItWorks.section2Disclaimer")}</AlertDescription>
        </Alert>
        
        {/* Section 3: Risk Management */}
        <h3>{t("HowItWorks.section3Title")}</h3>
        <p>{t("HowItWorks.section3Text1")}</p>
        <p>{t("HowItWorks.section3Text2")}</p>
        
        {/* Section 4: Investment Strategies */}
        <h3>{t("HowItWorks.section4Title")}</h3>
        <p>{t("HowItWorks.section4Text1")}</p>
      </CardContent>
    </Card>
  )
}
