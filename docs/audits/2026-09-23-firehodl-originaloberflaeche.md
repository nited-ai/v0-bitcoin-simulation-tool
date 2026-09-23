# FireHODL: Originaloberfläche wiederhergestellt

## Maßgebliche Produktentscheidung

Der Nutzer hat die Ersatzoberfläche zweimal zurückgewiesen. Ab jetzt ist die tatsächlich auf firehodl.com sichtbare Oberfläche die Grundlage: ursprüngliche Komponenten, Gestaltung, Sprache/Theme, Parameter, Kredit- und Plattform-Presets, große Projektion, Strategie und Ergebnisse. Keine weitere Neugestaltung ohne fachlichen Anlass. Die früheren Layoutvorschläge in den September-Audits sind damit überholt.

## Umgesetzt

- `/` und `/simulation` rendern wieder `SimulationPage` mit dem ursprünglichen i18n-Provider. Keine vorgeschaltete Landingpage. Der ehemalige Landing-Link führt zur Methodik.
- Der Projektionschart, seine Kennzahlen und die Ergebnisverbraucher erhalten dieselbe zentral erzeugte Projektion. Doppelte Berechnung und abweichende Startkurse im Chart wurden entfernt. Manuell gesetzte Startkurse werden durch spätere Kursupdates nicht überschrieben. Datenfehler überschreiben keine Projektionsfehler mehr.
- Manuelle Jahresszenarien, ursprüngliche Presets und Power-Law-Einstellungen bleiben vorhanden. Manuelle und Power-Law-Projektionen haben jetzt einen Startpunkt und vollständige Kalendermonate. Power Law verwendet ab dem ersten Monatsende das absolute Modellniveau; dieser Übergang ist ausdrücklich eine Szenarioannahme.
- Historische Zykluswiederholung: letzte vier verfügbare Datenjahre oder abgeschlossene Halving-Zeiträume 2016–2020 / 2020–2024, verschiebbarer Einstieg nach Monaten. Quellenzeitraum und tatsächlicher Start in der Vorlage sind sichtbar. Alle Tage werden ausgegeben. Lücken, doppelte Tage, unvollständige Zeiträume und ungültige OHLC werden abgelehnt.
- Dämpfung stellt nur ihre tatsächlich implementierten Effekte dar: positiver Tagesgewinn oberhalb einer Schwelle, Verlusttage unverändert. Wirkungslos gebliebene wirtschaftliche Regler und erfundene Konfidenzangaben wurden aus dieser aktiven Bedienung entfernt. Die alten Modell-/UI-Tests, die solche Faktoren voraussetzten, wurden durch Tests des tatsächlichen Vertrags ersetzt; Horizont, Wiederholung, Preset-Reihenfolge, Crash-Erhalt, Phase und ungültige Daten sind abgedeckt.
- Kennzahlen werden anhand realer Zeitstempel berechnet: CAGR, vollständige Simulationsjahre, Drawdown einschließlich flacher Hochpunkte. Zufällige, nur für den Export erzeugte OHLC wurden entfernt. Replays exportieren ihre konstruierten OHLC; reine Monatskurse lassen diese Felder leer.
- Rolling Loan liest Kalenderzeitpunkte statt `Monat × 30` und erzeugt ohne Kursdaten keine Positionen. Andere bekannte Fehler dieser alten Engine sind damit ausdrücklich noch nicht behoben.
- Methodik und Datenschutzhinweise beschreiben die wieder aktive Oberfläche und den tatsächlichen Stand. Ergebnis- und Lab-Tabs kennzeichnen die offenen Berechnungsfehler.

## Prüfung

- `test:release` erweitert auf die aktiven Projektionsmodelle und Kalenderintegration: **25 Dateien, 244 Tests bestanden**.
- TypeScript ohne Fehler; abschließender Produktionsbuild erfolgreich. Ein zwischenzeitlicher interner Webpack-Hashfehler verschwand nach Entfernen des generierten Caches; danach vollständiger sauberer Build und Neustart der Vorschau.
- Ursprüngliche Live-Oberfläche auf firehodl.com im Browser mit lokaler Version verglichen. Parameter, ursprüngliche manuelle Projektion, historischer Replay, Zyklusauswahl 2020–2024 und Verschiebung auf zwölf Monate im Browser geprüft.
- Unabhängiger Review: Power-Law-Zeitachse und Überschreiben von Projektionsfehlern durch Datenfehler gefunden und korrigiert.
- Ein zusätzlich versuchter alter `PriceModelSelector.test.tsx` lädt wegen eines bereits vorhandenen Vitest-Hoistingfehlers nicht. Die komplette alte Testsuite ist damit nicht als grün behauptet. Die 244 Tests sind der gezielte Release-Prüfumfang.

## Lokale Vorschau und Grenzen

Die lokale DATABASE_URL ist leer. Für die Vorschau wird die vorhandene historische Datensicherung bis 08.05.2026 ausdrücklich als solche eingebunden: `FIREHODL_READ_ONLY_DATA=1` und `FIREHODL_PREVIEW_PRICE_FILE` als lokaler Pfad. Es wird kein aktueller Kurs behauptet und keine Datenbank beschrieben. Diese Vorschaukonfiguration ist kein Produktionsdatenfeed.

Historische Wiederholung wiederholt auch die beobachtete Rendite. Bei langen Laufzeiten können dadurch extreme Kurse entstehen. Sie ist keine kalibrierte Zukunftsprognose und insbesondere keine Garantie eines Vierjahreszyklus. Der wirtschaftliche Rahmen des Halvings stammt aus der [Bitcoin-Protokollreferenz](https://developer.bitcoin.org/reference/block_chain.html); beobachtete Marktphasen können sich verändern.

**Nicht veröffentlicht.** Die alte Ergebnisrechnung braucht weiterhin eine saubere Integration mit dem separat getesteten Tagesmotor. Offene Fälle: Intraday-/Tagesliquidationen in den Ergebnisverbrauchern, Cashflow-Parität, Gebühren und Entnahmen, kausale ATH-/MA-Regeln, gleiche Ergebnisse über alle Ansichten sowie belastbare Plattformbedingungen. Die im separaten Simulator-Modul bereits existierenden Verbesserungen und Tests bleiben als Grundlage erhalten. Die wiederhergestellte UI ist keine Zertifizierung der alten Kreditrechnung.
