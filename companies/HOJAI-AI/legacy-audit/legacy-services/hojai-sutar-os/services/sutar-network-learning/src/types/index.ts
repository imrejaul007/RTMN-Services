export interface Config { port: number; environment: string; }
export interface HealthResponse { status: string; service: string; version: string; timestamp: string; uptime: number; }
export interface ApiResponse<T = unknown> { success: boolean; data?: T; error?: string; timestamp: string; }
