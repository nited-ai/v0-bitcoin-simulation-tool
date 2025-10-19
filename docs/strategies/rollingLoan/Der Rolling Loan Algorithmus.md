# **Der Rolling Loan Algorithmus: Eine detaillierte Erklärung**

Dieses Dokument beschreibt die Funktionsweise und die zugrundeliegende Logik des Bitcoin Leverage Simulators. Das Ziel der Strategie ist es, durch den gezielten Einsatz von Krediten (Leverage) den eigenen Bitcoin-Bestand über die Zeit zu vermehren, basierend auf der Annahme eines langfristig steigenden Preises.

### **1\. Das Grundprinzip: Hebelwirkung aufbauen**

Die Kernidee ist, einen bereits vorhandenen, wertvollen Vermögenswert (in diesem Fall Bitcoin) als Sicherheit bei einem Kreditgeber zu hinterlegen. Anstatt den Kredit für Konsumausgaben zu nutzen, wird das geliehene Kapital (z.B. Euro) sofort wieder in den Kauf desselben Vermögenswertes (Bitcoin) investiert.

**Der Kreislauf:**

1. **Besitzen:** Sie starten mit einer bestimmten Menge an BTC.  
2. **Beleihen:** Sie nehmen einen Kredit auf, dessen Höhe einem Prozentsatz des aktuellen Wertes Ihrer BTC entspricht (Loan-to-Value oder LTV).  
3. **Investieren:** Sie nutzen das geliehene Geld, um mehr BTC zu kaufen.  
4. **Wiederholen:** Wenn der Wert Ihrer gesamten BTC-Position gestiegen ist, haben Sie mehr potenzielle Sicherheiten. Sie können einen neuen, höheren Kredit aufnehmen, um den alten abzulösen und mit dem Überschuss noch mehr BTC zu kaufen.

Dieser Prozess wird als "Rolling Loan" oder gehebelte Akkumulation bezeichnet. Der Simulator bildet zwei primäre Methoden ab, um diesen Kreislauf zu steuern.

### **2\. Die Zwei Kernstrategien**

Sie können im Simulator zwischen zwei grundlegend verschiedenen Auslösern für die Reinvestition wählen:

#### **Strategie A: Feste Laufzeit (Rollover-Kredit)**

Dies ist der klassische, zeitbasierte Ansatz.

* **Funktionsweise:** Sie definieren eine feste Laufzeit für Ihren Kredit (z.B. 12 Monate). Während dieser Zeit bleibt Ihr Schuldenstand in Euro konstant.  
* **Der Rollover:** Am Ende der Laufzeit wird eine Reinvestition ausgelöst.  
* **Vorteil:** Planbar und einfach zu managen.  
* **Nachteil:** Ineffizient. Sie können zwischen den Terminen nicht auf starke Preissteigerungen reagieren.

#### **Strategie B: Dynamische Kreditlinie (Ziel-LTV)**

Dies ist der flexible, marktorientierte Ansatz und entspricht eher einer modernen Kreditlinie ("Line of Credit").

* **Funktionsweise:** Sie definieren einen **Ziel-LTV** (z.B. 15%). Der Algorithmus prüft nun jeden Monat, ob eine Anpassung nötig ist.  
* **Die Reinvestition:** Der Algorithmus nimmt jeden Monat genau so viel neuen Kredit auf, dass Ihr LTV wieder **exakt auf den Zielwert zurückgesetzt** wird.  
* **Vorteil:** Hocheffizient und reaktionsschnell. Sie nutzen Preissteigerungen sofort aus, um Ihren Hebel konstant zu halten und maximal zu akkumulieren.  
* **Nachteil:** Die Zinsen laufen monatlich auf, was im Simulator korrekt abgebildet wird.

### **3\. Technischer Algorithmus: Schritt-für-Schritt-Ablauf**

#### **Initialisierung (beide Strategien)**

1. **Startwerte festlegen:** Anfangskapital (BTC), Startdatum und alle weiteren Parameter werden aus der Eingabemaske übernommen.  
2. **Startpreis ermitteln:** Der BTC-Preis für das Startdatum wird aus den Preisdaten geladen.  
3. **Ersten Kredit aufnehmen:**  
   * Wert der Sicherheiten \= Anfangskapital (BTC) \* Startpreis  
   * Kreditbetrag \= Wert der Sicherheiten \* Ziel-LTV  
   * Zu investierendes Kapital \= Kreditbetrag \* (1 \- Kreditgebühr)  
   * Gekaufte BTC \= Zu investierendes Kapital / Startpreis  
4. **Startzustand speichern:**  
   * Neuer BTC-Bestand \= Anfangskapital (BTC) \+ Gekaufte BTC  
   * Neuer Schuldenstand \= Kreditbetrag

#### **Strategie A: Feste Laufzeit (Ablauf pro Zyklus)**

Dieser Ablauf wird nur an den vordefinierten Rollover-Terminen (z.B. alle 12 Monate) ausgeführt.

1. **Preis-Update:** Ermittle den BTC-Preis am Rollover-Datum.  
2. **Wert-Update:** Aktueller Wert der Sicherheiten \= BTC-Bestand \* Aktueller Preis.  
3. **Sparrate/Entnahme des Zyklus berechnen:** Summiere alle monatlichen Ein- oder Auszahlungen seit dem letzten Rollover.  
4. **Altschuld berechnen:** Gesamtschuld \= Letzter Schuldenstand \+ (Letzter Schuldenstand \* Jahreszins \* Laufzeit in Jahren).  
5. **Neuen Ziel-Kredit berechnen:** Neuer Ziel-Kredit \= Aktueller Wert der Sicherheiten \* Ziel-LTV.  
6. **Verfügbares Kapital berechnen:** Verfügbares Kapital \= Neuer Ziel-Kredit \- Gesamtschuld.  
7. **Investieren (nur wenn Kapital \> 0):**  
   * Zu investierendes Kapital \= Verfügbares Kapital \* (1 \- Kreditgebühr)  
   * Gekaufte BTC \= Zu investierendes Kapital / Aktueller Preis  
   * Neuer BTC-Bestand \= Alter BTC-Bestand \+ Gekaufte BTC  
8. **Neuen Schuldenstand setzen:** Neuer Schuldenstand \= Neuer Ziel-Kredit.

#### **Strategie B: Dynamische Kreditlinie (Ablauf pro Monat)**

Dieser Ablauf wird für jeden einzelnen Monat der Simulation ausgeführt.

1. **Preis-Update:** Ermittle den BTC-Preis für den aktuellen Monat.  
2. **Zinsen berechnen:** Neuer Schuldenstand \= Alter Schuldenstand \* (1 \+ (Jahreszins / 12)).  
3. **Sparrate/Entnahme anwenden:** Passe den BTC-Bestand basierend auf der monatlichen Rate und dem aktuellen Preis an.  
4. **Wert-Update:** Aktueller Wert der Sicherheiten \= BTC-Bestand \* Aktueller Preis.  
5. **Neuen Ziel-Kredit berechnen:** Neuer Ziel-Kredit \= Aktueller Wert der Sicherheiten \* Ziel-LTV.  
6. **Neuen Kredit aufnehmen:** Aufzunehmender Betrag \= Neuer Ziel-Kredit \- Aktueller Schuldenstand.  
7. **Investieren (nur wenn Betrag \> 0):**  
   * Zu investierendes Kapital \= Aufzunehmender Betrag \* (1 \- Kreditgebühr)  
   * Gekaufte BTC \= Zu investierendes Kapital / Aktueller Preis  
   * Neuer BTC-Bestand \= Alter BTC-Bestand \+ Gekaufte BTC  
8. **Neuen Schuldenstand setzen:** Neuer Schuldenstand \= Neuer Ziel-Kredit.

### **4\. Schlüsselparameter und ihre Bedeutung**

* **Anfangskapital (BTC):** Die Menge an Bitcoin, mit der Sie starten.  
* **Monatliche Sparrate (€):** Ein positiver Wert simuliert monatliche Zukäufe, ein negativer Wert simuliert monatliche Entnahmen.  
* **Jährliche Anpassung der Sparrate (%):** Simuliert die jährliche Steigerung Ihrer Sparrate oder Ihres Kapitalbedarfs.  
* **Jahreszins (%):** Die Kosten für das geliehene Kapital.  
* **Gebühr auf neuen Kredit (%):** Transaktionskosten, die bei jeder neuen Kreditaufnahme anfallen.  
* **Ziel-LTV (%):** Der angestrebte Hebel. Ein höherer LTV bedeutet mehr Risiko, aber auch potenziell schnellere Akkumulation.

### **5\. Das zentrale Risiko: Liquidation**

Beide Strategien funktionieren nur bei langfristig steigenden Preisen. Fällt der Preis, passiert das Gegenteil:

* Der Wert Ihrer Sicherheiten sinkt, aber Ihr Kreditsaldo in Euro bleibt gleich.  
* Dadurch **steigt Ihr LTV** (z.B. von 15% auf 25%).  
* Erreicht der LTV eine kritische Schwelle (im Simulator bei 90%), hat der Kreditgeber das Recht, Ihre Sicherheiten (Ihre BTC) zu verkaufen, um den Kredit zu tilgen. Dies nennt man **Liquidation**.

Der Simulator warnt Sie, wenn dieses Ereignis in der Simulation eintritt.