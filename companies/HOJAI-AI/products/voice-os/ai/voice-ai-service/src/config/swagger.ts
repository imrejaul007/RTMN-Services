import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Voice AI Service API',
      version: '1.0.0',
      description: 'Voice AI Service for HOJAI AI - Recording, Transcription, Synthesis, Medical NLP',
      contact: {
        name: 'HOJAI AI Team',
      },
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API v1',
      },
    ],
    tags: [
      { name: 'Health', description: 'Health check endpoints' },
      { name: 'Transcription', description: 'Audio transcription endpoints' },
      { name: 'Synthesis', description: 'Text-to-speech endpoints' },
      { name: 'Medical NLP', description: 'Medical entity extraction endpoints' },
    ],
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          responses: {
            '200': {
              description: 'Service is healthy',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/HealthResponse',
                  },
                },
              },
            },
          },
        },
      },
      '/transcribe': {
        post: {
          tags: ['Transcription'],
          summary: 'Transcribe audio to text',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    audio: {
                      type: 'string',
                      format: 'binary',
                      description: 'Audio file to transcribe',
                    },
                    language: {
                      type: 'string',
                      description: 'Language code (e.g., en, hi)',
                    },
                  },
                  required: ['audio'],
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Transcription successful',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/TranscriptionResponse',
                  },
                },
              },
            },
            '400': { description: 'Invalid audio file' },
            '429': { description: 'Rate limit exceeded' },
            '500': { description: 'Transcription failed' },
          },
        },
      },
      '/synthesize': {
        post: {
          tags: ['Synthesis'],
          summary: 'Synthesize text to speech',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SynthesisRequest',
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Synthesis successful',
              content: {
                'audio/mpeg': {
                  schema: {
                    type: 'string',
                    format: 'binary',
                  },
                },
              },
            },
            '400': { description: 'Invalid request' },
            '429': { description: 'Rate limit exceeded' },
            '500': { description: 'Synthesis failed' },
          },
        },
      },
      '/medical/summarize': {
        post: {
          tags: ['Medical NLP'],
          summary: 'Generate medical visit summary',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SummarizeRequest',
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Summary generated',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/MedicalSummaryResponse',
                  },
                },
              },
            },
            '400': { description: 'Invalid request' },
          },
        },
      },
      '/medical/entities': {
        post: {
          tags: ['Medical NLP'],
          summary: 'Extract medical entities',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/EntitiesRequest',
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Entities extracted',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/MedicalEntitiesResponse',
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        HealthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'healthy' },
            timestamp: { type: 'string', format: 'date-time' },
            providers: {
              type: 'object',
              properties: {
                whisper: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                  },
                },
                elevenlabs: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                  },
                },
              },
            },
          },
        },
        TranscriptionResponse: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Transcribed text' },
            confidence: { type: 'number', description: 'Confidence score 0-1' },
            language: { type: 'string', description: 'Detected language' },
            duration: { type: 'number', description: 'Audio duration in seconds' },
            metadata: {
              type: 'object',
              properties: {
                requestId: { type: 'string' },
                provider: { type: 'string' },
              },
            },
          },
        },
        SynthesisRequest: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'string', description: 'Text to synthesize' },
            voiceId: { type: 'string', description: 'Voice ID for ElevenLabs' },
            language: { type: 'string', description: 'Language code' },
          },
        },
        MedicalSummaryResponse: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            chiefComplaint: { type: 'string' },
            diagnosis: { type: 'array', items: { type: 'string' } },
            medications: {
              type: 'array',
              items: { $ref: '#/components/schemas/Medication' },
            },
            labOrders: { type: 'array', items: { type: 'string' } },
            followUp: { type: 'string' },
            patientInstructions: { type: 'string' },
            metadata: { type: 'object' },
          },
        },
        Medication: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            dosage: { type: 'string' },
            frequency: { type: 'string' },
            duration: { type: 'string' },
            instructions: { type: 'string' },
          },
        },
        EntitiesRequest: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'string' },
          },
        },
        MedicalEntitiesResponse: {
          type: 'object',
          properties: {
            entities: {
              type: 'object',
              properties: {
                medications: { type: 'array', items: { $ref: '#/components/schemas/Medication' } },
                diagnoses: { type: 'array', items: { type: 'string' } },
                symptoms: { type: 'array', items: { type: 'string' } },
                procedures: { type: 'array', items: { type: 'string' } },
                allergies: { type: 'array', items: { type: 'string' } },
                vitals: { type: 'array', items: { $ref: '#/components/schemas/Vital' } },
              },
            },
            metadata: { type: 'object' },
          },
        },
        Vital: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            value: { type: 'string' },
            unit: { type: 'string' },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
