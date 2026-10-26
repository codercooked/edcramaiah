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
    console.log(`[VERCEL REGISTRATION] Logged #${data.serial}: ${data.name} (${data.email}) - ${data.college}`);

    // If Vercel Postgres / Neon database is connected
    const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
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
            college TEXT,
            branch TEXT,
            year TEXT,
            interests TEXT,
            vision TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `;

        const interestsStr = Array.isArray(data.interests) ? data.interests.join(', ') : (data.interests || '');
        await sql`
          INSERT INTO registrations (serial, name, email, phone, college, branch, year, interests, vision)
          VALUES (
            ${data.serial || ''},
            ${data.name || ''},
            ${data.email || ''},
            ${data.phone || ''},
            ${data.college || ''},
            ${data.branch || ''},
            ${data.year || ''},
            ${interestsStr},
            ${data.vision || ''}
          );
        `;
        console.log('[DATABASE] Saved registration to Vercel Postgres table!');
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
