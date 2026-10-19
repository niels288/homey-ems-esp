Real EMS-ESP 3.6.3 answers from an EnviLine heat pump with an RC300 (2026-10-19).

`*-entities.json` is shaped like the 3.7+ `/api/<device>/entities` answer but
built from the 3.6.3 per-entity answers (same fields, from `get_value_json`).
Replace it with a real 3.7+ dump once the test gateway runs that version.
