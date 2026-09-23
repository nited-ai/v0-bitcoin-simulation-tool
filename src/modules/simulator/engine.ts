import {
  Plan,
  PriceDay,
  StrategyId,
  SimulationResult,
  JournalRow,
  STRATEGIES,
} from "./types";
import {
  addMonths,
  buildPath,
  DAY,
  timestamp,
  validatePath,
  validatePlan,
} from "./paths";

/** Generic collateral loan model. No provider terms or future prices are inferred. */
export function simulate(
  plan: Plan,
  path: PriceDay[],
  strategy: StrategyId,
): SimulationResult {
  validatePlan(plan);
  validatePath(path, plan);
  if (!STRATEGIES.some((s) => s.id === strategy))
    throw new Error("Unbekannte Strategie.");
  const startPrice = path[0].close;
  const startingWealth = plan.initialCash + plan.initialBtc * startPrice;
  let btc = plan.initialBtc,
    cash = plan.initialCash,
    debt = 0,
    principal = 0;
  let maturity = "",
    creditStopped = false,
    liquidations = 0,
    maxLtv = 0;
  let contributions = 0,
    withdrawn = 0,
    requested = 0,
    shortfall = 0,
    firstShortfall: string | null = null;
  let totalFees = 0,
    totalInterest = 0,
    twrIndex = 1,
    peakIndex = 1,
    maxDrawdown = 0;
  let previousWealth = startingWealth;
  let returnMetricsValid = startingWealth > 0;
  const feeRate = plan.tradingFee / 100;
  const explicitCollateral = plan.collateralLtv !== undefined;
  const pledgeTarget = Math.min(plan.collateralLtv ?? plan.maxLtv, plan.maxLtv);
  let pledgedBtc = 0;
  const collateral = () => (explicitCollateral ? pledgedBtc : btc);
  const loanFeeRate =
    (plan.originationFee / 100) * (plan.feeAnnual ? plan.loanTerm / 12 : 1);
  const anniversaries = new Map(
    Array.from({ length: plan.months }, (_, i) => [
      addMonths(plan.startDate, i + 1),
      i + 1,
    ]),
  );
  const journal: JournalRow[] = [];
  let knownAth = Math.max(startPrice, plan.referenceAth ?? 0);
  const maDays = plan.maDays ?? 200;
  const precedingCloses = (plan.warmupCloses ?? []).slice(-maDays);
  let closeSum = precedingCloses.reduce((sum, close) => sum + close, 0);
  let firstLiquidation: string | null = null;
  for (let index = 0; index < path.length; index++) {
    const day = path[index],
      price = day.close;
    const month = anniversaries.get(day.date);
    let fees = 0,
      interest = 0,
      contribution = 0,
      desired = 0,
      paid = 0;
    const events: string[] = [];
    let boughtBtc = 0,
      purchaseValue = 0,
      triggerLtv = 0,
      topUpBtc = 0;
    let liquidationPrice: number | null = null;
    let buyThreshold: number | null = null;
    const buy = (amount: number, executionPrice = price) => {
      const gross = Math.min(cash, Math.max(0, amount));
      const units = (gross * (1 - feeRate)) / executionPrice;
      btc += units;
      boughtBtc += units;
      purchaseValue += gross * (1 - feeRate);
      cash -= gross;
      fees += gross * feeRate;
    };
    const sell = (
      netAmount: number,
      executionPrice = price,
      rate = feeRate,
      unrestricted = false,
    ) => {
      const free = unrestricted
        ? btc
        : explicitCollateral
          ? Math.max(0, btc - pledgedBtc)
          : Math.max(0, btc - debt / (executionPrice * plan.maxLtv));
      const units = Math.min(
        free,
        Math.max(0, netAmount) / (executionPrice * (1 - rate)),
      );
      const gross = units * executionPrice;
      btc = Math.max(0, btc - units);
      pledgedBtc = Math.min(pledgedBtc, btc);
      cash += gross * (1 - rate);
      fees += gross * rate;
    };
    const payDebt = () => {
      const amount = Math.min(cash, debt);
      debt -= amount;
      cash -= amount;
      principal = Math.min(principal, debt);
      if (debt < 1e-8) {
        debt = 0;
        principal = 0;
        maturity = "";
        pledgedBtc = 0;
      }
    };
    const drawFeeRate = () =>
      plan.feeAnnual && maturity
        ? ((plan.originationFee / 100) *
            Math.max(0, timestamp(maturity) - timestamp(day.date))) /
          DAY /
          365.25
        : loanFeeRate;
    const debtLimit = () =>
      Math.min(
        btc * price * (strategy === "credit" ? plan.loanLtv : plan.maxLtv),
        explicitCollateral ? btc * price * pledgeTarget : Infinity,
        plan.maxLoanAmount ?? Infinity,
      );
    const borrowCapacity = () =>
      creditStopped || plan.loanLtv === 0
        ? 0
        : Math.max(0, debtLimit() - debt) / (1 + drawFeeRate());
    const pledgeForDebt = () => {
      if (explicitCollateral)
        pledgedBtc = Math.min(
          btc,
          Math.max(pledgedBtc, debt / (price * pledgeTarget)),
        );
    };
    const borrow = (amount: number) => {
      const capacity = borrowCapacity();
      const drawn = Math.min(Math.max(0, amount), capacity);
      if (drawn <= 1e-8) return;
      const fee = drawn * drawFeeRate();
      cash += drawn;
      principal += drawn + fee;
      debt += drawn + fee;
      fees += fee;
      pledgeForDebt();
      if (!maturity && !plan.openEnded)
        maturity = addMonths(day.date, plan.loanTerm);
      events.push("Kreditaufnahme");
    };
    // Opening purchases see only completed candles and cash held before today's close.
    if (index > 0) {
      knownAth = Math.max(knownAth, path[index - 1].high);
      precedingCloses.push(path[index - 1].close);
      closeSum += path[index - 1].close;
      if (precedingCloses.length > maDays) closeSum -= precedingCloses.shift()!;
    }
    const previousClose = precedingCloses.at(-1);
    if (strategy === "ath-dca" && index > 0)
      buyThreshold = knownAth * (1 - (plan.dipPercent ?? 50) / 100);
    if (strategy === "ma-dca" && precedingCloses.length >= maDays)
      buyThreshold = (closeSum / maDays) * (1 - (plan.maDiscount ?? 0) / 100);
    if (
      buyThreshold !== null &&
      previousClose !== undefined &&
      previousClose <= buyThreshold &&
      ((plan.buyFrequency ?? "daily") === "daily" || month !== undefined)
    ) {
      buy(
        Math.min((cash * (plan.buyFraction ?? 100)) / 100, plan.buyMax ?? 1e10),
        day.open,
      );
      if (boughtBtc > 0)
        events.push(
          strategy === "ath-dca"
            ? "ATH-Regelkauf am Tagesbeginn"
            : "Durchschnitt-Regelkauf am Tagesbeginn",
        );
    }
    if (index === 0) {
      // Explicit credit is sized and secured against the existing BTC stack.
      // Starting cash and the advance are invested only after the initial draw.
      if (strategy === "hold" || (strategy === "loan" && !explicitCollateral))
        buy(cash);
      if (strategy === "staged") buy(plan.initialCash / plan.entryMonths);
      if (strategy === "loan") {
        borrow(btc * price * plan.loanLtv);
        buy(cash);
      }
      events.push("Start");
    } else {
      // Daily simple accrual. Unpaid debt is never silently forgiven.
      interest = (principal * plan.annualInterest) / 100 / 365;
      debt += interest;
      if (debt > 0 && collateral() > 0) {
        // Ideal immediate execution: free BTC can be posted as prices fall,
        // before evaluating liquidation at the daily low. No close cash is used.
        if (
          explicitCollateral && plan.autoTopUp &&
          debt / (pledgedBtc * day.low) > plan.maxLtv
        ) {
          topUpBtc = Math.min(
            Math.max(0, btc - pledgedBtc),
            Math.max(0, debt / (day.low * pledgeTarget) - pledgedBtc),
          );
          pledgedBtc += topUpBtc;
          if (topUpBtc > 0)
            events.push("Nachbesicherung (sofortige Ausführung angenommen)");
        }
        const ltv = debt / (collateral() * day.low);
        triggerLtv = ltv;
        liquidationPrice = debt / (collateral() * plan.liquidationLtv);
        maxLtv = Math.max(maxLtv, ltv);
        if (ltv >= plan.liquidationLtv) {
          if (explicitCollateral) {
            const gross = pledgedBtc * day.low;
            btc = Math.max(0, btc - pledgedBtc);
            pledgedBtc = 0;
            const fee = (gross * plan.liquidationFee) / 100;
            cash += gross - fee;
            fees += fee;
          } else sell(Number.MAX_VALUE, day.low, plan.liquidationFee / 100, true);
          payDebt();
          creditStopped = true;
          liquidations++;
          firstLiquidation ??= day.date;
          events.push("Liquidation am Tagestief");
        }
      }
      if (maturity && day.date >= maturity && debt > 0 && !creditStopped) {
        const rolloverFee = debt * loanFeeRate;
        if (plan.refinance && debt + rolloverFee <= debtLimit()) {
          debt += rolloverFee;
          fees += rolloverFee;
          principal = debt;
          pledgeForDebt();
          maturity = addMonths(day.date, plan.loanTerm);
          events.push("Refinanzierung (angenommen)");
          if (strategy === "loan") {
            borrow(Math.max(0, btc * price * plan.loanLtv - debt));
            buy(cash);
          }
        } else {
          sell(Math.max(0, debt - cash), price, feeRate, true);
          payDebt();
          creditStopped = true;
          events.push("Kreditfälligkeit: Rückzahlung / Verkauf");
        }
      }
    }
    if (month !== undefined) {
      contribution =
        plan.contribution *
        Math.pow(
          1 + plan.contributionIncrease / 100,
          Math.floor((month - 1) / 12),
        );
      cash += contribution;
      contributions += contribution;
      if (contribution > 0) events.push("Sparrate");
      if (creditStopped && debt > 0) payDebt();
      if (month >= plan.withdrawalStart) {
        desired =
          plan.withdrawal *
          Math.pow(
            1 + plan.inflation / 100,
            (timestamp(day.date) - timestamp(plan.startDate)) / DAY / 365.25,
          );
        requested += desired;
        if (strategy === "credit") {
          // Borrow only the missing spending cash, under the user-selected debt limit.
          borrow(Math.max(0, desired - cash));
        } else sell(Math.max(0, desired - cash));
        paid = Math.min(desired, cash);
        cash -= paid;
        withdrawn += paid;
        const missing = Math.max(0, desired - paid);
        shortfall += missing;
        if (missing > 0.01 && !firstShortfall) firstShortfall = day.date;
        if (desired > 0)
          events.push(
            missing > 0.01 ? "Entnahme nicht vollständig gedeckt" : "Entnahme",
          );
      }
      if (strategy === "hold" || strategy === "loan") buy(cash);
      if (strategy === "staged")
        buy(
          Math.max(0, contribution - paid) +
            (month < plan.entryMonths
              ? plan.initialCash / plan.entryMonths
              : 0),
        );
    }
    if (strategy === "rebalance" && (index === 0 || month !== undefined)) {
      const total = btc * price + cash;
      const difference = total * plan.btcWeight - btc * price;
      if (difference > 0)
        buy(difference / (1 - feeRate * (1 - plan.btcWeight)));
      else sell((-difference * (1 - feeRate)) / (1 - plan.btcWeight * feeRate));
      events.push("Rebalancing");
    }
    const endLtv =
      collateral() > 0 ? debt / (collateral() * price) : debt > 0 ? Infinity : 0;
    if (!events.includes("Liquidation am Tagestief"))
      liquidationPrice =
        debt > 0 && collateral() > 0
          ? debt / (collateral() * plan.liquidationLtv)
          : null;
    const netWorth = btc * price + cash - debt;
    const realNetWorth =
      netWorth / Math.pow(1 + plan.inflation / 100, index / 365.25);
    const adjusted = netWorth - contribution + paid;
    // Retain legacy numeric indices, but never present them as valid percentage
    // metrics without initial capital or after nonpositive equity.
    if (
      netWorth <= 0 || adjusted < 0 ||
      (previousWealth <= 0 && (contribution > 0 || paid > 0))
    )
      returnMetricsValid = false;
    if (previousWealth > 1e-8) {
      twrIndex *= Math.max(0, adjusted / previousWealth);
      peakIndex = Math.max(peakIndex, twrIndex);
      maxDrawdown = Math.max(maxDrawdown, 1 - twrIndex / peakIndex);
    }
    previousWealth = netWorth;
    maxLtv = Math.max(maxLtv, collateral() > 0 ? endLtv : 0);
    totalFees += fees;
    totalInterest += interest;
    journal.push({
      date: day.date,
      price,
      btc,
      cash,
      debt,
      netWorth,
      realNetWorth,
      contribution,
      requested: desired,
      paid,
      shortfall: Math.max(0, desired - paid),
      fees,
      interest,
      event: events.join("; "),
      low: day.low,
      ltv: endLtv,
      triggerLtv,
      liquidationPrice,
      borrowCapacity: borrowCapacity(),
      boughtBtc,
      purchasePrice: boughtBtc > 0 ? purchaseValue / boughtBtc : null,
      signalAth: knownAth,
      buyThreshold,
      ...(explicitCollateral
        ? {
            collateralBtc: pledgedBtc,
            freeBtc: Math.max(0, btc - pledgedBtc),
            topUpBtc,
          }
        : {}),
    });
  }
  const last = journal.at(-1)!;
  return {
    strategy,
    finalBtc: btc,
    finalCash: cash,
    finalDebt: debt,
    finalNetWorth: last.netWorth,
    realNetWorth: last.realNetWorth,
    netBtcEquivalent: last.netWorth / last.price,
    contributions,
    withdrawn,
    requested,
    shortfall,
    firstShortfall,
    fees: totalFees,
    interest: totalInterest,
    profit: last.netWorth + withdrawn - startingWealth - contributions,
    maxDrawdown,
    timeWeightedReturn: twrIndex - 1,
    returnMetricsValid,
    maxLtv,
    liquidations,
    firstLiquidation,
    journal,
  };
}

export function compareStress(plan: Plan, strategies: StrategyId[]) {
  return (["growth", "flat", "early-crash", "late-crash", "bear"] as const).map(
    (kind) => {
      const scenario = {
        kind,
        growth: 10,
        crashPercent: 70,
        cycleDamping: 0.5,
      };
      const path = buildPath(plan, scenario, []);
      // The stress grid needs aggregates only, not thirty retained daily journals.
      return {
        kind,
        results: strategies.map((id) => ({
          ...simulate(plan, path, id),
          journal: [],
        })),
      };
    },
  );
}
