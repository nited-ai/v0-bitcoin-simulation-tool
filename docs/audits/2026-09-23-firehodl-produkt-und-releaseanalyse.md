# FireHODL: Produkt-, Modell- und Veröffentlichungsanalyse

Stand: 23. September 2026. Untersucht: lokaler HEAD `0958081`, öffentlich erreichbare Oberfläche auf firehodl.com, vorhandene Tests, gezielte Rechenproben und aktuelle Primärquellen. Empfehlungen sind ein Diskussionsvorschlag; Produktcode und Deployment wurden nicht geändert.

## Urteil und Zielbild

FireHODL hat eine brauchbare Grundlage für Kredit- und Bitcoin-Szenarien. Für ein öffentliches, belastbares Investment-Vergleichstool ist der aktuelle Entwicklungsstand noch nicht bereit. Entscheidend sind zunächst richtige Vergleichsrechnungen, ein einheitlicher Datenfluss und verständliche Ergebnisse. Weitere Modellregler oder KI verbessern diese Grundlage nicht automatisch.

Das Produkt sollte beantworten: **Welche Vorgehensweise erreicht mein Ziel unter welchen Marktbedingungen, mit welchen Kosten und welchen möglichen Fehlschlägen?** Es sollte keine universell beste Strategie behaupten.

Die Landingpage kann als vorgeschalteter Einstieg entfallen. `/` wird der Simulator; bestehende `/simulation`-Links einschließlich Tab-Parametern bleiben über eine kompatible Weiterleitung nutzbar. Über das Projekt, Methodik, Kontakt und Hinweise bleiben als kleine erreichbare Seiten erhalten.

## Tatsächlicher Stand

- Die Domain funktioniert bereits. Die Live-Oberfläche zeigte bei der Prüfung Parameter und Kursprojektion; Strategie und Ergebnisse waren noch als „Coming Soon“ deaktiviert. Kurs- und ATH-Anzeigen wurden nachgeladen. Der genaue Live-Commit wurde nicht festgestellt.
- Lokal existieren fünf aktive Tabs: Parameter, Kursprojektion, Strategie, Ergebnisse und Strategy Lab.
- Fünf Strategien sind registriert: Default, Rolling Loan, ATH Based, Moving Average, ATH Collateral. Sie sind überwiegend Varianten der Kreditnutzung, kein vollständiger Katalog unabhängiger Bitcoin-Anlagen.
- Drei Projektionsmodelle sind aktiv: Manual Growth, Power Law, Enhanced Cycle Repeat. Einfaches Cycle Repeat ist deaktiviert; Logarithmic Curve Repeat ist nicht registriert. Custom Model ist ein deaktivierter Platzhalter.
- Vorhanden und wiederverwendbar: historische Kursdaten mit OHLC-Schema, Provider-Fallbacks, Preis-API, Plattformparameter, Kredit-/LTV-Berechnungen, HODL-Gegenrechnung, Ergebnisdiagramme, Exporte, lokale Parameterpersistenz und ein reiner Parameter-Sweep.
- Das Strategy Lab prüft standardmäßig 8 Kreditquoten × 3 Laufzeiten auf einem einzigen Kursverlauf bei 9 % Zins. Es variiert Kreditparameter und vergleicht Risikopresets; es testet weder mehrere Anlagefamilien noch Marktpfade systematisch.

## Nachgewiesene Veröffentlichungsblocker

### 1. Uneinheitliche Kurszeitachse

`simulateRollingLoan.ts:137` erkennt Tages-/Monatsdaten anhand der ersten zwei Zeitstempel und greift anschließend über Arrayindizes bzw. `m * 30` zu.

- Manual Growth erzeugt seinen ersten Punkt für Monat 1. Die Simulation verwendet für Monat 1 jedoch Punkt 1, also den zweiten Punkt. Probe: Bei 100.000 Startkurs und 100 % Jahreswachstum sind für Monat 1 105.946,31 vorgesehen; verwendet werden 112.246,20.
- Enhanced Cycle Repeat erzeugt einen Startpunkt und beim ersten Schleifendurchlauf einen zweiten Punkt mit demselben Zeitstempel. Der Verbraucher hält die monatliche Reihe dadurch für Tagesdaten. In der 12-Monats-Probe wird schon für Monat 1 der Endkurs 120.016 verwendet.
- Power Law startet seine Reihe wiederum im aktuellen Monat am 15. und ist nicht an denselben Vertrag gebunden. Bei einem späteren Prüfdatum kann der erste Modellpunkt vor „heute“ liegen.

**Maßnahme:** expliziter Startzeitpunkt, durchgängige UTC-Zeitachse, klar definierter Zustand t=0 und zeitbasierte Zuordnung. Diagramme und Berechnung müssen denselben unveränderlichen Kursdatensatz verwenden. Endpunkte dürfen nicht stillschweigend fehlen oder mehrfach verwendet werden.

### 2. Unfairer HODL-Vergleich durch zusätzliche Einzahlung

Rolling Loan wendet die Sparrate bereits in Monat 0 und anschließend in Monat 1 bis N an. `HodlBaselineService.ts:88` beginnt erst bei Monat 1.

Probe: 1 BTC, 100.000 USD/BTC, 1.000 USD monatlich, 12 Monate, konstanter Kurs, keine Zinsen oder Gebühren. Rolling Loan endet nach Schuldenabzug bei 1,13 BTC, die HODL-Gegenrechnung bei 1,12 BTC. Der scheinbare Mehrwert von 1.000 USD entsteht ausschließlich aus der zusätzlichen Einzahlung.

**Maßnahme:** gemeinsame Zahlungszeitpunkte und identische externe Zahlungsströme für alle Strategien. Eine Nullkosten-/Nullrendite-Gegenrechnung muss exakt gleich ausfallen.

### 3. ATH-Strategien kennen die Zukunft

`AthBasedStrategy.ts:70` und `AthCollateralStrategy.ts:75` berechnen das ATH über die gesamte Projektion, einschließlich zukünftiger Punkte. Dieselbe heutige Ausgangslage erhält ein anderes ATH, wenn nur ein zukünftiger Kurs geändert wird. Probe: zukünftiges Maximum 200 bzw. 1.000 verändert das aktuell verwendete ATH entsprechend.

**Maßnahme:** Strategieentscheidungen sehen ausschließlich die bis zum Entscheidungszeitpunkt verfügbaren Daten. Spätere Kursänderungen dürfen frühere Entscheidungen nicht verändern. Historische Modellkalibrierung ebenfalls nur mit damals verfügbaren Daten.

### 4. Moving Average erhält keine historischen Daten

`StrategyExecutionService.ts:125` übergibt `historicalPriceData: []`. Die Moving-Average-Strategie fällt deshalb auf den aktuellen Kurs zurück. Selbst bei gefüllten Daten verwendet `MovingAverageStrategy.ts:63` `slice(-periodWeeks)` ohne Wochenaggregation. Bei täglichen Daten wären 200 Punkte 200 Tage, nicht 200 Wochen.

**Maßnahme:** bis zur Korrektur aus der veröffentlichten Auswahl nehmen; anschließend als eindeutig definierter Trendfilter mit Zeitfenster, Warm-up und Ausführungszeitpunkt anbieten.

### 5. Ergebnisansichten können verschiedene Strategien zeigen

`ResultsPage.tsx` bindet `HeadlineComparison` und Rolling-Loan-Diagramme unabhängig von der ausgewählten Strategie ein. `HeadlineComparison.tsx:30` nutzt stets `useRollingLoanCalculations`. Andere Strategien erzeugen ihre Ergebnisse über den separaten Legacy-Ausführungspfad.

**Maßnahme:** ein Simulationsergebnis pro ausgewählter Strategie und Konfiguration. Alle Karten, Tabellen, Diagramme und Exporte lesen dieselbe Ergebnis-ID. Alte Ergebnisse bei geänderten Eingaben sichtbar als veraltet markieren oder geschlossen aktualisieren.

### 6. Gebühren und Ergebnisfelder sind inkonsistent

- `CentralizedLoanCalculationService.ts:173` behandelt die Origination Fee als einmalig. Eine im Parameter als jährlich konfigurierte Gebühr wird beim anfänglichen Rolling Loan nicht entsprechend berücksichtigt. Probe: 15.000 Kredit, 1,5 % p.a., 24 Monate ergibt 225 statt 450 Gebühren.
- `toLegacyMonthlyResults` liefert u. a. `monthlyWithdrawal` statt der erwarteten Felder `withdrawalAmount` und `newLoanPrincipal`; `realTotalDebt` fehlt ebenfalls. Der TypeScript-Check meldet dies konkret. Verbraucher in Cashflow-Diagramm und Ergebnisanalyse können dadurch `NaN` erhalten.
- `useResultsAnalysis.ts:85` wertet den Unterschied zwischen Endvermögen und Startvermögen als Rendite; zusätzliche Einzahlungen werden nicht abgezogen. Das annualisierte Wachstum ist dadurch keine korrekte Anlagerendite mit laufenden Zahlungen.

**Maßnahme:** einheitliches Ergebnisformat und echtes Zahlungsjournal; Gewinn getrennt von Einzahlungen; passende TWR-/XIRR-Auswertung mit definiertem Verhalten bei nicht lösbaren Fällen. Keine einfache CAGR auf ein durch Einzahlungen wachsendes Portfolio anwenden.

### 7. Entnahmen und Cash fehlen als vollständige Buchführung

Die HODL-Gegenrechnung summiert gewünschte Entnahmen auch nach Verbrauch des Bestands. Probe: 100.000 Anfangswert und zweimal 200.000 gewünschte Entnahme ergeben 400.000 gemeldete Entnahmen bei null Restbestand. Tatsächlich finanzierbar sind insgesamt nur 100.000.

Rolling Loan begrenzt Teilverkäufe auf freie BTC, kann aber weiterhin den vollen angeforderten Geldfluss ausweisen. Außerdem ist kein durchgängiges Cashkonto für nicht reinvestierte Krediterlöse vorhanden. Das Produktversprechen „von BTC leben, ohne zu verkaufen“ wird von einem Ablauf mit laufenden BTC-Verkäufen nicht zuverlässig abgebildet.

**Maßnahme:** gewünschte, tatsächlich finanzierte und fehlende Entnahme getrennt speichern. Fiatreserve, Kreditvaluta, Zinszahlung, Verkauf und Tilgung explizit buchen. Überleben bzw. Deckung der Lebenshaltungskosten ist ein eigenes Vergleichsziel.

### 8. Monatliche Liquidationsprüfung ist zu grob

Der Rolling-Loan-Pfad entscheidet auf monatlichen Kursstützstellen. Ein starker Einbruch zwischen zwei Stützstellen kann verschwinden, obwohl er eine Liquidation auslösen würde. Vorhandene historische OHLC-Daten werden dort nicht zur laufenden Liquidationsprüfung genutzt.

**Maßnahme:** Kreditrisiko wenigstens auf täglichen Daten bzw. definierten Stressereignissen prüfen. Bei Tages-OHLC die unbekannte Reihenfolge innerhalb des Tages offenlegen und konservative Ausführungsregeln festlegen. Keine intraday-genaue Sicherheit aus Tagesdaten ableiten. Einzahlungen am Monatsende dürfen einen vorherigen Crash nicht rückwirkend retten.

### 9. Strategy Lab vergleicht teilweise unzulässige Konfigurationen

Der Sweep testet `[12, 24, Infinity]` ohne die erlaubten Laufzeiten der ausgewählten Plattform zu beachten. Der Risikopreset-Vergleich verwendet ausdrücklich die Firefish-Laufzeiten, auch bei einer anderen Plattform. Die Rangfolge entsteht allein aus dem Endbestand gegenüber HODL. Zahlungsfehlbeträge, Zwischenrisiken und Umsetzbarkeit sind keine Ausschlusskriterien.

**Maßnahme:** zulässige Plattformbedingungen als feste Nebenbedingungen; Zinsvarianten als Konditions-/Stressannahmen kenntlich machen. Zuerst Zielerfüllung und Restriktionen prüfen, danach Rendite-/Risikovergleich. Keine grüne „beste Konfiguration“ für eine unzulässige oder gescheiterte Variante.

### 10. Datenpflege und Releaseprüfung sind nicht geschlossen

- Vercel ruft Cron-Routen per GET auf; die konfigurierte Route exportiert nur POST. Die zusätzliche GitHub Action verwendet POST und kann unabhängig davon funktionieren, wenn ihre Secrets und Ausführung korrekt eingerichtet sind. [Vercel-Dokumentation](https://vercel.com/docs/cron-jobs)
- Der Cron meldet `fillGaps` ausdrücklich als übersprungen; die historische Lückenergänzung ist nicht angeschlossen.
- `PriceUpdater` kann bei Providerfehlern ein `skipped`-Resultat liefern; die Route schreibt danach dennoch `lastSuccessfulCronAt`. Ein frischer Heartbeat ist daher kein Beweis für frische Kursdaten.
- `refresh=force` ist öffentlich erreichbar; Begrenzung und requestübergreifende Zusammenfassung externer Abrufe sind zu prüfen. Interne Fehlermeldungen sollten nicht vollständig an öffentliche Clients gehen.
- Build ignoriert TypeScript- und Lintfehler. Nur ein Cron-Workflow ist im Repo vorhanden; verbindliche Releaseprüfungen fehlen.

## Projektionsmodelle: behalten, vereinfachen, ergänzen

| Modell | Bewertung und Entscheidung |
| --- | --- |
| Manual Growth | Behalten als transparentes „Eigenes Kursszenario“. Zeitachse korrigieren. Negative und flache Phasen anbieten. Glatte Wachstumsverläufe reichen für Kreditrisiken nicht aus. |
| Power Law | Behalten im Expertenbereich als ausdrücklich gewählte Hypothese. Startkursanschluss, Parameterherkunft und Kalibrierungszeitraum zeigen. Historische Passung ist kein Nachweis zukünftiger Gültigkeit. |
| Enhanced Cycle Repeat | Aktuelle Umsetzung grundlegend vereinfachen. Nur nachvollziehbare historische Wiederholung, Dämpfung und Stressüberlagerung zeigen. Erst nach Reparatur der Zeitachse veröffentlichen. |
| Einfaches Cycle Repeat | Mit der vereinfachten Wiederholung zu einer Modellfamilie zusammenführen. Mehrere fast gleiche Namen helfen bei der Entscheidung nicht. |
| Logarithmic Curve Repeat | Nicht in den Launch aufnehmen; derzeit nicht aktiv und keine notwendige zusätzliche Nutzerfrage. |
| Custom Model / Coming Soon | Platzhalter entfernen. Später konkrete Kurs-CSV oder manuelle Ereignisse anbieten, statt eines leeren Versprechens. |
| Historischer Backtest | Hohe Priorität: reale Zeiträume, verschiedene Starttermine und rollierende Fenster. Vergangenheitsreplay klar von Zukunftsszenarien trennen. |
| Stressszenarien | Zum öffentlichen Kern: früher/später Crash, lange Seitwärtsphase, dauerhafter Preisverlust, steigende Zinsen, keine Anschlussfinanzierung. Werte sind Annahmen, keine behaupteten Eintrittswahrscheinlichkeiten. |
| Viele simulierte Pfade | Nach der korrekten Basis: Block-Bootstrap/Regime-Szenarien mit Seeds, dokumentierter Kalibrierung und Extremereignissen. Anteil erfolgreicher Modellläufe nicht als objektive Zukunftswahrscheinlichkeit verkaufen. |

Im Enhanced-Modell beeinflussen wirtschaftlich klingende Parameter wie institutionelle Sättigung, Regulierung, Liquidität oder Wettbewerb die zentrale Renditedämpfung nicht: `applyDiminishingReturns` verwendet im Wesentlichen `diminishingFactor` und `cycleDegradation`; der zweite Name bezeichnet tatsächlich eine Schwelle für Tagesgewinne. Verluste werden unverändert übernommen, nur größere Gewinne gedämpft. Diese Konstruktion braucht eine klare Erklärung, keine Erzählung von einem kalibrierten volkswirtschaftlichen Modell.

Die Confidence-Werte sind aktuell heuristisch: z. B. startet Manual Growth bei 85 % und reduziert diesen Wert nach einer Formel. Auch feste +/-15-%-Bänder sind keine statistisch ermittelten Konfidenzintervalle. Solche Anzeigen entfernen oder als reine Illustrationen bezeichnen. Dass eine Zahl präzise aussieht, macht ihre Wahrscheinlichkeit nicht gemessen.

Die aktuellen Default-Jahresraten enthalten u. a. +180 %, +210 % und +250 %. Als Standard prägt das eine starke Wachstumsannahme. Zum Einstieg mehrere gleichberechtigte, deutlich bezeichnete Szenarien anbieten.

## Anlageangebot und fachliche Ordnung

Vier Dinge getrennt modellieren: **Ziel**, **Anlageregel**, **Kreditregel**, **Marktszenario**. Plattformkonditionen beschreiben die Ausführbarkeit. „Optimistisch“ ist eine Markterwartung; eine Kreditquote ist eine Entscheidung. Beides darf sich nicht gegenseitig automatisch festlegen.

| Angebot | Priorität | Begründung |
| --- | --- | --- |
| BTC halten / Einmalkauf | Launch | Verständliche, schuldenfreie Referenz; vorhandenen BTC-Bestand von frischem Geld unterscheiden. |
| Fester Sparplan | Launch | Kernfrage auch für Nutzer mit 0 BTC; eigener Erstklasse-Vergleich statt verstecktem Nebenfeld einer Kreditstrategie. |
| Gestaffelter Einstieg | Bald nach Basis | Vorhandenes Geld in z. B. 6/12 Tranchen investieren. Uninvestiertes Cash bleibt Teil des Vermögens; gleiche Mittel wie beim Einmalkauf. |
| Entnahme durch Verkauf | Launch für FIRE-Ausrichtung | Ehrliche Referenz für Lebenshaltungskosten; tatsächliche Deckung, Restvermögen und Kaufkraft zeigen. |
| BTC-besicherter Kredit / Rolling Loan | Behalten, zunächst Expertenbereich | Relevantes Differenzierungsmerkmal. Getrennte Ziele „zusätzlich BTC kaufen“ und „Ausgaben finanzieren“; Cashreserve, Laufzeiten und Refinanzierung abbilden. |
| BTC/Cash-Rebalancing | Zweite Ausbaustufe | Verständliche Risikosteuerung; Gebühren, Steuerannahmen und Cashrendite müssen mitgerechnet werden. |
| Regelbasierter Dip-Sparplan | Zweite Ausbaustufe | Gleicher Beitragsrahmen wie DCA, begrenzte Reserve, eindeutige Schwellen. Zusätzliche Käufe brauchen eine ausgewiesene Finanzierungsquelle. |
| Moving Average | Später, nach Korrektur | Optionaler Trendfilter; nicht als automatisch sicherer oder überlegen bezeichnen. |
| ATH Based / ATH Collateral | Aktuelle Varianten aus Launch entfernen | Zukunftswissen beseitigen; anschließend als optionale Filter/Reserveparameter vorhandener Strategien statt zwei großer eigener Strategieprodukte. |
| Default Strategy | Öffentlichen Namen entfernen | Beschreibt keine Nutzerentscheidung. Nach Prüfung in klare Kredit-/Cashflow-Regeln überführen. |

Buy & Hold, DCA und gestaffelter Einstieg sind alternative Zeitpläne für verfügbares Kapital. Sie dürfen nicht mit unterschiedlichen Einzahlungen gegeneinander antreten. Ein Nutzer mit monatlichem Einkommen kann nicht rückwirkend sein ganzes Jahresgehalt am ersten Tag investieren.

## Empfohlene Oberfläche

Ein gemeinsamer Arbeitsbereich statt fünf gleichrangiger Schritte:

1. **Mein Plan:** vorhandene BTC, verfügbares neues Kapital, Sparbetrag, Startdatum, Horizont, Währung; optional Entnahmestart und Ausgaben. Beispielwerte deutlich als Beispiel markieren.
2. **Strategien vergleichen:** 2–4 Strategien nebeneinander, gemeinsame Budgets und Zeiträume; Einstellungen links, Ergebnisvergleich rechts bzw. mobil darunter.
3. **Markt prüfen:** historische Zeiträume, eigene Zukunftsszenarien und Stressfälle. Gemeinsamer Marktpfad für alle Strategien innerhalb eines Vergleichs.
4. **Details aufklappen:** Ereignisse, Kreditpositionen, Cashflow-Journal, Methodik und Export zu einer ausgewählten Strategie.

„Strategie“ und „Ergebnis“ sind fachlich verschiedene Dinge, müssen aber keine getrennten Hauptseiten sein. Nutzer sollen die Konsequenzen einer Änderung direkt sehen. Eine Detailergebnisseite kann für tiefe Analyse bleiben. Das Strategy Lab wird langfristig zum Vergleichskern, nicht zum fünften Tab mit nochmals eigenen Ergebnissen.

Auf der Startansicht genügen Zielauswahl **Aufbauen / Entnehmen / Kredit prüfen** und ein verwendbares Beispiel. Expertenparameter werden erst bei Bedarf eingeblendet. Kein Konto zum ersten Rechnen.

Verwirrung reduzieren:

- „Sparen“ und „Entnehmen“ als Auswahl mit jeweils positivem Betrag statt Vorzeichenkonvention.
- Kreditquote, anfängliches LTV, freies/sicherungsgebundenes BTC und Liquidations-LTV verständlich unterscheiden.
- „Safe“, „Lowest risk“, pauschale Sicherheitssterne und „Moonshots“ als Standardnavigation ersetzen durch beschreibende Größen und gemessene Szenarioergebnisse.
- Automatisch aktualisierte Ergebnisse und „Run Simulation“ vereinheitlichen. Bei großen Simulationen ausdrücklich starten, Fortschritt und Abbruch anbieten.
- USD/EUR konsequent behandeln. Ein Eurozeichen auf USD-Kursen ist keine Währungsumrechnung.
- Unfertige Auswahloptionen, doppelte Karten und Mischung aus Deutsch/Englisch entfernen.

## Woran „besser“ gemessen wird

Keine einzelne Punktzahl kann gleichzeitig alle Ziele erfüllen. Ein Anleger möchte mehr BTC, ein anderer geringere Verluste, ein dritter verlässliche Entnahmen.

Für Aufbau: Nettogesamtvermögen, Netto-BTC, eingezahltes Kapital, tatsächlicher Gewinn, passende Renditekennzahl, maximaler Rückgang, Gebühren, Cashreserve und Kreditkosten.

Für FIRE: Anteil finanzierter Ausgaben, erster Fehlbetragsmonat, gesamter Fehlbetrag, Kaufkraft der Entnahmen und verbleibendes Vermögen. Eine Strategie, die Ausgaben aussetzt, darf wegen höherem Restvermögen nicht als Gewinner erscheinen.

Für Kredite zusätzlich: Liquidationsereignisse, höchstes LTV, Reservebedarf, Zwangsverkäufe, Refinanzierungsbedarf und Ergebnis ohne Anschlusskredit. Restschuld-/Haftungsannahmen je Kreditprodukt dokumentieren; der derzeit universelle Schuldenerlass nach Zusammenbruch ist eine Modellannahme, keine allgemein belegte Plattformregel.

Für Robustheit: dieselben Strategien auf vielen Startzeitpunkten und Marktpfaden bewerten, nach Zielerfüllung filtern, Median und schlechte Fälle zeigen. Wenn mehrere Strategien unterschiedliche Stärken haben, diese nebeneinander stehen lassen. Optimierung auf einem Trainingszeitraum und Bewertung auf späteren, unberührten Zeiträumen trennen. Die begrenzte Anzahl unabhängiger Bitcoin-Marktzyklen offenlegen.

## Was dem vollständigen Portal noch fehlt

- Einheitliches Journal für BTC, Fiat, Schulden, Gebühren und externe Zahlungsströme. Schulden in BTC umgerechnet sind eine Kennzahl, keine tatsächlich freie BTC-Menge.
- EUR/USD mit echter FX-Datenbasis, nominale und inflationsbereinigte Ergebnisse.
- Historischer Backtest einschließlich zeitgerechter Indikatoren, Warm-up und Datenqualitätskennzeichnung; Gebühren-/Kreditkonditionen entweder historisch korrekt oder ausdrücklich kontrafaktisch.
- Steuerannahmen als eigene spätere Schicht mit Jurisdiktion, Anschaffungszeitpunkten und Verkaufslosen; bis dahin deutlich „vor Steuern“. Für einen deutschen FIRE-Vergleich kann die pauschale These „Kredit ist besser als Verkauf“ gerade durch Steuerunterschiede irreführen. Die konkrete Umsetzung braucht gesonderte fachliche Prüfung. [BMF-Grundlage](https://www.bundesfinanzministerium.de/Content/DE/Downloads/BMF_Schreiben/Steuerarten/Einkommensteuer/2025-03-06-einzelfragen-kryptowerte-bmf-schreiben.pdf?__blob=publicationFile)
- Gespeicherte Szenarien, duplizierbare Strategien, reproduzierbarer Export/Import mit Modellversion, Datenstand, vollständigen Parametern, Startdatum und Zufallsseed. Der bestehende Export ist eine Ausgangsbasis, enthält aber nicht die gesamte Modellkonfiguration.
- Größere Vergleichsläufe in einem Web Worker mit Fortschritt, Abbruch und begrenzter Last.
- Verständlicher Datenstatus mit Quelle, letztem Kurszeitpunkt, Lücken und klarer Trennung historischer und projizierter Bereiche.
- Methodikseite und direkt erreichbare Betreiber-/Datenschutzhinweise; tatsächliche Datenverarbeitung einschließlich Vercel Analytics und einer etwaigen KI-Anbindung transparent prüfen.

Nicht für den ersten Release erforderlich: Nutzerkonten, Community-Rankings, Live-Handel, Broker-/Wallet-Anbindung, Nachrichtenfeeds, beliebige KI-generierte Strategien, Derivate oder große Multi-Asset-Portfolios. Ein vollständiges Tool muss seine angebotenen Fälle korrekt abbilden; es muss nicht alle Finanzprodukte unterstützen.

## Plattformvorgaben aktuell prüfen

Die Presets brauchen Produktbezug, Region, Quelllink und Prüfdatum. Zinsen sind Annahmen bzw. aktuelle Angebote, keine dauerhaften Plattformkonstanten.

- Firefish bestätigt 95 % Liquidations-LTV. Der öffentliche Glossar beschreibt feste Laufzeiten und manuelle Rollovers mit neuer Sicherheit. Nahtlose Refinanzierung ohne zusätzliche Liquidität darf deshalb nicht als selbstverständlich gelten. [Liquidation](https://docs.firefish.io/how-it-works/liquidations), [Glossar](https://firefish.io/glossary)
- Coinbase dokumentiert eine Bearbeitungsgebühr bei Kreditaufnahme und Aufstockung; das lokale Preset steht auf 0 %. Die Höhe ist aus dem konkreten Angebot zu beziehen. [Bearbeitungsgebühr](https://help.coinbase.com/en/coinbase/trading-and-funding/loan/fee)
- Coinbase beschreibt außerdem variable Marktzinsen und produktspezifische LLTV-Schwellen. 86 % ist ein Beispiel, keine universelle Konstante für sämtliche Märkte. [Kreditüberblick](https://help.coinbase.com/en/coinbase/trading-and-funding/loan/loan-intro), [Kreditgesundheit](https://help.coinbase.com/en/coinbase/trading-and-funding/loan/loan-health)
- Strike: aktueller offizieller Suchauszug nennt 0 % Liquidationsgebühr, im Code stehen 1 % sowie unendliche Laufzeiten. Die Seite ließ sich nicht vollständig abrufen; Bedingungen deshalb als noch nicht vollständig verifiziert behandeln und konkret mit dem angebotenen Produkt abgleichen. [Offizielle Konditionsseite](https://strike.me/faq/what-are-the-loan-rates-fees-and-terms-wr/)

## Jev / TypeSafe

**Empfehlung: kein Releaseblocker und keine Berechnungsengine.** Jev beantwortet eng umrissene semantische Fragen mit strukturierten Choice-/Score-/Noul-Ausgaben. Es erzeugt keine frei formulierten Erklärungen und ist keine Kursprognose. Die Dokumentation empfiehlt ausdrücklich, Mathematik im Code zu lassen. [Einführung](https://docs.typesafe.ai/introduction), [bekannte Grenzen](https://docs.typesafe.ai/model-jaggedness/jev-1.13)

Sinnvoller späterer Einsatz: Einen Satz wie „Ich möchte monatlich sparen und keinen Kredit aufnehmen“ auf unterstützte Ziele und Optionen abbilden. Beträge werden separat extrahiert und validiert; unklare Eingaben werden nicht geraten. Jev könnte außerdem Textabschnitte aus Produktbedingungen bekannten Kategorien zuordnen, aber Konditionen nicht ohne Quellenprüfung veröffentlichen.

Geeigneter Ablauf: Eingabe → semantische Zuordnung → validierte, für Nutzer sichtbare Konfiguration → deterministische Simulation → nachvollziehbare Kennzahlen. Freie Erklärungstexte benötigen Vorlagen oder ein dafür geeignetes generatives Modell.

Ungeeignet: Jev bestimmt die „beste Anlage“, rechnet Zinsen/LTV, ersetzt den Optimierer, erzeugt zukünftige Bitcoinpreise oder liefert eine behauptete Erfolgswahrscheinlichkeit. TypeSafe-Confidence beschreibt die Antwortverteilung des Modells, nicht die Wahrscheinlichkeit einer erfolgreichen Anlage. [Confidence-Dokumentation](https://docs.typesafe.ai/confidence)

Vor Einführung prüfen: gegenüber einem einfachen Formular messbarer Nutzen, Fehlklassifikationen anhand eigener Beispiele, klarer Umgang mit Unsicherheit, serverseitiger API-Schlüssel, Datenminimierung, Kostenbegrenzung und funktionsfähiger Simulator ohne KI. Dafür müssen keine persönlichen Finanzdaten an Jev gesendet werden, wenn nur die Absicht klassifiziert wird.

## Priorisierte Umsetzung

| Stufe | Ergebnis | Abnahme |
| --- | --- | --- |
| P0: Berechnungsvertrauen | Zeitachse, Cashflow-Parität, korrektes Ergebnisformat, Gebühren und Entnahmen; ATH-Zukunftswissen beseitigt; Indikatoren korrekt versorgt | Handprüfbare Referenzfälle, Nullfall-Parität, unveränderte frühere Entscheidungen bei veränderter Zukunft, alle angezeigten Kennzahlen stimmen mit Journal und Export überein |
| P0: Betriebsfähigkeit | Reproduzierbarer Build, grüne relevante Tests, Typecheck als Pflicht, Cron-Methode korrigiert, ehrlicher Datenstatus, geprüfte Plattformparameter | Preview-Deployment mit erfolgreichem GET-Cron-Test, Provider-Ausfalltest, aktuellem Datenstand und dokumentiertem Rollback |
| P1: Öffentlicher Vergleichssimulator | Direkte Startseite, gemeinsamer Plan, HODL/DCA und klarer Kredit-/Entnahmevergleich, wenige verständliche Markt-/Stressszenarien | Gleiche Mittel und Zeitpunkte, klar ausgewiesene Fehlbeträge, keine nicht implementierten oder unzulässigen Optionen; Desktop/Mobil/Reload/Export geprüft |
| P2: Belastbare Strategieforschung | Historische und rollierende Backtests, viele gemeinsame Pfade, Rebalancing/Dip-Regeln, Sensitivitätsanalyse | Zeitlich getrennte Optimierung und Bewertung, reproduzierbare Läufe und dokumentierte Daten-/Modellgrenzen |
| P3: Komfort und Assistenz | optional Jev, weitergehende Steuerfälle und Szenarioverwaltung | Nachweisbarer Nutzervorteil; Rechenkern unabhängig und unverändert reproduzierbar |

Für eine erste öffentliche Beta würde ich P0 plus einen schmalen P1 liefern. Den Begriff „beste Strategie“ erst verwenden, wenn Ziel, getestete Bedingungen und Vergleichsgrenzen unmittelbar mit angezeigt werden. Für den Anspruch eines vollständigen Strategieportals ist P2 zentral.

## Prüfprotokoll und Grenzen

- Projektabhängigkeiten anhand des bestehenden pnpm-Lockfiles wiederhergestellt; keine Versions-/Lockfileänderung.
- Prisma Client lokal erzeugt; keine Migration und kein Datenreset ausgeführt.
- Gesamte vorhandene Vitest-Suite: **1.132 Tests, 1.046 bestanden, 86 fehlgeschlagen**. Zusätzlich gibt es Fehler beim Laden einzelner alter Testsuiten (`process.exit`). Veraltete UI-/Strukturtests und fachliche Fehler müssen getrennt bereinigt werden; 86 fehlgeschlagene Tests sind nicht automatisch 86 Produktfehler. Preis-API-, Cron-, PriceStore- und PriceUpdater-Tests bestanden.
- Typecheck scheitert konkret am inkompatiblen Ergebnisadapter `simulateRollingLoan.ts:975`.
- Produktionsbuild scheitert lokal unter Windows an `EPERM` beim Scannen von `C:\Users\dwerw\Anwendungsdaten`, auch außerhalb der Sandbox. Das Repo dokumentiert dieses Problem bereits. Das beweist keinen Linux-/Vercel-Buildfehler, liefert aber auch keinen erfolgreichen Buildnachweis. Keine Umgebungsvariablen des Benutzerprofils wurden dafür umgebogen.
- Gezielte lokale Rechenproben reproduzieren Zeitachsenfehler, zusätzlichen Sparbeitrag, zukünftiges ATH, fehlende MA-Historie, Jahresgebührenfehler und überhöhte Entnahmezählung. Ergebnisse: `docs/audits/2026-09-23-probes.json`; ausführbares Skript daneben.
- Live-Navigation und geladene Anzeigen im Browser geprüft; lokale neue Oberfläche nicht erfolgreich als Produktionsbuild gestartet. Keine vollständige mobile/Barrierefreiheits-/Sicherheitsabnahme, keine Prüfung privater Hosting-Einstellungen, kein Test echter Kreditverträge und keine vollständige Datenbankprüfung.
- Keine Veröffentlichung, kein Commit, keine Änderung des Produktcodes. Dieser Bericht beschreibt den geprüften Stand und den empfohlenen weiteren Umfang.
