/**
 * Zoom Integration - Meeting scheduling & call intelligence
 */

import axios from 'axios';

const ZOOM_CONFIG = {
  accountId: process.env.ZOOM_ACCOUNT_ID || '',
  clientId: process.env.ZOOM_CLIENT_ID || '',
  clientSecret: process.env.ZOOM_CLIENT_SECRET || '',
};

export interface ZoomMeeting {
  id: string;
  topic: string;
  startTime: Date;
  duration: number;
  joinUrl: string;
  hostEmail: string;
  participants: string[];
  recordings?: Recording[];
}

export interface Recording {
  id: string;
  fileType: string;
  downloadUrl: string;
  duration: number;
  fileSize: number;
}

export interface CallInsights {
  meetingId: string;
  totalDuration: number;
  participantCount: number;
  speakingTime: Record<string, number>;
  sentiment: 'positive' | 'neutral' | 'negative';
  keyTopics: string[];
  actionItems: string[];
}

export class ZoomClient {
  private accessToken: string = '';
  private client = axios.create({
    baseURL: 'https://api.zoom.us/v2',
    timeout: 5000,
  });

  private async getAccessToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;

    try {
      const response = await axios.post(
        `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_CONFIG.accountId}`,
        {},
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${ZOOM_CONFIG.clientId}:${ZOOM_CONFIG.clientSecret}`).toString('base64')}`,
          },
        }
      );
      this.accessToken = response.data.access_token;
      return this.accessToken;
    } catch (error) {
      console.error('Zoom auth failed:', error);
      return '';
    }
  }

  async createMeeting(topic: string, startTime: Date, duration: number = 60): Promise<ZoomMeeting | null> {
    try {
      const token = await this.getAccessToken();
      const response = await this.client.post('/users/me/meetings', {
        topic,
        type: 2, // Scheduled meeting
        start_time: startTime.toISOString(),
        duration,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true,
          waiting_room: true,
        },
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      return {
        id: response.data.id,
        topic: response.data.topic,
        startTime: new Date(response.data.start_time),
        duration: response.data.duration,
        joinUrl: response.data.join_url,
        hostEmail: response.data.host_email,
        participants: [],
      };
    } catch (error) {
      console.error('Zoom meeting creation failed:', error);
      return null;
    }
  }

  async getMeeting(meetingId: string): Promise<ZoomMeeting | null> {
    try {
      const token = await this.getAccessToken();
      const response = await this.client.get(`/meetings/${meetingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      return {
        id: response.data.id,
        topic: response.data.topic,
        startTime: new Date(response.data.start_time),
        duration: response.data.duration,
        joinUrl: response.data.join_url,
        hostEmail: response.data.host_email,
        participants: [],
      };
    } catch (error) {
      return null;
    }
  }

  async getRecordings(meetingId: string): Promise<Recording[]> {
    try {
      const token = await this.getAccessToken();
      const response = await this.client.get(`/meetings/${meetingId}/recordings`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      return (response.data.recording_files || []).map((file: any) => ({
        id: file.id,
        fileType: file.file_type,
        downloadUrl: file.download_url,
        duration: file.recording_end ? 
          (new Date(file.recording_end).getTime() - new Date(file.recording_start).getTime()) / 1000 : 0,
        fileSize: file.file_size,
      }));
    } catch (error) {
      return [];
    }
  }

  async scheduleFromProposal(proposalId: string, prospectEmail: string): Promise<ZoomMeeting | null> {
    // Auto-schedule meeting from deal proposal
    const meeting = await this.createMeeting(
      `Proposal Review: ${proposalId}`,
      new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      60
    );

    if (meeting) {
      // Send calendar invite would go here
      console.log('Meeting scheduled:', meeting.joinUrl);
    }

    return meeting;
  }

  async getCallInsights(meetingId: string): Promise<CallInsights | null> {
    try {
      const token = await this.getAccessToken();
      const response = await this.client.get(`/meetings/${meetingId}/participants`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const participants = response.data.participants || [];

      return {
        meetingId,
        totalDuration: 0,
        participantCount: participants.length,
        speakingTime: {},
        sentiment: 'neutral',
        keyTopics: [],
        actionItems: [],
      };
    } catch (error) {
      return null;
    }
  }
}
