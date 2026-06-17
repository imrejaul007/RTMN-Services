import OpenAI from 'openai';
import https from 'https';
import http from 'http';
import { Readable } from 'stream';

let openaiClient: OpenAI | null = null;

// Initialize OpenAI client
export function initializeOpenAI(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.warn('OpenAI API key not configured');
    return null;
  }

  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

// Get OpenAI client
export function getOpenAI(): OpenAI | null {
  if (!openaiClient) {
    return initializeOpenAI();
  }
  return openaiClient;
}

// Download audio file to buffer
async function downloadAudio(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadAudio(redirectUrl).then(resolve).catch(reject);
          return;
        }
      }

      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

// Transcribe audio using OpenAI Whisper
export async function transcribeAudio(
  audioUrl: string,
  language?: string
): Promise<string | null> {
  const client = getOpenAI();

  if (!client) {
    console.warn('OpenAI not configured, skipping transcription');
    return null;
  }

  try {
    console.log(`Transcribing audio from: ${audioUrl}`);

    // Download audio
    const audioBuffer = await downloadAudio(audioUrl);

    // Create a readable stream from buffer
    const fileStream = new Readable();
    fileStream.push(audioBuffer);
    fileStream.push(null);

    // Transcribe using Whisper
    const transcription = await client.audio.transcriptions.create({
      file: fileStream as any,
      model: 'whisper-1',
      language: language,
      response_format: 'text',
      temperature: 0.2
    });

    console.log('Transcription complete:', transcription.substring(0, 100) + '...');
    return transcription;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return null;
  }
}

// Transcribe from buffer/file
export async function transcribeBuffer(
  buffer: Buffer,
  filename: string = 'audio.wav',
  language?: string
): Promise<string | null> {
  const client = getOpenAI();

  if (!client) {
    console.warn('OpenAI not configured, skipping transcription');
    return null;
  }

  try {
    // Create file from buffer
    const fileStream = new Readable();
    fileStream.push(buffer);
    fileStream.push(null);

    const transcription = await client.audio.transcriptions.create({
      file: {
        name: filename,
        pipe: fileStream
      } as any,
      model: 'whisper-1',
      language: language,
      response_format: 'text',
      temperature: 0.2
    });

    return transcription;
  } catch (error) {
    console.error('Error transcribing buffer:', error);
    return null;
  }
}

// Batch transcription
export async function batchTranscribe(
  audioUrls: string[]
): Promise<{ url: string; transcript: string | null; error?: string }[]> {
  const results = [];

  for (const url of audioUrls) {
    try {
      const transcript = await transcribeAudio(url);
      results.push({ url, transcript });
    } catch (error) {
      results.push({ url, transcript: null, error: (error as Error).message });
    }
  }

  return results;
}

// Get supported languages
export function getSupportedLanguages(): { code: string; name: string }[] {
  return [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'hi', name: 'Hindi' },
    { code: 'ar', name: 'Arabic' },
    { code: 'ru', name: 'Russian' }
  ];
}

export default {
  initializeOpenAI,
  getOpenAI,
  transcribeAudio,
  transcribeBuffer,
  batchTranscribe,
  getSupportedLanguages
};
