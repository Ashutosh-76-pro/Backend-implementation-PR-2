from __future__ import annotations
import csv, sqlite3
from pathlib import Path
import pandas as pd
from normaliser import clean_number, normalize_ticker, normalize_url, normalize_year

SOURCE_DIR=Path('data/source'); DB_PATH=Path('nifty100.db'); OUTPUT_DIR=Path('output')
HINTS={'profit':'profitandloss','p&l':'profitandloss','pnl':'profitandloss','balance':'balancesheet','cashflow':'cashflow','cash_flow':'cashflow','price':'stock_prices','ratio':'financial_ratios','sector':'sectors','peer':'peer_groups','pro':'prosandcons','document':'documents','analysis':'analysis'}

def read_source(path):
    if path.suffix.lower()=='.ods': return pd.read_excel(path,engine='odf')
    return pd.read_excel(path)

def infer_table(path,columns):
    text=path.stem.lower()+' '+' '.join(str(c).lower() for c in columns)
    for hint,table in HINTS.items():
        if hint in text: return table
    return 'analysis'

def col(columns,*names):
    normalized={str(c).strip().lower().replace(' ','_'):c for c in columns}
    for n in names:
        if n.lower().replace(' ','_') in normalized: return normalized[n.lower().replace(' ','_')]
    return None

def company_id(row,columns):
    c=col(columns,'company_id','company id','id'); n=clean_number(row[c]) if c is not None else None
    return int(n) if n is not None else None

def load_file(conn,path):
    df=read_source(path).dropna(how='all'); table=infer_table(path,df.columns); inserted=rejected=0; cols=list(df.columns)
    for _,r in df.iterrows():
        try:
            cid=company_id(r,cols)
            if table=='companies':
                nc=col(cols,'company_name','name'); tc=col(cols,'ticker','symbol')
                if cid is None or nc is None: raise ValueError('company_id/company_name required')
                uc=col(cols,'url','website')
                conn.execute('INSERT OR IGNORE INTO companies(company_id,ticker,company_name,url) VALUES(?,?,?,?)',(cid,normalize_ticker(r[tc]) if tc else f'C{cid}',str(r[nc]).strip(),normalize_url(r[uc]) if uc else None))
            elif table in {'profitandloss','balancesheet','cashflow'}:
                yc=col(cols,'year','fy','financial_year'); year=normalize_year(r[yc]) if yc else None
                if cid is None or year is None: raise ValueError('company_id/year required')
                vals={str(c).lower().replace(' ','_'):clean_number(r[c]) for c in cols}
                if table=='profitandloss': conn.execute('INSERT OR REPLACE INTO profitandloss VALUES(?,?,?,?,?,?,?,?)',(cid,year,vals.get('sales'),vals.get('operating_profit'),vals.get('opm'),vals.get('eps'),vals.get('tax_rate'),vals.get('dividend')))
                elif table=='balancesheet': conn.execute('INSERT OR REPLACE INTO balancesheet VALUES(?,?,?,?,?,?,?)',(cid,year,vals.get('equity'),vals.get('liabilities'),vals.get('assets'),vals.get('cash'),vals.get('debt')))
                else: conn.execute('INSERT OR REPLACE INTO cashflow VALUES(?,?,?,?,?,?)',(cid,year,vals.get('cash_from_operating'),vals.get('cash_from_investing'),vals.get('cash_from_financing'),vals.get('net_cash_change')))
            elif table=='stock_prices':
                dc=col(cols,'trade_date','date')
                if cid is None or dc is None: raise ValueError('company_id/trade_date required')
                vals={str(c).lower().replace(' ','_'):clean_number(r[c]) for c in cols}; conn.execute('INSERT OR REPLACE INTO stock_prices VALUES(?,?,?,?,?,?,?)',(cid,str(r[dc]).strip(),vals.get('open'),vals.get('high'),vals.get('low'),vals.get('close'),vals.get('volume')))
            else:
                yc=col(cols,'year','fy','financial_year'); year=normalize_year(r[yc]) if yc else 0
                if cid is None: raise ValueError('company_id required')
                metric=path.stem[:180]; numeric=next((clean_number(r[c]) for c in cols if clean_number(r[c]) is not None),None); conn.execute('INSERT OR REPLACE INTO analysis VALUES(?,?,?,?)',(cid,year,metric,numeric))
            inserted+=1
        except (ValueError,TypeError,sqlite3.IntegrityError): rejected+=1
    return table,inserted,rejected

def load_all():
    OUTPUT_DIR.mkdir(exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute('PRAGMA foreign_keys=ON'); conn.executescript(Path('db/schema.sql').read_text(encoding='utf-8')); conn.execute('PRAGMA foreign_keys=ON')
        audit=[]
        for p in sorted(SOURCE_DIR.iterdir()):
            if p.suffix.lower() in {'.xls','.xlsx','.xlsm','.ods'}:
                t,i,r=load_file(conn,p); audit.append((p.name,t,i,r,'CRITICAL' if r else ''))
        conn.commit()
    with (OUTPUT_DIR/'load_audit.csv').open('w',newline='',encoding='utf-8') as f:
        w=csv.writer(f); w.writerow(['source_file','table','inserted','rejected','severity']); w.writerows(audit)

if __name__=='__main__': load_all()
