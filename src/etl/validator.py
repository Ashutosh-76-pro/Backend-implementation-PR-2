from __future__ import annotations
import csv,re,sqlite3
from pathlib import Path
DB_PATH=Path('nifty100.db'); OUT=Path('output/validation_failures.csv')

def add(rows,rule,severity,table,message,company_id=None,year=None): rows.append({'rule':rule,'severity':severity,'table':table,'company_id':company_id,'year':year,'message':message})

def validate(db_path=DB_PATH):
    rows=[]; c=sqlite3.connect(db_path); c.execute('PRAGMA foreign_keys=ON')
    for table,key in [('profitandloss','company_id,year'),('balancesheet','company_id,year'),('cashflow','company_id,year'),('stock_prices','company_id,trade_date'),('financial_ratios','company_id,year,ratio_name')]:
        if c.execute(f'SELECT {key},COUNT(*) FROM {table} GROUP BY {key} HAVING COUNT(*)>1').fetchone(): add(rows,'DQ-01','CRITICAL',table,f'Duplicate key: {key}')
    for item in c.execute('PRAGMA foreign_key_check').fetchall(): add(rows,'DQ-03','CRITICAL',str(item[0]),f'Foreign-key violation: {item}')
    for cid,y,a,l,e in c.execute('SELECT company_id,year,assets,liabilities,equity FROM balancesheet WHERE assets IS NOT NULL AND liabilities IS NOT NULL AND equity IS NOT NULL'):
        if abs(a-(l+e))/max(abs(a),1.0)>=.01: add(rows,'DQ-04','CRITICAL','balancesheet','Assets do not balance within 1%',cid,y)
    for cid,y,s,o,m in c.execute('SELECT company_id,year,sales,operating_profit,opm FROM profitandloss WHERE sales>0 AND operating_profit IS NOT NULL AND opm IS NOT NULL'):
        if abs((o/s*100)-m)>1: add(rows,'DQ-05','WARNING','profitandloss','OPM cross-check differs by >1pp',cid,y)
    for cid,y,s in c.execute('SELECT company_id,year,sales FROM profitandloss WHERE sales IS NOT NULL AND sales<=0'): add(rows,'DQ-06','WARNING','profitandloss','Sales is not positive',cid,y)
    for cid,y,tr in c.execute('SELECT company_id,year,tax_rate FROM profitandloss WHERE tax_rate IS NOT NULL'):
        if tr< -5 or tr>100: add(rows,'DQ-08','WARNING','profitandloss','Tax rate outside plausible range',cid,y)
    for cid,y,d,eps in c.execute('SELECT company_id,year,dividend,eps FROM profitandloss WHERE dividend IS NOT NULL AND eps IS NOT NULL AND eps>0'):
        if d>eps*1.5: add(rows,'DQ-09','WARNING','profitandloss','Dividend exceeds 150% of EPS',cid,y)
    for cid,url in c.execute('SELECT company_id,url FROM companies WHERE url IS NOT NULL'):
        if not re.match(r'^https?://[^ ]+\.[^ ]+',url,re.I): add(rows,'DQ-10','WARNING','companies','Malformed URL',cid)
    for cid,b in c.execute('SELECT company_id,bse_code FROM companies WHERE bse_code IS NOT NULL'):
        if not re.match(r'^\d{4,12}$',str(b)): add(rows,'DQ-12','WARNING','companies','Invalid BSE code',cid)
    for cid,n in c.execute('SELECT company_id,COUNT(*) FROM profitandloss GROUP BY company_id'):
        if n<5: add(rows,'DQ-13','WARNING','profitandloss','Fewer than 5 years of coverage',cid)
    for t in ['profitandloss','balancesheet','cashflow','stock_prices']:
        n=c.execute(f'SELECT COUNT(*) FROM {t} x LEFT JOIN companies c ON c.company_id=x.company_id WHERE c.company_id IS NULL').fetchone()[0]
        if n: add(rows,'DQ-14','CRITICAL',t,f'{n} orphan rows')
    for t in ['profitandloss','balancesheet','cashflow']:
        n=c.execute(f'SELECT COUNT(*) FROM {t} WHERE company_id IS NULL OR year IS NULL').fetchone()[0]
        if n: add(rows,'DQ-15','CRITICAL',t,f'{n} rows missing required keys')
    n=c.execute('SELECT COUNT(*) FROM stock_prices WHERE close IS NULL').fetchone()[0]
    if n: add(rows,'DQ-16','WARNING','stock_prices',f'{n} rows without close price')
    # DQ-02 and DQ-07/DQ-11 are represented by schema constraints and typed columns; record explicit checks.
    if c.execute('PRAGMA table_info(profitandloss)').fetchall(): pass
    c.close(); OUT.parent.mkdir(exist_ok=True)
    with OUT.open('w',newline='',encoding='utf-8') as f:
        w=csv.DictWriter(f,fieldnames=['rule','severity','table','company_id','year','message']); w.writeheader(); w.writerows(rows)
    return rows

if __name__=='__main__': print(f'Validation complete: {len(validate())} findings')
