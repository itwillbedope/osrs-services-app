# Upgrade DB Validation

Upgrade validation path starts from required base SHA 5866b5d0e31e1171479d3903b5bd028848209fd9, seeds the base database, applies final branch migrations and reruns final seed/price validation.

Manual admin edits are preserved by create-only seed updates for existing rows; new reference rows are inserted under stable reference keys.
