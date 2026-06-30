declare module '@hojai/actor-runtime' {
  export interface ActorConfig {
    id: string;
    name: string;
    description: string;
    version: string;
    capabilities: string[];
    rateLimit?: {
      requests: number;
      window: number;
    };
  }

  export interface ActorInput {
    actor: string;
    action: string;
    params?: Record<string, any>;
    options?: {
      timeout?: number;
      retries?: number;
      proxy?: boolean;
    };
  }

  export interface ActorOutput {
    success: boolean;
    data?: any;
    error?: string;
    metadata?: {
      scrapedAt: string;
      source: string;
      itemsFound: number;
      duration: number;
    };
  }

  export abstract class Actor {
    public config: ActorConfig;
    constructor(config: ActorConfig);
    abstract scrape(input: any): Promise<ActorOutput>;
    abstract validate(input: any): Promise<boolean>;
    protected async rateLimit(): Promise<void>;
  }

  export async function fetchUrl(
    url: string,
    options?: {
      headers?: Record<string, string>;
      timeout?: number;
      retries?: number;
      proxy?: string;
    }
  ): Promise<string>;

  export function parseHtml(html: string): any;
}
