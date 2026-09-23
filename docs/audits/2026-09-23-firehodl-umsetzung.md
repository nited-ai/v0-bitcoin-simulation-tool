# FireHODL – Umsetzung des Vergleichssimulators

Stand: 23.09.2026. Nach Nutzerkritik korrigiert: Der erste Umbau reduzierte den Funktionsumfang zu stark. Projektion, Volatilität, Kreditprofile, Grenzkurse und Kaufregeln gehören zum Kernprodukt. Details zur Korrektur und Prüfung: [Projektion und Kreditprüfung](2026-09-23-firehodl-projektion-korrektur.md). Nicht veröffentlicht.

## Ergebnis

- `/` öffnet unmittelbar den Simulator. `/simulation` verwendet dieselbe Oberfläche. Arbeitsbereiche: Kursprojektion, Strategien & Kredit, Ergebnisse. Gemeinsame Basisdaten bleiben sichtbar; keine Landingpage.
- Ein gemeinsamer Plan versorgt acht Regeln: HODL mit Sparplan, gestaffelter Einstieg, Cashreserve, BTC/Cash-Rebalancing, BTC-Kauf mit Kredit, Entnahme auf Kredit, Kaufen unter ATH und Kaufen unter gleitendem Durchschnitt. Cashreserve behält vorhandene BTC.
- Ziele Aufbau, Entnahme und Kredit setzen passende Vergleichsauswahlen. Charts, Tabelle und Journal beziehen sich auf dieselben Ergebnisse. Es wird kein pauschaler Gewinner behauptet.
- Gemeinsame tägliche Kursreihen: eigene Jahresrate, seitwärts, frühe/späte Crashs, Bärenmarkt, historischer Backtest, gedämpfte Zykluswiederholung und relative Power-Law-Hypothese. Die letzten beiden sind experimentell. Keine scheinpräzisen Erfolgswahrscheinlichkeiten.
- Tagesjournal bilanziert BTC, Cash, Schulden, externe Einzahlungen, tatsächlich bezahlte Entnahmen, Fehlbeträge, Handels-/Kreditgebühren und Zinsen. Kredite prüfen tägliche Tiefkurse, führen Restschulden weiter und können bei Fälligkeit ohne Refinanzierung zurückgezahlt werden.
- Nominales und inflationsbereinigtes Endvermögen, cashflowbereinigter Rückgang, Gewinn ohne Einzahlungen, tatsächlicher BTC-Bestand und Netto-BTC-Gegenwert sind getrennt.
- Stressvergleich mit fünf identischen Szenarien je Strategie; historisch/importierte Vergleiche behalten denselben effektiven Startkurs. Gespeicherte Resultate verschwinden bei geänderten Eingaben.
- Explizites lokales Speichern, Laden, JSON-Import/Export mit vollständig fixierter Kursreihe und Engine-Version; Tagesjournal als CSV. Budgetänderungen können mit einer importierten historischen Reihe weitergerechnet werden.
- `/methodik` erklärt Formeln, Reihenfolge, Strategie- und Datenannahmen sowie Grenzen. Alle Beträge USD, vor Steuern. Kredite sind hypothetisch und keine unbestätigten Anbieter-Presets. Vercel Analytics wurde aus dem Layout entfernt; Fonts werden lokal bereitgestellt.
- `/impressum` und `/datenschutz` ergänzt und durch einen gemeinsamen Footer erreichbar. Betreiberangaben auf ausdrücklichen Wunsch des Nutzers wie nited.ai übernommen, am 23.09.2026 anhand des aktuellen Impressums geprüft: nited.ai GmbH i.G., Lehrte, Kontakt hallo@nited.ai. Keine veralteten ODR-/TMG-Texte übernommen. Datenschutzhinweise beschreiben die tatsächlichen lokalen Simulatorfunktionen und Google Workspace für diesen Kontakt.

## Betrieb und Daten

- Authentifizierter Cron unterstützt GET (Vercel) und POST (GitHub). Ein übersprungener Liveabruf oder fehlgeschlagene Historienreparatur schreibt keinen Erfolg und liefert einen Fehlerstatus.
- Reparatur findet auch Lücken innerhalb der gespeicherten Historie und ersetzt den letzten Intradaywert des Vortags durch abgeschlossene OHLC-Kerzen. Unvollständige/ungültige Historienantworten werden vor Schreibbeginn zurückgewiesen. Der aktuelle, noch offene Tag wird nicht als historischer Schlusskurs ausgeliefert.
- Binance-Kerzen sind BTC/USDT, als USD-Näherung gekennzeichnet. Eine leere Datenbank startet ab Binance-Verfügbarkeit 17.08.2017. Ältere vorhandene Lücken können diesen Anbieter überschreiten und brauchen einen gesonderten Backfill. Datennutzungsrechte und Datenqualität sind vor öffentlichem Betrieb zu prüfen.
- Preisalter und Cronalter gehen in den Datenstatus ein. Öffentliche Refresh-Anfragen umgehen das Abrufintervall nicht mehr. Fehlerantworten enthalten keine internen Datenbankdetails. Hintergrundabrufe besitzen einen eigenen Datenbankclient.
- Prisma verwendet den regulären `@prisma/client`-Paketpfad. Die alte benutzerdefinierte Ausgabe außerhalb von node_modules verursachte beim Next-Dependency-Tracing den Windows-EPERM-Fehler. Das Datenbankschema selbst wurde nicht geändert; keine Migration ausgeführt.
- Build führt keine Migration mehr als Nebeneffekt aus. Migrationen sind explizit über `pnpm db:migrate` auszuführen. TypeScript-Fehler werden beim Build nicht mehr ignoriert. Die fehlerhafte Pfadzuordnung `@/*` ist korrigiert.
- Veraltete Webpack-Overrides entfernt: deaktivierte Symlinkauflösung vertrug sich nicht mit pnpm. Interner `/audit`-Rechner aus dem Routing entfernt; der bisherige Harness bleibt als Referenzdatei erhalten.
- `FIREHODL_DISABLE_LIVE_DATA=1` ermöglicht eine lokale Prüfung ohne Datenbankzugriff und ohne Kursaktualisierungen. Diese Variable in der Produktionsumgebung nicht aktivieren.

## Prüfung

- Referenzfälle: Monatsenden/Schaltjahr, zwölf statt dreizehn Einzahlungen, Nullfall-Parität aller Strategien, Cashsaldo, Entnahmedeckung und Fehlbeträge, Gebühren über mehrjährige Laufzeit, finanzierte Gebühren, zeitanteilige Gebühren zusätzlicher Auszahlungen, Tagestief-Liquidation, erhaltene Restschuld, Rückzahlung ohne Anschlusskredit und unveränderte Vergangenheit bei veränderten Zukunftskursen.
- Importvalidierung, unveränderter Kursverlauf beim Budgetvergleich, effektiver historischer Startpreis im Stressvergleich, Offline-Nutzung und Öffnen des Journals durch Auswahl eines Ergebnisses.
- Unabhängige Prüfung durchgeführt; Startkursfehler im Stressvergleich, uneinheitliche Verzinsung finanzierter Gebühren, Überbelastung späterer Kreditauszahlungen und versteckte ungültige Kreditfelder korrigiert. Finanzielle Nullfälle gegenprüft.
- Release-Testgruppe: **186 Tests in 18 Dateien bestanden**. Aufruf: `pnpm test:release` (lokal wegen Runtime-Wrapper direkt `node node_modules/vitest/vitest.mjs run src/modules/simulator src/modules/price-data app/api`).
- Typecheck erfolgreich. Produktionsbuild erfolgreich. Kein Datenbankzugriff für diese Nachweise erforderlich.
- Gesamtsuite: 1.155 Tests, 1.069 bestanden, dieselben 86 fehlgeschlagenen Alttests wie vor der Umsetzung. Danach hinzugefügte Tests in der Releasegruppe separat grün. Zusätzlich bestehende Suite-Ladefehler sind noch offen. Die Gesamtsuite ist ausdrücklich nicht grün; die unveränderten Altfehler wurden nicht als Erfolg umgedeutet.
- Browserprüfung: direkter Einstieg, responsive 390px-Ansicht ohne Seitenüberlauf, explizites Speichern/Laden, Stressvergleich, Entnahmeeingabe, Fehler bei fehlender Historie und Tagesjournal. Abschließende Produktionsprüfung siehe Ergänzung unten.
- CI-Datei `.github/workflows/simulator-release.yml` prüft Install mit eingefrorenem Lockfile, Typecheck, Releasegruppe und Build. Es wurden keine Paketversionen oder Lockfiles verändert. Der neue Workflow wurde lokal vorbereitet, noch nicht auf GitHub ausgeführt.

## Noch vor firehodl.com erforderlich

1. Die Betreiberangaben sind bestätigt und umgesetzt. Vor dem Rollout die Datenschutzhinweise mit der tatsächlichen Hostingkonfiguration abgleichen: Vercel ist entsprechend der Repository-Konfiguration angesetzt, nicht das Hetzner-Hosting von nited.ai. Eingesetzte Dienste, Auftragsverarbeitungsbedingungen, internationale Übermittlungen und Protokollaufbewahrung im Zielkonto prüfen. Ein Registereintrag muss nach dessen Erteilung nachgetragen werden; die Quelle nennt derzeit „beantragt“.
2. Preview mit dem vorgesehenen Hosting-Projekt und einer getrennten Testdatenbank prüfen: vorhandene Migrationen, Seed/Backfill, Quellenrechte, Lücken und tatsächlicher Datensatz. Lokale UI-Tests verwenden bewusst keinen Zugriff auf die produktive Datenbank.
3. `DATABASE_URL`, ggf. `DIRECT_URL`, `CRON_SECRET`, Vercel-Cron und GitHub-Secrets `PROD_URL`/`CRON_SECRET` im Zielprojekt prüfen. Datenquellen müssen aus der Hostingregion erreichbar sein. Authentifizierten Cron im Preview testen; nach Rollout Frische und Verlauf kontrollieren. Lokale Auth-/Ausfalltests ersetzen diesen Betriebsnachweis nicht.
4. Produktionsbuild ins Preview bringen, Freigabe anhand des konkreten Previews, danach Domainumschaltung mit vorherigem Deployment als Rollback-Ziel. Es wurde weder gepusht noch deployt.

## Bewusst spätere Ausbaustufen

Rollierende Backtests über viele Startzeitpunkte, zeitlich getrennte Optimierung/Validierung, Sensitivitätsanalysen, statistisch kalibrierte Pfade, Worker für große Versuchsmatrizen, eigene Strategievarianten, echte EUR/USD-Kurse und eine fachlich geprüfte Steuer-/Losrechnung bleiben P2/P3. Jev wurde entsprechend der Analyse nicht in den Rechenkern integriert. Die alte Engine und ihre Tests bleiben im Repository als Referenz, sind aber aus dem öffentlichen Simulator entfernt; deren Bereinigung ist ein eigener Wartungsschritt.

Die erste Beta ist ein nachvollziehbarer Vergleichssimulator. Sie ist noch kein vollständig ausgebautes Forschungsportal und ohne die betrieblichen und redaktionellen Voraussetzungen oben nicht als veröffentlicht zu betrachten.

## Abschließende Produktionsprüfung

- Optimierter Build lokal gestartet; `/`, `/simulation` und `/methodik` erreichbar. Nach Ergänzung der Rechtstexte Build, Typecheck und 186 Release-Tests erneut erfolgreich; `/impressum`, `/datenschutz` und Rückweg zum Simulator im Browser geprüft.
- Echter Dateiimport im Browser: 1 BTC bei 100.000 USD, 1.000 USD Sparrate, ein Monat, flacher Markt, keine Gebühren. HODL und Cashreserve ergeben jeweils exakt 101.000 USD Nettovermögen und 0 USD Gewinn.
- Lokale Vorschau läuft auf `http://127.0.0.1:3100` mit deaktivierten Livekursen. Keine Produktionsdatenbank verwendet. Die Fehlermeldung für nicht verfügbare Kurse ist hier erwartet.
- Betreiberangaben nach Nutzerantwort „So wie nited.ai“ ergänzt. Keine Veröffentlichung erfolgt.
