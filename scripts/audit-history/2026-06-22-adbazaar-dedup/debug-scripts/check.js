console.log('globalThis.fetch:', typeof globalThis.fetch);
const fetch = globalThis.fetch ?? (await import('node-fetch')).default;
console.log('fetch:', typeof fetch);
console.log('same?:', fetch === globalThis.fetch);
