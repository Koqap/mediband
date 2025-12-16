import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  const url = new URL(request.url);
  
  // GET: Retrieve the latest command (for ESP32 to poll)
  if (request.method === 'GET') {
    try {
      const command = await kv.get('mediband_command');
      // Clear command after reading to prevent repeated triggers? 
      // Or let the client handle it. For now, let's just return it.
      // Ideally, we should have a mechanism to acknowledge or clear it.
      // Let's implement a "read-once" style or rely on timestamp.
      // For simplicity, we'll return the command object.
      return new Response(JSON.stringify(command || {}), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Failed to get command' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }
  }

  // POST: Save a command (from Web)
  if (request.method === 'POST') {
    try {
      const body = await request.json();
      const commandData = { ...body, timestamp: Date.now() };
      await kv.set('mediband_command', commandData);
      
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Failed to save command' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }
  }
  
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
  });
}
