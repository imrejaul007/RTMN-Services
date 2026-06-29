/**
 * Background Check Connector
 * Verify candidate backgrounds via Checkr API
 */

const axios = require('axios');

class BackgroundCheckClient {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.checkr.com/v1';
    this.provider = config.provider || 'checkr'; // checkr, sterling, etc.
  }

  async request(method, path, data) {
    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${path}`,
        headers: {
          Authorization: `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}`,
          'Content-Type': 'application/json',
        },
        data,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  // Create candidate
  async createCandidate({ firstName, lastName, email, phone, dob, ssn }) {
    return this.request('POST', '/candidates', {
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      dob,
      ssn,
    });
  }

  // Order background check
  async orderCheck({ candidateId, packageType = 'tasker_pro' }) {
    return this.request('POST', '/reports', {
      candidate_id: candidateId,
      package: packageType,
      work_location: { country: 'US' },
    });
  }

  // Order specific check
  async orderSpecificCheck({ candidateId, product }) {
    // product: criminal_background_check, motor_vehicle_report, etc.
    return this.request('POST', '/reports', {
      candidate_id: candidateId,
      package: packageType,
      product_ids: [product],
    });
  }

  // Get report status
  async getReport(reportId) {
    return this.request('GET', `/reports/${reportId}`);
  }

  // Get candidate
  async getCandidate(candidateId) {
    return this.request('GET', `/candidates/${candidateId}`);
  }

  // Full background check workflow
  async check({ firstName, lastName, email, phone, dob, ssn, packageType = 'tasker_pro' }) {
    // 1. Create candidate
    const createResult = await this.createCandidate({
      firstName, lastName, email, phone, dob, ssn
    });

    if (!createResult.success) return createResult;

    const candidate = createResult.data;
    const candidateId = candidate.id;

    // 2. Order check
    const orderResult = await this.orderCheck({ candidateId, packageType });

    if (!orderResult.success) {
      return { ...orderResult, candidateId };
    }

    const report = orderResult.data;

    return {
      success: true,
      data: {
        candidateId,
        reportId: report.id,
        status: report.status,
        candidate: {
          id: candidate.id,
          name: `${candidate.first_name} ${candidate.last_name}`,
          email: candidate.email,
        },
        report,
      },
    };
  }

  // Webhook handlers
  handleReportUpdate(payload) {
    const report = payload.data.object;

    console.log(`Report ${report.id} status: ${report.status}`);

    if (report.status === 'complete') {
      console.log('Result:', report.result);
    } else if (report.status === 'consider') {
      console.log('Consider manual review');
    }

    return {
      reportId: report.id,
      status: report.status,
      result: report.result,
      adjudication: report.adjudication,
    };
  }
}

module.exports = BackgroundCheckClient;
