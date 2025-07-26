import BitcoinSimulator from "../simulation"

/**
 * Temporary route to test the new modular simulation structure
 * 
 * Access via: http://localhost:3000/simulation-new
 * 
 * This allows us to test the new modular components alongside
 * the existing monolithic version for comparison.
 */
export default function NewSimulationPage() {
  return <BitcoinSimulator />
}
