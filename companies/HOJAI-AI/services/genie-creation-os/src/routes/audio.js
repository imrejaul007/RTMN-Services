const express = require('express');
const router = express.Router();

// In-memory audio storage
const audioProjects = new Map();

// Voice options
const voices = [
  { id: 'professional-male', name: 'Professional Male', gender: 'male', style: 'professional' },
  { id: 'professional-female', name: 'Professional Female', gender: 'female', style: 'professional' },
  { id: 'casual-male', name: 'Casual Male', gender: 'male', style: 'casual' },
  { id: 'casual-female', name: 'Casual Female', gender: 'female', style: 'casual' },
  { id: 'narrator', name: 'Narrator', gender: 'any', style: 'narrative' },
  { id: 'news', name: 'News Anchor', gender: 'any', style: 'informative' },
  { id: 'friendly', name: 'Friendly Assistant', gender: 'female', style: 'friendly' },
  { id: 'deep-male', name: 'Deep Voice Male', gender: 'male', style: 'deep' }
];

// Languages
const languages = [
  { id: 'en-US', name: 'English (US)', flag: '🇺🇸' },
  { id: 'en-UK', name: 'English (UK)', flag: '🇬🇧' },
  { id: 'hi-IN', name: 'Hindi', flag: '🇮🇳' },
  { id: 'es-ES', name: 'Spanish', flag: '🇪🇸' },
  { id: 'fr-FR', name: 'French', flag: '🇫🇷' },
  { id: 'de-DE', name: 'German', flag: '🇩🇪' },
  { id: 'ja-JP', name: 'Japanese', flag: '🇯🇵' },
  { id: 'ar-SA', name: 'Arabic', flag: '🇸🇦' },
  { id: 'pt-BR', name: 'Portuguese', flag: '🇧🇷' },
  { id: 'zh-CN', name: 'Chinese', flag: '🇨🇳' }
];

// Music styles
const musicStyles = [
  { id: 'upbeat', name: 'Upbeat', description: 'Energetic, positive' },
  { id: 'calm', name: 'Calm', description: 'Relaxing, peaceful' },
  { id: 'dramatic', name: 'Dramatic', description: 'Intense, emotional' },
  { id: 'corporate', name: 'Corporate', description: 'Professional, clean' },
  { id: 'cinematic', name: 'Cinematic', description: 'Movie-like, epic' },
  { id: 'ambient', name: 'Ambient', description: 'Background, subtle' },
  { id: 'acoustic', name: 'Acoustic', description: 'Natural, organic' },
  { id: 'electronic', name: 'Electronic', description: 'Modern, tech' }
];

// Text-to-Speech
router.post('/tts', (req, res) => {
  const { userId, text, voice, language, speed, pitch } = req.body;

  if (!text) {
    return res.status(400).json({
      success: false,
      error: 'text is required'
    });
  }

  const selectedVoice = voices.find(v => v.id === voice) || voices[0];
  const selectedLang = languages.find(l => l.id === language) || languages[0];

  const audio = {
    id: `audio-${Date.now()}`,
    userId,
    type: 'tts',
    text,
    settings: {
      voice: selectedVoice,
      language: selectedLang,
      speed: speed || 1.0,
      pitch: pitch || 1.0
    },
    output: {
      url: `https://audio.genie/tts/${Date.now()}.mp3`,
      duration: Math.round(text.split(/\s+/).length / 2.5) + ' seconds',
      format: 'mp3',
      quality: 'high'
    },
    createdAt: new Date().toISOString()
  };

  // Store project
  if (!audioProjects.has(userId)) {
    audioProjects.set(userId, []);
  }
  audioProjects.get(userId).push(audio);

  res.json({
    success: true,
    message: 'Audio generated successfully',
    data: audio
  });
});

// Generate podcast episode
router.post('/podcast', (req, res) => {
  const { userId, topic, duration, hosts, format } = req.body;

  if (!topic) {
    return res.status(400).json({
      success: false,
      error: 'topic is required'
    });
  }

  const segments = generatePodcastSegments(topic, duration || 30, hosts || 1);

  const podcast = {
    id: `podcast-${Date.now()}`,
    userId,
    topic,
    duration: duration || 30,
    format: format || 'interview',
    hosts: hosts || 1,
    segments,
    estimatedLength: duration || 30,
    showNotes: generateShowNotes(topic, segments),
    transcript: segments.map(s => s.content).join('\n\n'),
    createdAt: new Date().toISOString()
  };

  res.json({
    success: true,
    message: 'Podcast generated',
    data: {
      podcast,
      audio: {
        url: `https://audio.genie/podcast/${podcast.id}.mp3`,
        duration: `${duration || 30}:00`
      }
    }
  });
});

// Generate music
router.post('/music', (req, res) => {
  const { userId, description, style, mood, duration } = req.body;

  if (!description) {
    return res.status(400).json({
      success: false,
      error: 'description is required'
    });
  }

  const selectedStyle = musicStyles.find(s => s.id === style) || musicStyles[0];

  const track = {
    id: `music-${Date.now()}`,
    userId,
    description,
    style: selectedStyle,
    mood: mood || 'neutral',
    duration: duration || 180,
    output: {
      url: `https://audio.genie/music/${Date.now()}.mp3`,
      format: 'mp3',
      quality: 'high'
    },
    metadata: {
      bpm: 100 + Math.floor(Math.random() * 40),
      key: ['C', 'D', 'E', 'F', 'G', 'A', 'B'][Math.floor(Math.random() * 7)],
      instruments: generateInstruments(style || 'upbeat'),
      createdAt: new Date().toISOString()
    }
  };

  res.json({
    success: true,
    message: 'Music generated',
    data: track
  });
});

// Generate voiceover
router.post('/voiceover', (req, res) => {
  const { userId, script, voice, timing, background } = req.body;

  if (!script) {
    return res.status(400).json({
      success: false,
      error: 'script is required'
    });
  }

  const selectedVoice = voices.find(v => v.id === voice) || voices[1];

  const voiceover = {
    id: `vo-${Date.now()}`,
    userId,
    script,
    voice: selectedVoice,
    timing: timing || {
      pauses: true,
      emphasis: true,
      rate: 'normal'
    },
    background: background || {
      include: true,
      style: 'ambient',
      volume: 0.3
    },
    output: {
      url: `https://audio.genie/voiceover/${Date.now()}.mp3`,
      duration: Math.round(script.split(/\s+/).length / 2.5) + ' seconds'
    },
    markers: generateAudioMarkers(script),
    createdAt: new Date().toISOString()
  };

  res.json({
    success: true,
    message: 'Voiceover generated',
    data: voiceover
  });
});

// Create audio project
router.post('/project', (req, res) => {
  const { userId, name, type, description } = req.body;

  if (!name || !type) {
    return res.status(400).json({
      success: false,
      error: 'name and type are required'
    });
  }

  const project = {
    id: `audio-proj-${Date.now()}`,
    userId,
    name,
    type,
    description: description || '',
    tracks: [],
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (!audioProjects.has(userId)) {
    audioProjects.set(userId, []);
  }
  audioProjects.get(userId).push(project);

  res.json({
    success: true,
    message: 'Audio project created',
    data: project
  });
});

// Get audio projects
router.get('/projects/:userId', (req, res) => {
  const { userId } = req.params;
  const { type } = req.query;

  let projects = audioProjects.get(userId) || [];

  if (type) {
    projects = projects.filter(p => p.type === type);
  }

  projects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  res.json({
    success: true,
    data: {
      projects,
      count: projects.length
    }
  });
});

// Get voices
router.get('/voices', (req, res) => {
  res.json({
    success: true,
    data: voices
  });
});

// Get languages
router.get('/languages', (req, res) => {
  res.json({
    success: true,
    data: languages
  });
});

// Get music styles
router.get('/styles', (req, res) => {
  res.json({
    success: true,
    data: musicStyles
  });
});

// Helper functions
function generatePodcastSegments(topic, duration, hosts) {
  const segments = [];
  const segmentCount = Math.ceil(duration / 5);

  segments.push({
    type: 'intro',
    duration: 60,
    content: `Welcome to today's episode about ${topic}`,
    speaker: 'Host'
  });

  for (let i = 1; i < segmentCount - 1; i++) {
    segments.push({
      type: i % 2 === 0 ? 'main' : 'discussion',
      duration: 180,
      content: `Discussion point ${i}: ${topic} insights`,
      speaker: hosts > 1 ? 'Host ' + (i % hosts + 1) : 'Host'
    });
  }

  segments.push({
    type: 'outro',
    duration: 60,
    content: `Thanks for listening to today's episode about ${topic}`,
    speaker: 'Host'
  });

  return segments;
}

function generateShowNotes(topic, segments) {
  return {
    title: `Episode: ${topic}`,
    summary: `Today we discuss ${topic} in depth`,
    timestamps: segments.map((s, i) => ({
      time: `${Math.floor(i * 5)}:00`,
      title: s.type
    })),
    links: [],
    transcript: 'Full transcript available'
  };
}

function generateInstruments(style) {
  const instrumentSets = {
    upbeat: ['Drums', 'Bass', 'Guitar', 'Synth', 'Brass'],
    calm: ['Piano', 'Strings', 'Ambient Pad'],
    dramatic: ['Orchestra', 'Percussion', 'Bass', 'Choir'],
    corporate: ['Piano', 'Light Guitar', 'Subtle Percussion'],
    cinematic: ['Orchestra', 'Choir', 'Strings', 'Brass'],
    ambient: ['Pad', 'Soft Keys', 'Nature Sounds'],
    acoustic: ['Acoustic Guitar', 'Piano', 'Violin'],
    electronic: ['Synth', 'Drum Machine', 'Bass', 'FX']
  };

  return instrumentSets[style] || instrumentSets.upbeat;
}

function generateAudioMarkers(script) {
  const markers = [];
  const sentences = script.split(/[.!?]+/).filter(s => s.trim());

  let time = 0;
  sentences.forEach((sentence, i) => {
    const duration = sentence.split(/\s+/).length / 2.5;
    markers.push({
      id: `marker-${i}`,
      time: Math.round(time),
      label: `Section ${i + 1}`,
      content: sentence.substring(0, 50) + (sentence.length > 50 ? '...' : '')
    });
    time += duration;
  });

  return markers;
}

module.exports = router;