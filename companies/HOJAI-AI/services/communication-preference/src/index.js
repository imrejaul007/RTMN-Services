/**
 * HOJAI Communication Preference Service
 *
 * Determines best channel and tone for each customer.
 * Part of the Customer Intelligence SDK suite.
 *
 * Port: 4905
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const PORT = process.env.PORT || 4905;
const SERVICE_NAME = 'communication-preference';
const NO_LISTEN = process.env.NO_LISTEN === '1';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

function calculateCommunicationPreferences(data) {
  const { interactionHistory, channelHistory, sentimentHistory } = data;

  // Preferred channel
  let channel = 'whatsapp';
  let secondaryChannel = 'email';

  if (channelHistory) {
    const channels = [
      { name: 'whatsapp', count: channelHistory.whatsapp || 0 },
      { name: 'email', count: channelHistory.email || 0 },
      { name: 'sms', count: channelHistory.sms || 0 },
      { name: 'push', count: channelHistory.push || 0 }
    ];
    channels.sort((a, b) => b.count - a.count);
    channel = channels[0].name;
    secondaryChannel = channels[1]?.name || 'email';
  }

  // Preferred tone
  let tone = 'friendly';
  if (sentimentHistory) {
    if (sentimentHistory.negative > sentimentHistory.positive) {
      tone = 'empathetic';
    } else if (sentimentHistory.positive > sentimentHistory.negative * 2) {
      tone = 'friendly';
    } else {
      tone = 'formal';
    }
  }

  // Best time
  let bestTime = 'evening';
  if (interactionHistory) {
    const { lastInteractionTime } = interactionHistory;
    if (lastInteractionTime) {
      const hour = new Date(lastInteractionTime).getHours();
      if (hour >= 6 && hour < 12) bestTime = 'morning';
      else if (hour >= 12 && hour < 18) bestTime = 'afternoon';
      else bestTime = 'evening';
    }
  }

  // Personalization settings
  const greetingStyle = tone === 'friendly' ? 'casual' : 'formal';
  const emojiUsage = tone === 'friendly' ? 'medium' : 'low';

  return {
    preferred_channel: channel,
    secondary_channel: secondaryChannel,
    preferred_tone: tone,
    best_time: bestTime,
    language: 'english',
    personalization: {
      greeting_style: greetingStyle,
      emoji_usage: emojiUsage,
      personalization_level: 'standard'
    }
  };
}

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: SERVICE_NAME, version: '1.0.0', timestamp: new Date().toISOString() });
});

app.post('/api/communication/preferences', (req, res) => {
  try {
    const result = calculateCommunicationPreferences(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/communication/best-time/:customerId', (req, res) => {
  res.json({ time: 'evening', score: 0.85 });
});

if (!NO_LISTEN) {
  app.listen(PORT, () => console.log(`Communication Preference Service listening on port ${PORT}`));
}

module.exports = app;
