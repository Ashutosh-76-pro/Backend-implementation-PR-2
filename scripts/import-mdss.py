"""Import MDDS Excel data into PostgreSQL.

Expected columns:
MDDS STC, STATE NAME, MDDS DTC, DISTRICT NAME, MDDS Sub_DT,
SUB-DISTRICT NAME, MDDS PLCN, Area Name

Usage:
  python scripts/import-mdss.py data/mdss.xlsx

Set DATABASE_URL to a PostgreSQL connection string. The script uses psycopg2
and upserts each hierarchy level before inserting villages in batches.
"""
import os, sys, re
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values

REQUIRED = ["MDDS STC", "STATE NAME", "MDDS DTC", "DISTRICT NAME", "MDDS Sub_DT", "SUB-DISTRICT NAME", "MDDS PLCN", "Area Name"]

def clean(v):
    if pd.isna(v): return None
    return str(v).strip()

def code(v):
    s = clean(v)
    if not s: return None
    # Preserve identifiers while removing Excel's trailing .0 for numeric cells.
    return re.sub(r"\.0$", "", s)

def main(path):
    url = os.environ.get("DATABASE_URL")
    if not url: raise SystemExit("DATABASE_URL is required")
    df = pd.read_excel(path, dtype=str)
    df.columns = [str(c).strip() for c in df.columns]
    missing = [c for c in REQUIRED if c not in df.columns]
    if missing: raise SystemExit(f"Missing columns: {', '.join(missing)}")
    df = df[REQUIRED].copy()
    for c in REQUIRED: df[c] = df[c].map(clean)
    before = len(df)
    df = df.dropna(subset=REQUIRED).drop_duplicates(subset=["MDDS STC","MDDS DTC","MDDS Sub_DT","MDDS PLCN"])
    print(f"Rows read={before}, valid unique rows={len(df)}, rejected={before-len(df)}")

    conn = psycopg2.connect(url)
    conn.autocommit = False
    try:
        with conn.cursor() as cur:
            cur.execute("INSERT INTO \"Country\" (id,name,code,\"createdAt\",\"updatedAt\") VALUES (gen_random_uuid()::text,'India','IN',now(),now()) ON CONFLICT (code) DO NOTHING")
            cur.execute("SELECT id FROM \"Country\" WHERE code='IN'")
            country_id = cur.fetchone()[0]
            states, districts, subs, villages = {}, {}, {}, []
            for _, r in df.iterrows():
                st = (country_id, code(r['MDDS STC']), r['STATE NAME'])
                states[st[1]] = st
                districts[(st[1],code(r['MDDS DTC']))] = (code(r['MDDS DTC']), r['DISTRICT NAME'], st[1])
                subs[(st[1],code(r['MDDS DTC']),code(r['MDDS Sub_DT']))] = (code(r['MDDS Sub_DT']),r['SUB-DISTRICT NAME'],code(r['MDDS DTC']),st[1])
                villages.append((code(r['MDDS PLCN']),r['Area Name'],code(r['MDDS Sub_DT']),code(r['MDDS DTC']),st[1]))
            execute_values(cur, 'INSERT INTO "State" (id,code,name,"countryId","createdAt","updatedAt") VALUES %s ON CONFLICT ("countryId",code) DO UPDATE SET name=EXCLUDED.name,"updatedAt"=now()', [(f'st-{c}',c,n,country_id) for c,n in states.values()])
            cur.execute('SELECT id,code FROM "State" WHERE "countryId"=%s',(country_id,)); state_ids=dict(cur.fetchall())
            execute_values(cur, 'INSERT INTO "District" (id,code,name,"stateId","createdAt","updatedAt") VALUES %s ON CONFLICT ("stateId",code) DO UPDATE SET name=EXCLUDED.name,"updatedAt"=now()', [(f'di-{s}-{c}',c,n,state_ids[s]) for (s,c),(c,n,_) in districts.items()])
            cur.execute('SELECT id,code,"stateId" FROM "District"'); district_ids={(s,c):i for i,c,s in cur.fetchall()}
            execute_values(cur, 'INSERT INTO "SubDistrict" (id,code,name,"districtId","createdAt","updatedAt") VALUES %s ON CONFLICT ("districtId",code) DO UPDATE SET name=EXCLUDED.name,"updatedAt"=now()', [(f'su-{s}-{d}-{c}',c,n,district_ids[(s,d)]) for (s,d,c),(c,n,_,_) in subs.items()])
            cur.execute('SELECT id,code,"districtId" FROM "SubDistrict"'); sub_ids={(d,c):i for i,c,d in cur.fetchall()}
            batch=[]
            for v in villages:
                plc,name,sub,dist,state=v; batch.append((plc,name,sub_ids[(district_ids[(state,dist)],sub)]))
                if len(batch)>=5000:
                    execute_values(cur,'INSERT INTO "Village" (id,code,name,"subDistrictId","createdAt","updatedAt") VALUES %s ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name,"subDistrictId"=EXCLUDED."subDistrictId", "updatedAt"=now()',[(f'vi-{x[0]}',*x) for x in batch]); batch=[]
            if batch: execute_values(cur,'INSERT INTO "Village" (id,code,name,"subDistrictId","createdAt","updatedAt") VALUES %s ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name,"subDistrictId"=EXCLUDED."subDistrictId", "updatedAt"=now()',[(f'vi-{x[0]}',*x) for x in batch])
        conn.commit(); print('Import completed successfully')
    except Exception:
        conn.rollback(); raise
    finally: conn.close()

if __name__ == '__main__':
    if len(sys.argv)!=2: raise SystemExit('Usage: python scripts/import-mdss.py <excel-file>')
    main(sys.argv[1])
