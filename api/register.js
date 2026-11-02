const { neon } = require('@neondatabase/serverless');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'POST') {
    const data = req.body || {};
    const cleanUsn = (data.usn || '').trim().toUpperCase().replace(/\s*-\s*/g, '-');
    const cleanEmail = (data.email || '').trim().toLowerCase();

    console.log(`[VERCEL REGISTRATION] Logged #${data.serial}: ${data.name} (${cleanEmail}) - USN: ${cleanUsn}`);

    // If Vercel Postgres / Neon database is connected
    const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_PRISMA_URL;
    if (dbUrl) {
      try {
        const sql = neon(dbUrl);
        // Automatically create table if it does not exist yet
        await sql`
          CREATE TABLE IF NOT EXISTS registrations (
            id SERIAL PRIMARY KEY,
            serial TEXT,
            name TEXT,
            email TEXT,
            phone TEXT,
            usn TEXT,
            college TEXT,
            branch TEXT,
            year TEXT,
            interests TEXT,
            vision TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `;

        // Add usn column if it doesn't exist yet on existing table
        await sql`
          ALTER TABLE registrations ADD COLUMN IF NOT EXISTS usn TEXT;
        `;

        // Deduplicate any historical duplicate rows first (keeps earliest submission)
        await sql`
          DELETE FROM registrations a USING registrations b
          WHERE a.id > b.id
            AND (
              (LENGTH(COALESCE(a.usn, '')) > 0 AND UPPER(TRIM(a.usn)) = UPPER(TRIM(b.usn)))
              OR (LENGTH(COALESCE(a.email, '')) > 0 AND LOWER(TRIM(a.email)) = LOWER(TRIM(b.email)))
            );
        `;

        // Check for existing registration with matching USN or Email
        if (cleanUsn || cleanEmail) {
          const existing = await sql`
            SELECT id, serial, name, email, usn, college
            FROM registrations
            WHERE (${cleanUsn.length > 0} AND UPPER(TRIM(COALESCE(usn, ''))) = ${cleanUsn})
               OR (${cleanEmail.length > 0} AND LOWER(TRIM(COALESCE(email, ''))) = ${cleanEmail})
            ORDER BY id ASC
            LIMIT 1;
          `;

          if (existing.length > 0) {
            console.log(`[DATABASE] Duplicate detected: ${cleanUsn || cleanEmail}. Returning existing pass #${existing[0].serial}`);
            return res.status(200).json({
              success: true,
              alreadyRegistered: true,
              serial: existing[0].serial,
              name: existing[0].name,
              usn: existing[0].usn,
              college: existing[0].college,
              message: 'Already registered for DISCOVER 2026. Existing pass retrieved.'
            });
          }
        }

        const interestsStr = Array.isArray(data.interests) ? data.interests.join(', ') : (data.interests || '');
        await sql`
          INSERT INTO registrations (serial, name, email, phone, usn, college, branch, year, interests, vision)
          VALUES (
            ${data.serial || ''},
            ${data.name || ''},
            ${cleanEmail || data.email || ''},
            ${data.phone || ''},
            ${cleanUsn || data.usn || ''},
            ${data.college || ''},
            ${data.branch || ''},
            ${data.year || ''},
            ${interestsStr},
            ${data.vision || ''}
          );
        `;
        console.log('[DATABASE] Saved new unique registration to Neon Postgres table!');
      } catch (dbErr) {
        console.error('[DATABASE ERROR]', dbErr);
      }
    }

    // Optional webhook forwarding (e.g. Google Sheets)
    if (process.env.ECELL_WEBHOOK_URL) {
      fetch(process.env.ECELL_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).catch(err => console.error('Webhook forward error:', err));
    }

    return res.status(200).json({
      success: true,
      serial: data.serial,
      message: 'Registration recorded.'
    });
  }

  return res.status(200).json({ status: 'E-Cell API online' });
};
