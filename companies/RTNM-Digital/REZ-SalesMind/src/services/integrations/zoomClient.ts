/**
 * Zoom Integration - Meeting scheduling & call intelligence
 * FIXED: token caching with expiry check, credentials validation
 */
import axios, { AxiosInstance } from 'axios';

const ZOOM_CONFIG = {
    accountId: process.env.ZOOM_ACCOUNT_ID || '',
    clientId: process.env.ZOOM_CLIENT_ID || '',
    clientSecret: process.env.ZOOM_CLIENT_SECRET || '',
};

export class ZoomClient {
    private accessToken = '';
    private tokenExpiry = 0; // Unix timestamp

    isConfigured(): boolean {
        return !!(ZOOM_CONFIG.accountId && ZOOM_CONFIG.clientId && ZOOM_CONFIG.clientSecret);
    }

    private async getAccessToken(): Promise<string> {
        if (!this.isConfigured()) return '';

        // Return cached token if still valid (with 60s buffer)
        if (this.accessToken && Date.now() < this.tokenExpiry - 60000) {
            return this.accessToken;
        }

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
            this.tokenExpiry = Date.now() + (response.data.expires_in || 3600) * 1000;
            return this.accessToken;
        } catch (error) {
            console.error('Zoom auth failed:', error);
            return '';
        }
    }

    async createMeeting(topic: string, startTime: Date, duration = 60): Promise<{
        id: number; topic: string; startTime: Date; duration: number;
        joinUrl: string; hostEmail: string; participants: unknown[];
    } | null> {
        try {
            const token = await this.getAccessToken();
            if (!token) return null;

            const response = await this.client.post('/users/me/meetings', {
                topic,
                type: 2,
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

    async getMeeting(meetingId: number): Promise<{
        id: number; topic: string; startTime: Date; duration: number;
        joinUrl: string; hostEmail: string; participants: unknown[];
    } | null> {
        try {
            const token = await this.getAccessToken();
            if (!token) return null;

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

    async getRecordings(meetingId: number): Promise<unknown[]> {
        try {
            const token = await this.getAccessToken();
            if (!token) return [];

            const response = await this.client.get(`/meetings/${meetingId}/recordings`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            return (response.data.recording_files || []).map((file: {
                id: string; file_type: string; download_url: string;
                recording_start?: string; recording_end?: string; file_size: number;
            }) => ({
                id: file.id,
                fileType: file.file_type,
                downloadUrl: file.download_url,
                duration: file.recording_end && file.recording_start
                    ? (new Date(file.recording_end).getTime() - new Date(file.recording_start).getTime()) / 1000
                    : 0,
                fileSize: file.file_size,
            }));
        } catch (error) {
            return [];
        }
    }

    async scheduleFromProposal(proposalId: string, prospectEmail: string): Promise<unknown | null> {
        const meeting = await this.createMeeting(
            `Proposal Review: ${proposalId}`,
            new Date(Date.now() + 24 * 60 * 60 * 1000),
            60
        );
        if (meeting) {
            console.log('Meeting scheduled:', meeting.joinUrl);
        }
        return meeting;
    }

    async getCallInsights(meetingId: number): Promise<{
        meetingId: number; totalDuration: number; participantCount: number;
        speakingTime: Record<string, number>; sentiment: string; keyTopics: string[]; actionItems: string[];
    } | null> {
        try {
            const token = await this.getAccessToken();
            if (!token) return null;

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

    private get client(): AxiosInstance {
        return axios.create({
            baseURL: 'https://api.zoom.us/v2',
            timeout: 5000,
        });
    }
}
