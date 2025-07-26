# 🚀 Migration Phase 1: Core Refactoring

## 📋 **Ziele**
- Aufteilen der monolithischen simulation.tsx in kleinere Komponenten
- State Management mit Context API
- Business Logic in Custom Hooks auslagern
- Grundlegende UI-Komponenten erstellen

## 🔧 **Schritt-für-Schritt Anleitung**

### **Schritt 1: Ordnerstruktur erstellen**
```bash
mkdir -p app/simulation/{components,hooks,context,services,types}
mkdir -p app/simulation/components/{parameters,results,charts,layout}
mkdir -p app/strategies/{shared,registry}
mkdir -p shared/{ui,hooks,utils,types}
```

### **Schritt 2: Basis-Komponenten extrahieren**

#### **2.1 BasicParametersCard.tsx**
```typescript
// app/simulation/components/parameters/BasicParametersCard.tsx
export function BasicParametersCard() {
  // Extrahiere Zeilen 549-734 aus simulation.tsx
  // Fokus: BTC Amount, Initial Price, Loan Term, etc.
}
```

#### **2.2 ResultsSummary.tsx**
```typescript
// app/simulation/components/results/ResultsSummary.tsx
export function ResultsSummary() {
  // Extrahiere Zeilen 1287-1333 aus simulation.tsx
  // Fokus: Summary Cards mit Key Metrics
}
```

#### **2.3 SimulationHeader.tsx**
```typescript
// app/simulation/components/layout/SimulationHeader.tsx
export function SimulationHeader() {
  // Extrahiere Zeilen 524-537 aus simulation.tsx
  // Fokus: Title, Description, Controls
}
```

### **Schritt 3: State Management**

#### **3.1 SimulationContext.tsx**
```typescript
// app/simulation/context/SimulationContext.tsx
interface SimulationContextType {
  params: SimulationParams
  setParams: (params: SimulationParams) => void
  results: MonthlyResult[]
  setResults: (results: MonthlyResult[]) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  errors: string[]
  setErrors: (errors: string[]) => void
}

export const SimulationContext = createContext<SimulationContextType>()
export const useSimulation = () => useContext(SimulationContext)
```

#### **3.2 Custom Hooks**
```typescript
// app/simulation/hooks/useSimulationState.ts
export function useSimulationState() {
  // Extrahiere State Logic aus simulation.tsx
  // Zeilen 150-175 (useState calls)
}

// app/simulation/hooks/useHistoricalData.ts
export function useHistoricalData() {
  // Extrahiere Zeilen 331-381 aus simulation.tsx
  // Fokus: Data Loading und Caching
}

// app/simulation/hooks/usePriceGeneration.ts
export function usePriceGeneration() {
  // Extrahiere Zeilen 218-277 aus simulation.tsx
  // Fokus: Chart Data Generation
}
```

### **Schritt 4: Shared UI Components**

#### **4.1 NumberInput.tsx**
```typescript
// shared/ui/forms/NumberInput.tsx
interface NumberInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  error?: string
  warning?: string
  disabled?: boolean
}

export function NumberInput(props: NumberInputProps) {
  // Wiederverwendbare Number Input mit Validation
}
```

#### **4.2 LoadingSpinner.tsx**
```typescript
// shared/ui/layout/LoadingSpinner.tsx
export function LoadingSpinner({ message }: { message?: string }) {
  // Zentraler Loading Spinner
}
```

### **Schritt 5: Migration Checklist**

#### **Woche 1:**
- [ ] Ordnerstruktur erstellen
- [ ] BasicParametersCard extrahieren
- [ ] RiskManagementCard extrahieren
- [ ] SimulationHeader extrahieren
- [ ] SimulationContext erstellen
- [ ] useSimulationState Hook erstellen

#### **Woche 2:**
- [ ] ResultsSummary extrahieren
- [ ] ResultsTable extrahieren
- [ ] PriceChart extrahieren
- [ ] useHistoricalData Hook erstellen
- [ ] usePriceGeneration Hook erstellen
- [ ] Shared UI Components erstellen
- [ ] Erste Tests schreiben

### **Schritt 6: Validierung**

#### **6.1 Funktionalität testen**
```bash
npm run dev
# Alle bestehenden Features sollten funktionieren
# Keine Breaking Changes
```

#### **6.2 Performance messen**
```typescript
// Vor Migration: simulation.tsx (1555 Zeilen)
// Nach Migration: SimulationPage.tsx (~40 Zeilen) + Komponenten

// Bundle Size sollte gleich oder kleiner sein
// Loading Performance sollte besser sein
```

### **Schritt 7: Dokumentation**

#### **7.1 Component Documentation**
```typescript
// Jede neue Komponente braucht:
/**
 * Component Description
 * @param props - Component props
 * @returns JSX Element
 * 
 * @example
 * <BasicParametersCard 
 *   params={params} 
 *   onChange={setParams} 
 * />
 */
```

#### **7.2 Migration Guide**
- Dokumentiere alle Änderungen
- Erstelle Upgrade Guide für Entwickler
- Aktualisiere README.md

## 🎯 **Erfolgskriterien Phase 1**

- ✅ simulation.tsx ist unter 200 Zeilen
- ✅ Mindestens 5 neue Komponenten erstellt
- ✅ State Management mit Context
- ✅ 3+ Custom Hooks implementiert
- ✅ Alle bestehenden Features funktionieren
- ✅ Keine Performance-Regression
- ✅ Grundlegende Tests vorhanden

## 🚀 **Vorbereitung für Phase 2**

Nach Phase 1 haben wir:
- Saubere Komponentenstruktur
- Zentrales State Management
- Wiederverwendbare UI Components
- Solide Basis für Strategy-Isolation

**Nächster Schritt:** Strategy-Module isolieren und Plugin-System implementieren!
