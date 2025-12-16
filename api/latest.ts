import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

export default async function handler() {
  try {
    const data = await kv.get('mediband_latest');
    return new Response(JSON.stringify(data || {}), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch data' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
