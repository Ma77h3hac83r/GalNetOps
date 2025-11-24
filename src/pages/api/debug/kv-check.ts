import type { APIRoute } from 'astro';

export const GET: APIRoute = async (context) => {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    kvAvailable: false,
    kvPath: null,
    contextStructure: {},
  };

  // Check various paths for KV access
  if (context?.locals?.runtime?.env?.USERS) {
    diagnostics.kvAvailable = true;
    diagnostics.kvPath = 'context.locals.runtime.env.USERS';
    try {
      // Try to list keys to verify it works
      const list = await context.locals.runtime.env.USERS.list({ limit: 1 });
      diagnostics.kvWorking = true;
      diagnostics.kvTestResult = 'Success';
    } catch (error) {
      diagnostics.kvWorking = false;
      diagnostics.kvError = error instanceof Error ? error.message : String(error);
    }
  } else if (context?.env?.USERS) {
    diagnostics.kvAvailable = true;
    diagnostics.kvPath = 'context.env.USERS';
  } else if (context?.runtime?.env?.USERS) {
    diagnostics.kvAvailable = true;
    diagnostics.kvPath = 'context.runtime.env.USERS';
  }

  // Log context structure (without sensitive data)
  diagnostics.contextStructure = {
    hasContext: !!context,
    hasLocals: !!context?.locals,
    hasRuntime: !!context?.locals?.runtime,
    hasEnv: !!context?.locals?.runtime?.env,
    envKeys: context?.locals?.runtime?.env ? Object.keys(context.locals.runtime.env) : [],
  };

  return new Response(JSON.stringify(diagnostics, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

