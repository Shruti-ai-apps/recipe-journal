// Browser client - use in Client Components
export { createClient, isSupabaseConfigured } from './client';

// Server client - use in Server Components
export { createClient as createServerClient } from './server';

// Middleware helper - use in middleware.ts
export { updateSession } from './middleware';
