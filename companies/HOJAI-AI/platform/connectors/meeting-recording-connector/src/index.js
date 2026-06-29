/**
 * Meeting Recording Connector
 * Zoom, Teams, Google Meet recording + AI summary
 */

const axios = require('axios');
const crypto = require('crypto');

class MeetingRecordingClient {
  constructor(config) {
    this.provider = config.provider || 'zoom';

    if (this.provider === 'zoom') {
      this.clientId = config.clientId;
      this.clientSecret = config.clientSecret;
      this.accountId = config.accountId;
      this.baseUrl = 'https://api.zoom.us/v2';
      this.aiServiceUrl = config.aiServiceUrl;
    } else if (this.provider === 'teams') {
      this.tenantId = config.tenantId;
      this.clientId = config.clientId;
      this.clientSecret = config.clientSecret;
      this.baseUrl = 'https://graph.microsoft.com/v1.0';
    }

    this.webhookSecret = config.webhookSecret;
    this.aiEngineUrl = config.aiEngineUrl; // For summaries
  }

  // ===== ZOOM =====

  // Get OAuth token (Server-to-Server)
  async getZoomToken() {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    try {
      const response = await axios.post(
        `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${this.accountId}`,
        {},
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      return response.data.access_token;
    } catch (error) {
      throw new Error(`Zoom auth failed: ${error.message}`);
    }
  }

  // List recordings for user
  async getZoomRecordings(userId, fromDate, toDate) {
    const token = await this.getZoomToken();

    try {
      const response = await axios.get(
        `${this.baseUrl}/users/${userId}/recordings`,
        {
          params: {
            from: fromDate, // YYYY-MM-DD
            to: toDate,
            page_size: 100,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data.meetings.map(m => ({
        meetingId: m.id,
        topic: m.topic,
        startTime: m.start_time,
        duration: m.duration,
        hostId: m.host_id,
        downloadUrl: m.recording_files?.[0]?.download_url,
        playbackUrl: m.playback_url,
      }));
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Download recording
  async downloadZoomRecording(url, outputPath) {
    const token = await this.getZoomToken();

    try {
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'stream',
      });

      const writer = require('fs').createWriteStream(outputPath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Enable cloud recording
  async enableCloudRecording(userId) {
    const token = await this.getZoomToken();

    try {
      await axios.patch(
        `${this.baseUrl}/users/${userId}/settings`,
        {
          recording: {
            cloud_recording: 'on',
            record_audio_files: 'on',
            record_video_files: 'on',
          },
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ===== TEAMS =====

  // Get Teams recordings
  async getTeamsRecordings(userId, sinceDate) {
    const token = await this.getTeamsToken();

    try {
      const response = await axios.get(
        `${this.baseUrl}/users/${userId}/onlineMeetings?$filter=startDateTime ge ${sinceDate}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      return response.data.value.filter(m => m.recording?.contentUrl);
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getTeamsToken() {
    // Implement MSAL flow for Teams
    // ...
  }

  // ===== WEBHOOK =====

  verifyWebhook(payload, signature) {
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return signature === expected;
  }

  // ===== AI PROCESSING =====

  // Send recording for AI processing
  async processWithAI(recordingUrl, meetingId) {
    if (!this.aiEngineUrl) {
      throw new Error('AI engine URL not configured');
    }

    try {
      const response = await axios.post(`${this.aiEngineUrl}/summarize`, {
        recordingUrl,
        meetingId,
        provider: this.provider,
        options: {
          includeActionItems: true,
          includeSummary: true,
          includeKeyQuotes: true,
          maxSpeakers: 10,
        },
      });

      return {
        success: true,
        summary: response.data.summary,
        actionItems: response.data.actionItems,
        keyQuotes: response.data.keyQuotes,
        speakers: response.data.speakers,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Complete workflow: Get + Download + Process
  async processZoomRecording(meetingId) {
    // 1. Get recording URL
    // 2. Download to temp file
    // 3. Process with AI
    // 4. Return summary + action items
    // 5. Delete temp file
  }
}

module.exports = MeetingRecordingClient;
