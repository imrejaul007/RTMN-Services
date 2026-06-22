# hojai

Python SDK for HOJAI AI.

## Install
```
pip install hojai
```

## Usage
```python
from hojai import HojaiClient, HojaiConfig
client = HojaiClient(HojaiConfig(base_url='http://localhost:4399'))
twins = client.twins()
```
