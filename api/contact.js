export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, comment, website } = req.body || {};

  if (website) {
    return res.status(200).json({ ok: true });
  }

  if (!email || !name) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  try {
    const brevoRes = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        email,
        attributes: { FIRSTNAME: name },
        listIds: [5],
        updateEnabled: true,
      }),
    });

    if (!brevoRes.ok && brevoRes.status !== 204) {
      const data = await brevoRes.json();
      if (data.code !== 'duplicate_parameter') {
        return res.status(brevoRes.status).json({ error: data.message || 'Brevo API error' });
      }
    }

    // Notify Slack
    if (process.env.SLACK_WEBHOOK_URL) {
      const lines = [`*New contact from straw.io*`, `>*Name:* ${name}`, `>*Email:* ${email}`];
      if (comment) lines.push(`>*Comment:* ${comment}`);
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: lines.join('\n') }),
      });
    }

    return res.status(200).json({ ok: true });
  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
