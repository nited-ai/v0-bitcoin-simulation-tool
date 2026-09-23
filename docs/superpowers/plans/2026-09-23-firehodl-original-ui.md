# Original FireHODL wieder als Produktbasis

Verbindliche Korrektur des Nutzers vom 23.09.2026: Die tatsächlich auf firehodl.com vorhandene Oberfläche weiterentwickeln. Der Ersatz in SimulatorWorkspace ist abgelehnt. Frühere Layoutentscheidungen sind damit überholt.

1. Vorhandene SimulationPage mit i18n, Theme, Parametern, Plattform-Presets, Projektion, Strategie und Ergebnissen direkt unter / wieder einsetzen; /simulation kompatibel halten. Keine erneute Neugestaltung.
2. Projektionsdatenfluss vereinheitlichen: Chart, Kennzahlen und Berechnung müssen dieselben Einstellungen und Startkurse erhalten. Manuelle Eingaben bei Datenupdates erhalten.
3. Historische Zykluswiederholung nachvollziehbar machen: reale Referenzzeiträume und Phasen, Tagesdaten, korrekte Zeitachse, nur wirksame Parameter. Kein Zufalls-Seed in der Oberfläche, keine erfundene Prognosesicherheit. Manuelle Jahresszenarien und Power Law behalten.
4. Fachliche Grenzen der alten Ergebnisberechnung offen ausweisen; die Tests des separaten neuen Motors zertifizieren diese nicht. Methodik an die aktive Oberfläche anpassen.
5. Relevante Rechen-/UI-Tests, Typecheck, Build und Browservergleich zur Live-Version. Unabhängige abschließende Prüfung gemäß executing-plans.

Ruling: Die Wiederherstellung der vertrauten Oberfläche ist jetzt die Basis. Keine Löschung des bereits getesteten separaten Motors und keine Veröffentlichung ungeprüfter Legacy-Ergebnisse. Eine komplette Migration sämtlicher alter Strategien ist ein eigener, noch offener Arbeitsschritt.
