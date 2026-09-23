import { render,screen,fireEvent } from '@testing-library/react'
import { beforeEach,it,expect } from 'vitest'
import { SimulationProvider,useSimulation } from '../context/SimulationContext'
import { useRef } from 'react'
import { PARAMS_STORAGE_KEY } from '../types/simulation'
function Probe() {
  const {params,setParams}=useSimulation()
  const initial=useRef(params)
  return <><button onClick={()=>setParams(p=>({...p,research:{initialCash:5000},stress:{enabled:true,month:1,dropPercent:90}}))}>Change</button><button onClick={()=>setParams(initial.current)}>Restore</button><output>{params.research?.initialCash??0}:{String(params.stress?.enabled??false)}</output></>
}
beforeEach(()=>localStorage.removeItem(PARAMS_STORAGE_KEY))
it('restores a saved scenario even when only optional strategy/stress fields disappear',()=>{
  render(<SimulationProvider><Probe/></SimulationProvider>)
  fireEvent.click(screen.getByText('Change'));expect(screen.getByText('5000:true')).toBeTruthy()
  fireEvent.click(screen.getByText('Restore'));expect(screen.getByText('0:false')).toBeTruthy()
})
