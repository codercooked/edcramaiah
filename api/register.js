module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'POST') {
    const data = req.body || {};
    console.log(`[VERCEL REGISTRATION] Logged #${data.serial}: ${data.name} (${data.email}) - ${data.college}`);

    // If an optional external webhook (e.g. Google Sheets) is configured:
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
