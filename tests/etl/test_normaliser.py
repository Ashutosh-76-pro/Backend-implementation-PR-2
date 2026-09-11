import pytest
from normaliser import normalize_year,normalize_ticker,clean_number,normalize_url
@pytest.mark.parametrize('value,expected',[(x,y) for x,y in [('FY2024',2024),('2023-24',2023),('Mar 2022',2022),(2021,2021),(None,None),('',None),('FY 2020',2020),('31/03/2019',2019),('2018E',2018),('Q4 2017',2017),('1999',1999),('2000',2000),('2050',2050),('Apr-2016',2016),('FY19',None),('unknown',None),(' 2025 ',2025),('year 2015 restated',2015),('Jan 2014',2014),('FY2024 estimated',2024)]])
def test_normalize_year(value,expected): assert normalize_year(value)==expected
@pytest.mark.parametrize('value,expected',[('tcs','TCS'),(' Tcs ','TCS'),('INFY.NS','INFY.NS'),('m&m','M&M'),(None,None),('',None),('abc-123','ABC-123'),('a b','AB'),('BSE:500325','BSE500325'),(123,'123'),('xyz_1','XYZ_1'),('RELIANCE!','RELIANCE'),('abc/def','ABCDEF'),('s&p','S&P'),('tcs ltd','TCSLTD')])
def test_normalize_ticker(value,expected): assert normalize_ticker(value)==expected
@pytest.mark.parametrize('value,expected',[('1,234.5',1234.5),('12%',12.0),('-',None),('N/A',None),(10,10.0),(None,None),(' 25 ',25.0),('1,00,000',100000.0)])
def test_clean_number(value,expected): assert clean_number(value)==expected
@pytest.mark.parametrize('value,expected',[('example.com','https://example.com'),('https://example.com','https://example.com'),(None,None),('',None),('http://x.in','http://x.in')])
def test_normalize_url(value,expected): assert normalize_url(value)==expected
