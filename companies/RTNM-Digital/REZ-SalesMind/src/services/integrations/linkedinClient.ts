/**
 * LinkedIn Integration - Prospect enrichment & company data
 * FIXED: unified to v2 API, safe URL encoding
 */
import axios from 'axios';

const LINKEDIN_CONFIG = {
    accessToken: process.env.LINKEDIN_ACCESS_TOKEN || '',
    companyToken: process.env.LINKEDIN_COMPANY_TOKEN || '',
};

export class LinkedInClient {
    private client = axios.create({
        baseURL: 'https://api.linkedin.com/v2',
        headers: { Authorization: `Bearer ${LINKEDIN_CONFIG.accessToken}`, 'LinkedIn-Version': '202304' },
        timeout: 5000,
    });

    async getProfile(email: string | undefined, name: string | undefined): Promise<unknown | null> {
        try {
            if (!email || !LINKEDIN_CONFIG.accessToken) return this.getMockProfile(name || 'Unknown');
            const response = await this.client.get('/emailAddress', { params: { q: 'emailAddress', email } });
            const personId = response.data.id;
            if (personId) return this.getProfileById(personId);
            return null;
        } catch { return this.getMockProfile(name || 'Unknown'); }
    }

    async getProfileById(profileId: string): Promise<unknown | null> {
        try {
            const response = await this.client.get(`/people/${encodeURIComponent(profileId)}`, { params: { projection: '(id,firstName,lastName,headline,positions,location)' } });
            const data = response.data;
            return {
                id: data.id,
                firstName: data.firstName,
                lastName: data.lastName,
                headline: data.headline,
                position: data.positions?.values?.[0]?.title,
                company: data.positions?.values?.[0]?.company?.name,
                location: data.location,
                profileUrl: `https://linkedin.com/in/${encodeURIComponent(String(data.id))}`,
            };
        } catch { return null; }
    }

    async getCompany(companyName: string): Promise<unknown | null> {
        try {
            const response = await this.client.get('/organizations', { params: { q: 'search', search: companyName } });
            const company = response.data.elements?.[0];
            if (!company) return null;
            return { id: company.id, name: company.localizedName, industry: company.industry, size: company.staffCountRange, website: company.website, specialties: company.specialties };
        } catch { return this.getMockCompany(companyName); }
    }

    async enrichLead(leadData: { email?: string; name?: string; company?: string }): Promise<{ profile?: unknown; company?: unknown; insights: string[]; isMockData: boolean }> {
        const insights: string[] = [];
        let company: unknown = undefined;
        let profile: unknown = undefined;
        let isMockData = true;

        if (!LINKEDIN_CONFIG.accessToken) return { insights, isMockData: true };

        try {
            profile = await this.getProfile(leadData.email, leadData.name);
            if (profile) {
                isMockData = false;
                const p = profile as { firstName?: string; headline?: string; connections?: number };
                insights.push(`${p.firstName || 'This contact'} is currently: ${p.headline || 'unknown'}`);
                if (p.connections && p.connections > 500) insights.push('Well-connected professional (500+ connections)');
            }
        } catch { /* fall through */ }

        try {
            if (leadData.company) {
                company = await this.getCompany(leadData.company);
                if (company) {
                    isMockData = false;
                    const c = company as { size?: string };
                    if (c.size) insights.push(`Company size: ${c.size}`);
                }
            }
        } catch { /* fall through */ }

        return { profile: isMockData ? undefined : profile, company: isMockData ? undefined : company, insights, isMockData };
    }

    getMockProfile(name: string) {
        const parts = name.split(' ');
        return { id: 'mock_' + Date.now(), firstName: parts[0] || 'John', lastName: parts.slice(1).join(' ') || 'Doe', headline: 'Sales Professional', profileUrl: 'https://linkedin.com/in/prospect', isMockData: true };
    }

    getMockCompany(name: string) {
        return { id: 'mock_company', name, industry: 'Technology', size: '51-200', website: `https://${name.toLowerCase().replace(/\s+/g, '')}.com`, isMockData: true };
    }
}
