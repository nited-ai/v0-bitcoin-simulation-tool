import { describe,it,expect } from 'vitest'
import { dailyProjection,projectionPath } from './projectionPath'
import { simulationPlan } from './planAdapter'
import { DEFAULT_PARAMS } from '../types/simulation'
import type { PriceProjectionResult } from '../price-models/types'
import { simulate } from '@/src/modules/simulator/engine'
import { addMonths,DAY,timestamp } from '@/src/modules/simulator/paths'
import { journalCsv } from './resultsExport'
const start = '2026-01-31'
function source(months=2): PriceProjectionResult {
  return {modelName:'manual',modelVersion:'1',projectionPoints:Array.from({length:months+1},(_,i)=>({timestamp:timestamp(addMonths(start,i)),price:100000,confidence:0})),metadata:{totalMonths:months,totalGrowth:0,averageMonthlyGrowth:0,confidence:0,generatedAt:''}}
}
describe('Original UI → projection → daily investment engine',()=>{
  it('interpolates daily across unequal calendar months without shifting anchors',()=>{
    const p=source();p.projectionPoints[1].price=50000
    const daily=dailyProjection(p);const path=projectionPath(daily)
    expect(path).toHaveLength(60)
    expect(path[28].date).toBe('2026-02-28');expect(path[28].close).toBe(50000)
    expect(path.at(-1)?.date).toBe('2026-03-31')
    expect(path[14].close).toBeCloseTo(100000*Math.sqrt(.5))
    expect(path[14].low).toBeLessThanOrEqual(path[14].close)
  })
  it('preserves replay OHLC and rejects impossible candles',()=>{
    const p=source(1);p.projectionPoints=Array.from({length:29},(_,i)=>({timestamp:timestamp(start)+i*DAY,price:100000,confidence:0,metadata:{open:100000,high:110000,low:80000}}))
    const daily=dailyProjection(p)
    expect(daily.metadata.candleKind).toBe('cycle-replay');expect(projectionPath(daily)[10].low).toBe(80000)
    p.projectionPoints[10].metadata!.low=120000
    expect(()=>dailyProjection(p)).toThrow('Tagesgrenzen')
  })
  it('a flashcrash changes liquidation while leaving monthly closing prices unchanged',()=>{
    const base=dailyProjection(source());const stress=dailyProjection(source(),{enabled:true,month:1,dropPercent:90})
    const params={...DEFAULT_PARAMS,initialBtcPrice:100000,simulationMonths:2,annualInterestRate:0,originationFeePercent:0,research:{autoTopUp:false,contribution:0,tradingFee:0}}
    const plan=simulationPlan(params,base,[])
    const clean=simulate(plan,projectionPath(base),'loan');const crashed=simulate(plan,projectionPath(stress),'loan')
    expect(crashed.firstLiquidation).toBe('2026-02-28');expect(clean.firstLiquidation).toBeNull()
    expect(stress.projectionPoints.map(p=>p.price)).toEqual(base.projectionPoints.map(p=>p.price))
    expect(crashed.journal[28].low).toBeCloseTo(10000)
    expect(crashed.journal[28].freeBtc).toBeGreaterThan(0)
    expect(journalCsv(crashed,plan)).toContain('Liquidation am Tagestief')
  })
  it('all strategies receive the same initial assets and contributions, with no t0 rate',()=>{
    const p=dailyProjection(source());const params={...DEFAULT_PARAMS,simulationMonths:2,research:{initialCash:1000,contribution:200,withdrawal:0}}
    const plan=simulationPlan(params,p,[]);const path=projectionPath(p)
    for(const strategy of ['hold','ath-dca','credit','loan'] as const){const r=simulate(plan,path,strategy);expect(r.contributions).toBe(400);expect(r.journal[0].contribution).toBe(0)}
  })
  it('uses only contiguous pre-start history for MA and never future ATH',()=>{
    const p=dailyProjection(source());const history=[-3,-1,0,1].map(i=>({time:(timestamp(start)+i*DAY)/1000,date:'',open:100,close:100+i,high:i>=0?999999:200,low:50}))
    const plan=simulationPlan(DEFAULT_PARAMS,p,history)
    expect(plan.warmupCloses).toEqual([99]);expect(plan.referenceAth).toBe(100000)
    const stale=simulationPlan(DEFAULT_PARAMS,p,history.slice(0,1));expect(stale.warmupCloses).toEqual([])
  })
  it('rejects truncated paths, invalid stress dates and nonfinite prices',()=>{
    const p=source();p.projectionPoints.pop();expect(()=>dailyProjection(p)).toThrow('Simulationszeitraum')
    expect(()=>dailyProjection(source(),{enabled:true,month:3,dropPercent:90})).toThrow('Flashcrash')
    const invalid=source();invalid.projectionPoints[1].price=Infinity;expect(()=>dailyProjection(invalid)).toThrow('Projektionspunkte')
  })
})
