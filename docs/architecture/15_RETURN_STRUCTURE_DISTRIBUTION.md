# Return Structure Distribution Engine

The Return Structure Distribution Engine is the **single source of truth** for allocating the Investor Profit Pool among participating investors.

## When it runs

Only after the mandatory upstream steps complete:

1. Gross Trading Profit
2. RyvonX Platform Service Fee (2.5%)
3. Net Distributable Profit
4. Pool Manager Share
5. Investor Profit Pool (remainder)

## Configuration

Pools define their Return Structure in `funds.return_tiers`:

```json
[
  { "minAmount": 100, "maxAmount": 499, "returnPct": 8 },
  { "minAmount": 500, "maxAmount": 999, "returnPct": 12 },
  { "minAmount": 1000, "maxAmount": null, "returnPct": 18 }
]
```

Managed in the pool form under **Return Structure** (`PmReturnTiersEditor`).

## Allocation formula

For each settled investor allocation:

```
tier           = resolveReturnTier(investmentAmount, returnStructure)
returnMultiplier = tier.returnPct / 100   (or 1.0 if no tiers / no match)
allocationWeight = investmentAmount × returnMultiplier
allocationPct  = allocationWeight / sum(allocationWeights)
profitShare    = investorProfitPool × allocationPct
```

## Extensibility

The engine accepts a generic `ReturnTier[]` structure. Future allocation rules (custom multipliers, bonus tiers, loyalty weighting) can extend `computeAllocationWeight()` without changing the settlement sequence or ledger workflow.

## Implementation

| File | Exports |
|------|---------|
| `src/lib/financial/return-structure-distribution.ts` | `distributeInvestorProfitPool`, `resolveReturnTier`, `computeAllocationWeight` |
| `src/lib/financial/profit-distribution-calculator.ts` | `calculateProfitDistribution` — orchestrates full sequence |

## Related

- [14_PROFIT_DISTRIBUTION.md](./14_PROFIT_DISTRIBUTION.md) — full settlement workflow
- [13_POOL_CYCLE_OWNERSHIP.md](./13_POOL_CYCLE_OWNERSHIP.md) — pool-owned cycles and config snapshots
