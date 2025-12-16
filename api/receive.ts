import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  try {
    const body = await request.json();
    // Validate basic structure if needed, but for now just save it
    await kv.set('mediband_latest', body);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to save data' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
