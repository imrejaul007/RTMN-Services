/**
 * MemoryOS Module
 *
 * Wraps MemoryOS (port 4703) via Hub /api/memory/* routes.
 * MemoryOS uses plural paths: /api/memories (not /api/memory).
 * The SDK developer API uses singular: /api/memory (for ergonomics).
 * The request() call rewrites to /api/memories on the wire.
 */
import { request } from './utils.js';
// ---------------------------------------------------------------------------
// MemoryOS client
// ---------------------------------------------------------------------------
export class MemoryClient {
    cfg;
    constructor(config, authState) {
        this.cfg = { ...config, authState };
    }
    /**
     * Write a memory to the store.
     * POST /api/memories
     */
    async write(input) {
        const body = {
            type: input.type,
            content: input.content,
            visibility: input.visibility ?? 'private',
            metadata: {
                ownerId: input.scope.ownerId,
                ownerType: input.scope.ownerType,
                confidence: input.confidence ?? 1.0,
                importance: input.importance ?? 5,
                ttl: input.ttlSeconds,
                tags: input.tags ?? []
            },
            twinId: input.twinId,
            importance: input.importance ?? 5,
            ttl: input.ttlSeconds,
            tags: input.tags ?? []
        };
        return request(this.cfg, 'POST', '/api/memory/memories', body);
    }
    /**
     * Get a memory by ID.
     * GET /api/memories/:id
     */
    async get(id) {
        return request(this.cfg, 'GET', `/api/memory/memories/${encodeURIComponent(id)}`);
    }
    /**
     * Search memories by query + filters.
     * POST /api/memories/search
     */
    async search(input) {
        const body = {
            query: input.query,
            type: input.type,
            ownerId: input.scope?.ownerId,
            ownerType: input.scope?.ownerType,
            tags: input.tags ?? [],
            minConfidence: input.minConfidence,
            sortBy: input.sortBy ?? 'createdAt',
            sortDir: input.sortDir ?? 'desc',
            limit: input.limit ?? 20,
            offset: input.offset ?? 0
        };
        return request(this.cfg, 'POST', '/api/memory/memories/search', body);
    }
    /**
     * Update a memory's content / metadata.
     * PATCH /api/memories/:id
     */
    async update(id, partial) {
        const body = {};
        if (partial.content !== undefined)
            body.content = partial.content;
        if (partial.tags !== undefined)
            body.tags = partial.tags;
        if (partial.importance !== undefined)
            body.importance = partial.importance;
        return request(this.cfg, 'PATCH', `/api/memory/memories/${encodeURIComponent(id)}`, body);
    }
    /**
     * Delete a memory by ID.
     * DELETE /api/memories/:id
     */
    async delete(id) {
        return request(this.cfg, 'DELETE', `/api/memory/memories/${encodeURIComponent(id)}`);
    }
    /**
     * Get a timeline of memories for an owner.
     * GET /api/memories/timeline?ownerId=&limit=
     */
    async timeline(ownerId, params) {
        const query = new URLSearchParams({ ownerId });
        if (params?.limit)
            query.set('limit', String(params.limit));
        if (params?.type)
            query.set('type', params.type);
        return request(this.cfg, 'GET', `/api/memory/memories/timeline?${query}`);
    }
}
