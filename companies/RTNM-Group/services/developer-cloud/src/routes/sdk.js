import express from 'express';
import { apiRegistry } from '../index.js';

const router = express.Router();

// Supported SDK languages
const SDK_LANGUAGES = ['javascript', 'python', 'typescript', 'go', 'java', 'ruby'];

/**
 * GET /api/sdk
 * List available SDKs
 */
router.get('/', async (req, res) => {
  try {
    const { language } = req.query;

    let languages = SDK_LANGUAGES;

    if (language) {
      if (!SDK_LANGUAGES.includes(language)) {
        return res.status(400).json({
          success: false,
          error: 'Unsupported language',
          supported: SDK_LANGUAGES
        });
      }
      languages = [language];
    }

    res.json({
      success: true,
      languages: SDK_LANGUAGES,
      sdks: languages.map(lang => ({
        language: lang,
        package: `@rtmn/sdk-${lang}`,
        version: '1.0.0',
        status: 'available'
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/sdk/:language
 * Get SDK for specific language
 */
router.get('/:language', async (req, res) => {
  try {
    const { language } = req.params;

    if (!SDK_LANGUAGES.includes(language)) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported language',
        supported: SDK_LANGUAGES
      });
    }

    const apis = Array.from(apiRegistry.values());

    res.json({
      success: true,
      language,
      package: `@rtmn/sdk-${language}`,
      version: '1.0.0',
      apis: apis.map(api => ({
        id: api.id,
        name: api.name,
        endpoints: api.endpoints.length
      })),
      installation: getInstallationCommand(language),
      example: getExample(language)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function getInstallationCommand(language) {
  const commands = {
    javascript: 'npm install @rtmn/sdk-javascript',
    python: 'pip install rtmnsdk',
    typescript: 'npm install @rtmn/sdk-typescript',
    go: 'go get github.com/rtmn/sdk-go',
    java: 'mvn add rtmnsdk',
    ruby: 'gem install rtmnsdk'
  };
  return commands[language];
}

function getExample(language) {
  const examples = {
    javascript: `const RTMN = require('@rtmn/sdk-javascript');

// Initialize client
const client = new RTMN.Client({ apiKey: 'your-api-key' });

// Use Capability Matrix
const capabilities = await client.capabilityMatrix.list();`,
    python: `from rtmnsdk import RTMNClient

# Initialize client
client = RTMNClient(api_key='your-api-key')

# Use Capability Matrix
capabilities = client.capability_matrix.list()`,
    typescript: `import { Client } from '@rtmn/sdk-typescript';

// Initialize client
const client = new Client({ apiKey: 'your-api-key' });

// Use Capability Matrix
const capabilities = await client.capabilityMatrix.list();`,
    go: `package main

import "github.com/rtmn/sdk-go"

func main() {
    client := rtmnsdk.NewClient("your-api-key")
    capabilities := client.CapabilityMatrix.List()
}`,
    java: `import com.rtmn.sdk.RTMNClient;

public class Example {
    public static void main(String[] args) {
        RTMNClient client = new RTMNClient("your-api-key");
        var capabilities = client.capabilityMatrix().list();
    }
}`,
    ruby: `require 'rtmnsdk'

client = RTMN::Client.new(api_key: 'your-api-key')
capabilities = client.capability_matrix.list`
  };
  return examples[language];
}

export default router;
