# FireHODL: Projektion und Kreditprüfung nach Nutzerkorrektur

## Was korrigiert wurde

Der erste Umbau hat wichtige Funktionen aus dem öffentlichen Ablauf entfernt. Der Nutzer hat ausdrücklich klargestellt, dass eigene volatile Szenarien, Szenariokennzahlen, Kreditprofile und nachvollziehbare Liquidationsgrenzen Kernfunktionen sind. Die Überarbeitung behält die geprüfte Rechenbasis, führt aber wieder getrennte Arbeitsbereiche für Projektion, Regeln/Kredit und Ergebnisse ein. Das Kartenraster und der große Slogan entfallen. Die Oberfläche verwendet die vorhandene lokale Geist-Schrift, Datenzeilen und große Charts.

## Umgesetzt

- Eigener Kurschart mit Tagestiefs, Rendite, tatsächlich realisierter Volatilität, maximalem Rückgang, Tiefstkurs und schlechtestem Tag.
- Frei editierbare Monatsziele; Jahresziele und ein Crash-/Erholungszyklus als Ausgangsvorlagen. Logarithmische Interpolation mit optionaler Brownian Bridge erreicht die Ziele exakt. Für Wachstumsszenarien reproduzierbare tägliche Log-Renditen und synthetische OHLC-Spannen. Eine Verlaufsnummer erlaubt vergleichbare Versuche. Historische Kurse bleiben unverändert; Zykluswiederholung übernimmt jetzt auch die relativen OHLC-Spannen.
- ATH-Regel, z. B. Kaufen ab 50 % unter dem bis dahin bekannten Hoch; alternativ Kauf unter gleitendem Durchschnitt. Cashquote, maximaler Kaufbetrag, Schwelle und tägliche/monatliche Prüfung sind einstellbar. Vortagssignal, Ausführung am Tagesbeginn; Cash bleibt bis zum Signal erhalten.
- Editierbare FireHODL-, Firefish-, Strike- und Coinbase/Morpho-Modellvorlagen. Eigene Profile lokal anlegen und erneut auswählen. Einstellungen werden auch im Simulations-Export gespeichert; offene Laufzeit ohne erfundene Fälligkeit verfügbar.
- Tagesgenauer Kreditverlauf: Liquidationskurs, LTV, Tagestief, aktueller Spielraum nach Gebühren, BTC/Cash und Schulden. Sprung zum Liquidationstag. Auslösegrenze wird vor dem Verkauf erhalten, Restschuld ohne BTC-Sicherheit ausdrücklich angezeigt.
- Kaufmarkierungen und Ereignistabelle mit tatsächlichen Ausführungskursen; Ansicht für Kaufregeln zeigt Kaufschwellen statt leerer Kreditkennzahlen. Detailstrategie kann unmittelbar in den Ergebnisvergleich aufgenommen werden.
- Engine 1.1.0. Dateien aus 1.0.0 bleiben importierbar. Export fixiert die vollständige Kursreihe, damit Änderungen an Profilen und Regeln denselben Pfad verwenden können.

## Modellgrenzen

Ein Anbietername bedeutet nicht, dass ein konkreter Vertrag vollständig nachgebildet wird. Verwendete Zinsen/Gebühren sind explizite Annahmen. Firefish verwendet laut [offizieller Quelle](https://docs.firefish.io/how-it-works/liquidations) eine 95-%-LTV-Liquidationsschwelle; vertragsabhängige Vorabzinsen und Abwicklung sind hier nicht abgebildet. Der klassische [Strike-Kredit](https://strike.me/en/faq/what-is-my-loan-to-value-ratio/) hat zusätzliche Margin-Call-Regeln und Fristen; Strike bietet außerdem andere Produkte. Coinbase/Morpho hat [marktbezogene LLTV-Werte](https://help.coinbase.com/en/coinbase/trading-and-funding/loan/loan-health), variable Zinsen und protokollspezifische Liquidationsmechaniken. Die Vorlage ist deshalb als Beispielmarkt gekennzeichnet. Quellen geprüft am 23.09.2026; die direkte Strike-Webseite war für den Abruf gesperrt, der offizielle Suchindex und bisherige Repositorywerte waren verfügbar.

Das gemeinsame Modell verwendet konstante Zinsen, alle gehaltenen BTC als Sicherheiten und vollständige Liquidation beim Tagestief. Margin-Call-Fristen, automatische Nachbesicherung und Teilverkäufe sind noch nicht modelliert. Synthetische Volatilität ist nicht statistisch auf Bitcoin kalibriert; Einzelpfade liefern keine Ausfallwahrscheinlichkeit. Eine Matrix vieler Startzeitpunkte/Pfade und Anbieter-Vertragsmodelle sind weitere Arbeitsschritte, keine bereits vorhandenen Funktionen.

## Nachweise

- Abschließende Releasegruppe: **199 Tests in 19 Dateien erfolgreich**; Typecheck und optimierter Produktionsbuild ebenfalls erfolgreich.
- Neue Referenzfälle für deterministische volatile OHLC-Pfade, exakte Zielkurse trotz Schwankungen, unveränderte frühere OHLC-Kerzen beim Verlängern eines Wachstumsszenarios, tatsächliche Pfadkennzahlen, ATH ohne Zukunftswissen, MA-Anlaufzeit, Ausführung am nächsten Open, erhaltenes Cash, offene Laufzeiten, Liquidationsgrenze vor Verkauf und unbesicherte Restschuld.
- UI-Tests für editierbare Crashziele, Werteerhalt über Tabs und Anlegen/Neuladen eines eigenen Kreditprofils.
- Unabhängiger Review: Überschreiben neuer Zielvorlagen, falscher initialer Kreditspielraum bei Cashreserve, fehlende/falsch positionierte Kaufereignisse, verzerrte Chart-Zeitachse und 0-%-LTV bei Restschuld korrigiert. Keine offenen wichtigen Befunde aus diesem Review.
- Produktionsbrowser: 24 Monate, Ziele 140.000 USD in Monat 6, 20.000 in Monat 12, 180.000 in Monat 24, Volatilität 55 %, Verlauf 42. Endkurs exakt 180.000 USD. ATH-Regelkauf ab 50 % Rückgang sichtbar am 04.06.2027; spätere Sparraten werden nachvollziehbar investiert. Vergleich mit HODL, gestaffeltem Einstieg und Cashreserve funktioniert.
- Auf demselben Pfad mit Firefish-Modell, 50 % Aufnahmequote: Liquidation am 06.08.2027, Tagestief rund 35.436 USD, Grenze rund 36.132 USD, auslösendes LTV 96,9 %, Restschuld rund 363 USD. Klick zum Ereignistag zeigt genau diese Bilanz.
- Mobile Prüfung mit 390 px: Dokumentbreite 375 px, kein horizontaler Seitenüberlauf. Größere Datentabellen scrollen innerhalb ihres Bereichs.

Kein Deployment. Die lokale Vorschau auf Port 3100 verwendet weiterhin deaktivierte Livekurse. Die offenen Betriebsprüfungen aus dem Umsetzungsbericht bleiben bestehen. Die separate Legacy-Gesamtsuite hatte weiterhin 86 bekannte Fehler und wird durch die Releasegruppe nicht als grün erklärt.
