# B2B Demo Client

## Purpose

Demonstrate how a client integrates the administrative-directory API into a contact form.

## Address workflow

1. User types a village/area name.
2. Frontend calls the autocomplete endpoint after the minimum query length is reached.
3. API returns matching villages with hierarchy information.
4. User selects a village.
5. Sub-district, district, state and country fields are populated automatically.
6. The form is submitted with the standardized address.

## Demo endpoint

The supplied specification uses:

`/api/v1/autocomplete?q={query}`

## Security note

The specification describes a restricted demo key. For any real deployment, store secrets in environment variables rather than frontend source code and use a key with the minimum required privileges.
