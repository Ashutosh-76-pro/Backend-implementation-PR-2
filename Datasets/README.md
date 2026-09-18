# Datasets

## Dataset status

The API specification requires a large Indian administrative hierarchy dataset. The currently available project material does **not** contain the underlying MDDS spreadsheet rows needed for a full production import.

Therefore this submission includes:

- `sample_village_hierarchy.csv` — a **synthetic demo dataset** for local API testing and presentation.
- The production import script expects an MDDS-style Excel workbook and validates the required columns before import.

Do not present the sample CSV as official Government of India data.

## Expected production columns

`MDDS STC, STATE NAME, MDDS DTC, DISTRICT NAME, MDDS Sub_DT, SUB-DISTRICT NAME, MDDS PLCN, Area Name`

## Import path

Use `Source Code/import-mdss.py` with the real authorized MDDS workbook once the source spreadsheet is available.
