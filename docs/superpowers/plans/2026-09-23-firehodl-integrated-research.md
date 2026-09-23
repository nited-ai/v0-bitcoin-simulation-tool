# Gemeinsamer Tagesrechner in der ursprünglichen Oberfläche

Die bestätigte Produktentscheidung bleibt: Parameter → Projektion → Strategie → Ergebnisse → Vergleich. Bestehende Gestaltung, Plattform-Presets und editierbare Kursmodelle bleiben erhalten.

1. Eine gemeinsame Projektion liefert vollständige Tageskurse. Historische Zyklus-OHLC bleiben erhalten; Monatsmodelle werden geometrisch interpoliert und ausdrücklich als glatte Annahmen bezeichnet. Ein optionaler eintägiger Flashcrash prüft Liquidationen bei unverändertem Schlusskurs.
2. Ein persistierter Strategieplan ergänzt Start-Cash, getrennte Einzahlungen/Entnahmen, Gebühren, ATH-/MA-Regeln, Staffelkäufe, Rebalancing und Nachbesicherung.
3. Der Tagesrechner trennt freie und verpfändete BTC, prüft Tagestiefs, führt Restschuld weiter und verhindert Kaufentscheidungen mit Zukunftswissen.
4. Ergebnisse, Vergleich und CSV lesen denselben Rechenlauf. Keine aktive alte monatliche Ergebnisrechnung. Alle Vergleichsstrategien haben denselben Kurs und dasselbe externe Budget.
5. Prüfen: Kalendergrenzen, OHLC-Übernahme, Stress am Tagestief, ATH- und MA-Kausalität, Gebühr/Schuld/Sicherheit, faire Budgets; anschließend Typprüfung, gezielte Release-Tests, Build und Browserabläufe.

Nicht als Ergebnis behaupten: belastbare Eintrittswahrscheinlichkeiten, garantierte Zyklen oder aktuelle Kreditangebote. Die Simulation ist vor Steuern; sofortige Nachbesicherung ist eine explizite Modellannahme.
