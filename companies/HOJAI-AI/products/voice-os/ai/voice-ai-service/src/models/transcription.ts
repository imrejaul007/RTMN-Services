// Transcription Types

export interface TranscriptionRequest {
  audioUrl?: string;
  audioBase64?: string;
  language?: string;
  speakerLabels?: boolean;
  profanityFilter?: boolean;
  format?: 'json' | 'text' | 'srt';
}

export interface TranscriptionResponse {
  id: string;
  text: string;
  segments?: TranscriptionSegment[];
  speakers?: Speaker[];
  language: string;
  duration: number;
  confidence: number;
  words?: WordTiming[];
  metadata: {
    provider: string;
    processedAt: string;
    processingTimeMs: number;
  };
}

export interface TranscriptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  speaker?: string;
  confidence: number;
}

export interface Speaker {
  id: string;
  label: string;
  start: number;
  end: number;
}

export interface WordTiming {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

// Medical-specific transcription
export interface MedicalTranscriptionRequest extends TranscriptionRequest {
  medicalDomain: boolean;
  extractEntities: boolean;
  speakerCount?: number;
}

export interface MedicalTranscript extends TranscriptionResponse {
  entities: MedicalEntities;
  summary?: string;
  keyPoints?: string[];
}

export interface MedicalEntities {
  medications: ExtractedMedication[];
  diagnoses: string[];
  symptoms: string[];
  procedures: string[];
  bodyParts: string[];
  dosages: string[];
  frequencies: string[];
  durations: string[];
  providers: string[];
  facilities: string[];
  dates: string[];
  allergies: string[];
  vitals: VitalReading[];
}

export interface ExtractedMedication {
  name: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  duration?: string;
  instructions?: string;
}

export interface VitalReading {
  type: string;
  value: string;
  unit?: string;
  context?: string;
}
