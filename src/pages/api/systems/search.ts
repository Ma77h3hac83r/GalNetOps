import type { APIRoute } from 'astro';
import { searchSystems } from '../../../lib/systems-kv';

export const GET: APIRoute = async (context) => {
  const url = new URL(context.request.url);
  const query = url.searchParams.get('q') || '';
  const limit = parseInt(url.searchParams.get('limit') || '20', 10);

  if (!query || query.length < 2) {
    return new Response(JSON.stringify({ systems: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const systems = await searchSystems(query, limit, context);
    
    return new Response(JSON.stringify({ systems }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error searching systems:', error);
    return new Response(JSON.stringify({ error: 'Failed to search systems' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

