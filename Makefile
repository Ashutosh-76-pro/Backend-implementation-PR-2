PYTHON=python3
.PHONY: load ratios test report dashboard api clean
load:
	PYTHONPATH=src/etl $(PYTHON) src/etl/loader.py
ratios:
	@echo "Ratio ETL hook ready"
test:
	PYTHONPATH=src/etl pytest -q
report:
	PYTHONPATH=src/etl $(PYTHON) src/etl/validator.py
dashboard:
	@echo "Dashboard consumes nifty100.db and output reports"
api:
	npm run dev
clean:
	rm -f nifty100.db output/load_audit.csv output/validation_failures.csv
