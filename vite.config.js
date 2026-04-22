import { defineConfig, loadEnv } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

function devApiProxy() {
  let apiKey;
  return {
    name: 'dev-api-proxy',
    configureServer(server) {
      const env = loadEnv('', process.cwd(), '');
      apiKey = env.BREVO_API_KEY;
      server.middlewares.use('/api/contact', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        for await (const chunk of req) body += chunk;
        const { name, email } = JSON.parse(body);

        if (!email || !name) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Name and email are required' }));
          return;
        }

        try {
          const brevoRes = await fetch('https://api.brevo.com/v3/contacts', {
            method: 'POST',
            headers: {
              'accept': 'application/json',
              'content-type': 'application/json',
              'api-key': apiKey,
            },
            body: JSON.stringify({
              email,
              attributes: { FIRSTNAME: name },
              updateEnabled: true,
            }),
          });

          if (brevoRes.ok || brevoRes.status === 204) {
            res.end(JSON.stringify({ ok: true }));
            return;
          }

          const data = await brevoRes.json();
          if (data.code === 'duplicate_parameter') {
            res.end(JSON.stringify({ ok: true }));
            return;
          }

          res.statusCode = brevoRes.status;
          res.end(JSON.stringify({ error: data.message || 'Brevo API error' }));
        } catch {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte(), devApiProxy()],
})
