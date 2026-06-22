import axios, { AxiosInstance } from 'axios';
import { HojaiConfig } from './types';

export class HojaiClient {
  private http: AxiosInstance;
  constructor(config: HojaiConfig) {
    this.http = axios.create({ baseURL: config.baseUrl, timeout: config.timeout || 30000 });
  }
  async twins() { return (await this.http.get('/api/twins')).data; }
  async aiChat(prompt: string) { return (await this.http.post('/api/ai/chat', { prompt })).data; }
  async customer360(id: string) { return (await this.http.get(`/api/customer360/${id}`)).data; }
}
