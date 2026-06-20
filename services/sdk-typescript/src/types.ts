export interface HojaiConfig { baseUrl: string; apiKey?: string; timeout?: number; }
export interface Twin { id: string; type: string; subject_id: string; state: Record<string, any>; }
export interface ChatResponse { message: string; usage?: { tokens: number }; }
