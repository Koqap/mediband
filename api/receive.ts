import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  try {
    const body = await request.json();
    // Add server-side timestamp to prevent stale data issues
    // Simulate SpO2 data (95-100%)
    const spo2 = Math.floor(Math.random() * (100 - 95 + 1)) + 95;
    const dataWithTimestamp = { ...body, spo2, timestamp: Date.now() };
    await kv.set('mediband_latest', dataWithTimestamp);
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
