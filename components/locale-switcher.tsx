"use client"

import { useTranslation } from "react-i18next"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function LocaleSwitcher() {
  const { i18n } = useTranslation()
  const currentLang = i18n.resolvedLanguage ?? i18n.language ?? "en"

  const onSelectChange = (value: string) => {
    if (value !== currentLang) {
      void i18n.changeLanguage(value)
    }
  }

  return (
    <Select value={currentLang} onValueChange={onSelectChange}>
      <SelectTrigger className="w-[120px]">
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="de">Deutsch</SelectItem>
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="es">Español</SelectItem>
      </SelectContent>
    </Select>
  )
}
