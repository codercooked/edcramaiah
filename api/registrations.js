const { neon } = require('@neondatabase/serverless');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

  if (!dbUrl) {
    return res.status(200).json({
      message: 'No database connected. Connect Vercel Postgres / Neon in the Storage tab to store registrations in a table.'
    });
  }

  try {
    const sql = neon(dbUrl);
    const rows = await sql`SELECT * FROM registrations ORDER BY id DESC;`;

    // Download as CSV if requested
    if (req.url && req.url.includes('.csv')) {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="ecell_registrations_2026.csv"');
      let csv = 'ID,Created At,Serial,Name,Email,Phone,College,Branch,Year,Interests,Vision\n';
      rows.forEach(r => {
        const cleanVision = (r.vision || '').replace(/"/g, '""');
        csv += `"${r.id}","${r.created_at}","${r.serial}","${r.name}","${r.email}","${r.phone}","${r.college}","${r.branch}","${r.year}","${r.interests}","${cleanVision}"\n`;
      });
      return res.status(200).send(csv);
    }

    return res.status(200).json(rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
