-- 1 Company count
SELECT COUNT(*) FROM companies;
-- 2 Sector distribution
SELECT s.sector_name,COUNT(*) FROM companies c LEFT JOIN sectors s USING(sector_id) GROUP BY s.sector_name ORDER BY COUNT(*) DESC;
-- 3 Revenue trend
SELECT year,AVG(sales) FROM profitandloss GROUP BY year ORDER BY year;
-- 4 Highest OPM
SELECT c.company_name,p.year,p.opm FROM profitandloss p JOIN companies c USING(company_id) WHERE p.opm IS NOT NULL ORDER BY p.opm DESC LIMIT 20;
-- 5 <5 years coverage
SELECT c.company_name,COUNT(*) years FROM companies c JOIN profitandloss p USING(company_id) GROUP BY c.company_id HAVING years<5;
-- 6 Balance exceptions
SELECT company_id,year,ROUND(100.0*ABS(assets-(liabilities+equity))/NULLIF(ABS(assets),0),2) diff_pct FROM balancesheet WHERE assets IS NOT NULL ORDER BY diff_pct DESC LIMIT 25;
-- 7 Net cash leaders
SELECT c.company_name,b.year,b.cash-b.debt net_cash FROM balancesheet b JOIN companies c USING(company_id) WHERE b.cash IS NOT NULL AND b.debt IS NOT NULL ORDER BY net_cash DESC LIMIT 20;
-- 8 Stock coverage
SELECT company_id,COUNT(*) price_rows,MIN(trade_date),MAX(trade_date) FROM stock_prices GROUP BY company_id;
-- 9 EPS/dividend
SELECT c.company_name,p.year,p.eps,p.dividend FROM profitandloss p JOIN companies c USING(company_id) WHERE p.eps IS NOT NULL ORDER BY p.dividend DESC LIMIT 25;
-- 10 FK check
PRAGMA foreign_key_check;
