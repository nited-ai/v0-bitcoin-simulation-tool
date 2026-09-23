# Korrektur: vollständige Szenarien und nachvollziehbare Kreditprüfung

Nutzerfeedback vom 23.09.2026: Der vereinfachte Umbau entfernt entscheidende Funktionen und verschlechtert die UX. Dies korrigiert die bereits autorisierte Umsetzung; keine weitere Reduktion des Produkts.

## Verbindlicher Umfang

- Projektion als eigener Arbeitsbereich: eigener Kurschart, Kursziele zu frei wählbaren Monaten, reproduzierbare tägliche Volatilität und Intraday-Spannen; realisierte Kennzahlen aus dem tatsächlich verwendeten Pfad.
- Bekannte Arbeitsbereiche statt Landing-/Hero- und Kartenraster: Projektion, Strategien und Kredit, Ergebnisse. Gemeinsame Basisdaten bleiben sichtbar. Bestehende Exporte, Journal und rechtliche Seiten bleiben erhalten.
- ATH-DCA und gleitender Durchschnitt als parametrierbare Kaufregeln, mit vorhandenem Cash, begrenzter Kaufgröße und ohne Zukunftswissen. Signal vom vorherigen Schlusskurs, Ausführung am nächsten Tagesbeginn.
- FireHODL-, Firefish-, Strike- und Coinbase-Modellvorlagen, bearbeitbar und als eigene Profile lokal speicherbar. Quellen und Abweichungen von echten Produkten sichtbar. Keine erfundenen aktuellen Zinssätze oder pauschale Gleichsetzung eines Anbieters mit einem Vertrag.
- Kreditbedingungen und Analyse zusammen: mögliche Auszahlung, Zins-/Gebührenlast, tägliches LTV, Liquidationskurs, Puffer, erster Liquidationstag, kritische Ereignisse und explizit fehlende Ereignisse. Keine erfundene Ausfallwahrscheinlichkeit.

## Gestaltung

Bestehende tabbasierte Arbeitslogik wieder aufnehmen. Weißer Arbeitsbereich, graue Trennlinien (#e2e5e9), dunkler Text (#20252d), Bitcoin-Orange (#e87919), Blau für Kurs (#3575ac), Rot ausschließlich für kritische Grenzen (#bf3944). Bestehende lokale Geist-Schrift. Kompakte Werkzeugleiste, großer Kurschart, beschriftete Eingabezeilen, Kennzahlen als zusammenhängende Definitionstabelle. Keine dekorativen Karten, Slogans oder neuen Marketingblöcke.

## Arbeitsschritte / Nachweise

- [x] Pfadgenerator, Szenariokennzahlen, Eingabevalidierung und reproduzierbarer Export mit Referenztests.
- [x] Kaufregeln, offene Laufzeit, tägliche Risikobilanz und Liquidationsnachweise mit Referenztests.
- [x] Projektionseditor, Kreditprofile, Risikochart und tabbasierter Arbeitsablauf.
- [x] Browserprüfung anhand der Nutzerbeispiele: volatiler Verlauf, eigener Crash, ATH-DCA, sichtbare Liquidation; eigene Profile einschließlich Neuladen zusätzlich im UI-Test geprüft; Typecheck, Releasegruppe, Build.
- [x] Unabhängige Abschlussprüfung der Rechen- und UX-Verknüpfung. Fünf konkrete Befunde korrigiert; Nachweise im Auditbericht 2026-09-23-firehodl-projektion-korrektur.md.

Vorheriger Stand bleibt im Arbeitsbaum. Keine Veröffentlichung und kein Austausch mit produktiven Finanzdaten. Altfehler der separaten Legacy-Engine bleiben dokumentiert.
