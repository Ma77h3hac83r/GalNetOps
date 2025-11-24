import type { APIRoute } from 'astro';
import { getSystem } from '../../../lib/systems-d1';

export const GET: APIRoute = async (context) => {
  const systemName = context.params.name;
  
  if (!systemName) {
    return new Response(JSON.stringify({ error: 'System name required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const system = await getSystem(decodeURIComponent(systemName), context);
    
    if (!system) {
      return new Response(JSON.stringify({ error: 'System not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(system), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching system:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch system' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

