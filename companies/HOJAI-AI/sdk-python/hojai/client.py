import requests
from dataclasses import dataclass

@dataclass
class HojaiConfig:
    base_url: str
    api_key: str = None
    timeout: int = 30

class HojaiClient:
    def __init__(self, config: HojaiConfig):
        self.base_url = config.base_url.rstrip('/')
        self.api_key = config.api_key
        self.timeout = config.timeout
        self.session = requests.Session()
        if self.api_key:
            self.session.headers['Authorization'] = f'Bearer {self.api_key}'

    def twins(self):
        return self.session.get(f'{self.base_url}/api/twins', timeout=self.timeout).json()

    def ai_chat(self, prompt: str):
        return self.session.post(f'{self.base_url}/api/ai/chat', json={'prompt': prompt}, timeout=self.timeout).json()

    def customer360(self, customer_id: str):
        return self.session.get(f'{self.base_url}/api/customer360/{customer_id}', timeout=self.timeout).json()
