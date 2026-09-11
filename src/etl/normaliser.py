from __future__ import annotations
import math, re
from datetime import date, datetime

def normalize_year(value):
    if value is None: return None
    if isinstance(value,(datetime,date)): return value.year
    text=str(value).strip()
    if not text: return None
    m=re.search(r"(?:19|20)\d{2}",text)
    return int(m.group()) if m else None

def normalize_ticker(value):
    if value is None: return None
    text=str(value).strip().upper(); text=re.sub(r"[^A-Z0-9.&_-]","",text)
    return text or None

def clean_number(value):
    if value is None or (isinstance(value,float) and math.isnan(value)): return None
    if isinstance(value,(int,float)): return float(value)
    text=str(value).strip().replace(",","").replace("%","")
    if text in {"","-","NA","N/A","NM","--"}: return None
    try: return float(text)
    except ValueError: return None

def normalize_url(value):
    if value is None: return None
    text=str(value).strip()
    if not text: return None
    return text if re.match(r"^https?://",text,re.I) else "https://"+text
