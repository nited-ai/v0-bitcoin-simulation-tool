# FireHODL – integrierte Simulation in der ursprünglichen Oberfläche

Die ursprünglichen Tabs und die Gestaltung bleiben aktiv. Der öffentliche Ablauf verwendet nun einen gemeinsamen Tagesrechner statt der alten monatlichen Ergebnis- und Lab-Berechnungen.

## Umgesetzt

- Projektion: historische Zyklus-Tagesbewegungen einschließlich OHLC; glatte Tagesinterpolation der eigenen Jahresannahmen und des Power-Law-Modells. Ein optionaler Flashcrash verändert das Tagestief bei unverändertem Schlusskurs. Chart und Ergebnis verwenden denselben Pfad.
- Strategien: HODL/Sparplan, gestaffelter Einstieg, Cashreserve, BTC/Cash-Rebalancing, ATH- und MA-Regelkäufe, BTC-Kauf auf Kredit sowie kreditfinanzierte Entnahmen. Separate Sparraten, Entnahmen, Start-Cash, Gebühren und jährliche Anpassungen.
- Kredit: Gebühren in der Anfangsschuld, tatsächlich verpfändete und freie BTC getrennt, Tageszinsen, tägliche Liquidationsprüfung, optionale sofortige Nachbesicherung, begrenzte Refinanzierung, Restschuld bleibt bestehen. Neue Kredite stoppen nach Liquidation.
- Ergebnis: Vermögen, Gewinn, BTC, Cash, Schulden, tatsächliche Entnahmen und Lücken, Gebühren/Zinsen, erste Liquidation, Tagestief/LTV/Schwellen, tägliches Journal und vollständiger CSV-Export.
- Vergleich: alle Strategien auf identischen Kursen, mit denselben Anfangswerten und externen Zahlungszielen. Keine allgemeine Gewinnerbehauptung.
- Szenarien speichern/laden: Kursmodell, Kreditannahmen, Strategie und Budget lokal im Browser. Die gespeicherten Annahmen werden beim Laden ab dem heutigen Datum neu berechnet.

## Überprüfte Grenzfälle

- Monatsstichtage einschließlich 31. Januar / Februar, keine zusätzliche Anfangssparrate.
- Übernahme von Zyklus-OHLC, Ablehnung lückenhafter/ungültiger Projektionspfade.
- Flashcrash löst Liquidation aus, obwohl alle Schlusskurse unverändert bleiben.
- ATH/MA verwenden vergangene Daten; Käufe zur Eröffnung können noch nicht über die Sparrate zum selben Tagesschluss verfügen.
- Große Kreditwünsche werden durch Sicherheiten und schuldinklusive Gebührenlimits begrenzt.
- Rendite und Rendite-Drawdown sind ohne positives Anfangsvermögen bzw. nach nichtpositivem Eigenkapital ausdrücklich nicht definiert. Vermögen, Gewinn und Restschuld bleiben numerisch sichtbar.
- Gespeicherte Szenarien entfernen auch nachträglich hinzugefügte optionale Strategie-/Stresswerte. Dieser Fehler wurde im Browser gefunden und als Regressionstest festgehalten.

## Browserprüfung

ATH-Regel 50 %, 5.000 USD Start-Cash und 500 USD Sparrate: tatsächliche Käufe ab 30.09.2026 im Journal sichtbar. Historische Vorlage 2020–2024, Startphase zwölf Monate.

Kredit ohne Nachbesicherung, Flashcrash 90 % im ersten Monat: Liquidation am 23.10.2026 bei 5.243,41 USD Tagestief und 51.435,07 USD Schlusskurs. Tagesjournal weist 0,83175507 freie BTC und 9.798,67 USD verbleibende Schuld aus. Das ist ein Test der gewählten Annahmen, keine Marktprognose.

## Verbleibende Modell- und Releasegrenzen

Keine Steuern, Slippage, Anbieterinsolvenz, variable Zinsen oder reale Nachbesicherungsverzögerung. Keine kalibrierte Wahrscheinlichkeit. Ein wiederholter historischer Zyklus kann über lange Zeiträume extreme Endkurse erzeugen; Dämpfung und Einstieg sind frei wählbare Annahmen. Glatte Monatsmodelle enthalten keine zusätzlichen realen Tagescrashs.

Plattform-Presets bleiben editierbare Modelle, keine Bestätigung heutiger Vertragsbedingungen. Neue Analyseansichten sind deutsch; ältere Komponenten behalten ihre vorhandene Sprachumschaltung. Die lokale Vorschau verwendet ausdrücklich gekennzeichnete historische Sicherungsdaten bis 08.05.2026. Live-Datenbank, Aktualisierungsjob und tatsächliche Hosting-/Datenschutzkonfiguration müssen vor Veröffentlichung geprüft werden. Kein Deployment durchgeführt.

Die gezielte Release-Testgruppe ist von historischen Alttests getrennt; ein grüner Release-Lauf bedeutet nicht, dass das gesamte frühere Repository fehlerfrei ist.

## Abschlussprüfung

290 Tests in 29 Dateien der Releasegruppe bestanden. TypeScript und Produktionsbuild erfolgreich. Finales Rückladen im Browser bestätigt: Start-Cash 0, Sparrate 150, Nachbesicherung aktiv, zusätzlicher Testcrash entfernt. Datumsfeld nach Korrektur direkt editierbar. CSV-Inhalt am Rechenmodell geprüft; die Bestätigung eines nativen Downloads über das In-App-Browser-Testwerkzeug lief in einen Timeout und ist damit nicht als Browserprüfung bestätigt.

