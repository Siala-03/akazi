-- List exporter portal login accounts.
-- Run in the Neon SQL Editor (or `psql "$DATABASE_URL" -f scripts/query-exporter-credentials.sql`).
--
-- Note: "password" is a bcrypt hash and cannot be decrypted back to plaintext here.
-- To issue a new password, use scripts/query-exporter-credentials.mjs --reset <email>
-- (hashing needs to happen in application code, not plain SQL).

SELECT
    e."companyTradingName" AS company,
    u.email               AS login_email,
    u.name                AS contact_name,
    u.phone               AS contact_phone,
    u."isActive"          AS active,
    e."exporterCode"      AS exporter_code
FROM "User" u
LEFT JOIN "Exporter" e ON e.id = u."exporterId"
WHERE u.role = 'exporter'
ORDER BY e."companyTradingName";
