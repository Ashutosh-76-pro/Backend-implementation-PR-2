# Sprint 1 — Data Foundation

This document captures the Sprint 1 implementation plan and Definition of Done for the NIFTY100 data foundation.

## Goal
Build and validate `nifty100.db` from 12 source files into the required analytical schema. Resolve all CRITICAL data-quality failures before sign-off.

## Deliverables
- `nifty100.db` — populated SQLite database
- `output/load_audit.csv`
- `output/validation_failures.csv`
- `src/etl/loader.py`
- `src/etl/normaliser.py`
- `src/etl/validator.py`
- `db/schema.sql`
- `tests/etl/` — 35+ tests
- `notebooks/exploratory_queries.sql`
- `Makefile` targets: `load`, `ratios`, `test`, `report`, `dashboard`, `api`, `clean`

## Table-count note
The sprint text says 10 tables but explicitly names 11 tables: `companies`, `profitandloss`, `balancesheet`, `cashflow`, `analysis`, `documents`, `prosandcons`, `sectors`, `stock_prices`, `financial_ratios`, `peer_groups`. This repository keeps all 11 named entities until the product owner resolves the count discrepancy.

## Acceptance checks
```sql
SELECT COUNT(*) FROM companies;
PRAGMA foreign_key_check;
```
Expected company count is 92 and the foreign-key check must return zero rows. Load audit must contain zero CRITICAL rejections, 35+ ETL tests must pass, and five randomly reviewed companies must have correct year coverage and normalized values.

## Expected row-count checks
- companies = 92
- profitandloss ≈ 1276
- balancesheet ≈ 1312
- cashflow ≈ 1187
- stock_prices = 5520

## DQ-01 … DQ-16
The validator provides explicit checks for PK uniqueness, `(company_id, year)` uniqueness, FK integrity, balance-sheet balance, OPM cross-checks, positive sales, net cash, tax rate, dividend cap, URL validity, EPS sign, BSE balance, coverage and duplicate/truncation/source consistency checks.

## Reproducibility
Place the 12 source Excel/ODS files under `data/source/` and run `make load`, then `make test` and `make report`. The loader never invents rows; expected counts are validation targets, not fabricated output.
