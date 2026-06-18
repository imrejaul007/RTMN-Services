/**
 * Twin Search Module
 * Search across all Digital Twins
 */

class TwinSearch {
  constructor() {
    // In-memory twins (in production, fetch from TwinOS)
    this.twins = {
      personal: {
        id: 'twin-personal',
        type: 'personal',
        name: 'Karim Personal Twin',
        profile: {
          name: 'Karim',
          email: 'karim@hojai.ai',
          goals: ['Build successful AI company', 'Stay healthy', 'Travel more'],
          preferences: { theme: 'dark', notifications: true }
        },
        memories: [],
        timeline: []
      },
      health: {
        id: 'twin-health',
        type: 'health',
        name: 'Karim Health Twin',
        vitals: {
          steps: 7234,
          sleepHours: 7.5,
          waterGlasses: 5,
          heartRate: 72
        },
        appointments: [
          { id: 'apt-1', doctor: 'Dr. Sharma', date: '2026-06-19', time: '11:00 AM', type: 'general' }
        ],
        medications: []
      },
      financial: {
        id: 'twin-financial',
        type: 'financial',
        name: 'Karim Financial Twin',
        accounts: [
          { id: 'acc-1', name: 'HDFC Savings', balance: 250000, type: 'savings' },
          { id: 'acc-2', name: 'ICICI Current', balance: 85000, type: 'current' }
        ],
        transactions: [
          { id: 'txn-1', date: '2026-06-18', amount: 1250, merchant: 'Uber', category: 'travel' },
          { id: 'txn-2', date: '2026-06-17', amount: 450, merchant: 'Swiggy', category: 'food' }
        ],
        budgets: []
      },
      relationship: {
        id: 'twin-relationship',
        type: 'relationship',
        name: 'Karim Relationship Twin',
        people: [
          { id: 'p-1', name: 'Rahul', relationship: 'business_partner', lastContact: '2026-06-15', score: 85 },
          { id: 'p-2', name: 'Priya', relationship: 'friend', lastContact: '2026-06-18', score: 90 },
          { id: 'p-3', name: 'Amit', relationship: 'colleague', lastContact: '2026-06-10', score: 75 },
          { id: 'p-4', name: 'Dr. Sharma', relationship: 'doctor', lastContact: '2026-06-01', score: 80 }
        ],
        events: [
          { id: 'evt-1', person: 'Rahul', event: 'birthday', date: '2026-07-15' },
          { id: 'evt-2', person: 'Priya', event: 'work anniversary', date: '2026-08-01' }
        ]
      },
      founder: {
        id: 'twin-founder',
        type: 'founder',
        name: 'Karim Founder Twin',
        ventures: [
          { id: 'v-1', name: 'HOJAI AI', status: 'active', kpis: { revenue: '10L', customers: 50 } }
        ],
        decisions: [],
        focusBlocks: []
      }
    };
  }

  /**
   * Search across all twins
   */
  async search(query, options = {}) {
    const { twinType, limit = 20 } = options;
    const q = query.toLowerCase();
    const results = [];

    // Search specified twin or all
    const twinsToSearch = twinType ? [this.twins[twinType]] : Object.values(this.twins);

    for (const twin of twinsToSearch) {
      if (!twin) continue;

      // Search based on twin type
      switch (twin.type) {
        case 'personal':
          this.searchPersonal(twin, q, results);
          break;
        case 'health':
          this.searchHealth(twin, q, results);
          break;
        case 'financial':
          this.searchFinancial(twin, q, results);
          break;
        case 'relationship':
          this.searchRelationship(twin, q, results);
          break;
        case 'founder':
          this.searchFounder(twin, q, results);
          break;
      }
    }

    // Sort by score
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  /**
   * Search people/contacts
   */
  async searchPeople(query, options = {}) {
    const { relationship, limit = 20 } = options;
    const q = query.toLowerCase();
    const people = this.twins.relationship?.people || [];

    let results = people.filter(p => {
      if (relationship && p.relationship !== relationship) return false;
      if (q) {
        return p.name.toLowerCase().includes(q) ||
               p.relationship.toLowerCase().includes(q);
      }
      return true;
    });

    // Score and sort
    results = results.map(p => ({
      ...p,
      source: 'person',
      score: p.name.toLowerCase().includes(q) ? 100 : 50,
      type: 'person'
    }));

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  /**
   * Search health data
   */
  async searchHealth(query, options = {}) {
    const { startDate, endDate, metric, limit = 20 } = options;
    const q = query.toLowerCase();
    const results = [];

    this.searchHealthTwin(q, results);

    return results.slice(0, limit);
  }

  /**
   * Search financial data
   */
  async searchFinance(query, options = {}) {
    const { type, startDate, endDate, limit = 20 } = options;
    const q = query.toLowerCase();
    const results = [];

    this.searchFinancialTwin(q, results);

    return results.slice(0, limit);
  }

  // ==================== PRIVATE METHODS ====================

  searchPersonal(twin, query, results) {
    const profile = twin.profile || {};

    if (profile.name?.toLowerCase().includes(query)) {
      results.push({ ...profile, source: 'twin', twinType: 'personal', type: 'profile', score: 100 });
    }

    profile.goals?.forEach(goal => {
      if (goal.toLowerCase().includes(query)) {
        results.push({ goal, source: 'twin', twinType: 'personal', type: 'goal', score: 80 });
      }
    });

    profile.preferences && Object.entries(profile.preferences).forEach(([key, value]) => {
      if (key.toLowerCase().includes(query) || String(value).toLowerCase().includes(query)) {
        results.push({ preference: key, value, source: 'twin', twinType: 'personal', type: 'preference', score: 60 });
      }
    });
  }

  searchHealthTwin(query, results) {
    const twin = this.twins.health;
    if (!twin) return;

    // Search vitals
    const vitals = twin.vitals || {};
    Object.entries(vitals).forEach(([key, value]) => {
      if (key.toLowerCase().includes(query) || String(value).includes(query)) {
        results.push({ metric: key, value, source: 'twin', twinType: 'health', type: 'vital', score: 90 });
      }
    });

    // Search appointments
    twin.appointments?.forEach(apt => {
      const searchText = `${apt.doctor} ${apt.type} ${apt.date}`.toLowerCase();
      if (searchText.includes(query)) {
        results.push({ ...apt, source: 'twin', twinType: 'health', type: 'appointment', score: 100 });
      }
    });

    // Search medications
    twin.medications?.forEach(med => {
      if (med.toLowerCase().includes(query)) {
        results.push({ medication: med, source: 'twin', twinType: 'health', type: 'medication', score: 85 });
      }
    });
  }

  searchFinancialTwin(query, results) {
    const twin = this.twins.financial;
    if (!twin) return;

    // Search accounts
    twin.accounts?.forEach(acc => {
      const searchText = `${acc.name} ${acc.type} ${acc.balance}`.toLowerCase();
      if (searchText.includes(query)) {
        results.push({ ...acc, source: 'twin', twinType: 'financial', type: 'account', score: 90 });
      }
    });

    // Search transactions
    twin.transactions?.forEach(txn => {
      const searchText = `${txn.merchant} ${txn.category} ${txn.amount}`.toLowerCase();
      if (searchText.includes(query)) {
        results.push({ ...txn, source: 'twin', twinType: 'financial', type: 'transaction', score: 100 });
      }
    });
  }

  searchRelationship(twin, query, results) {
    // Search people
    twin.people?.forEach(person => {
      const searchText = `${person.name} ${person.relationship}`.toLowerCase();
      if (searchText.includes(query)) {
        results.push({ ...person, source: 'twin', twinType: 'relationship', type: 'person', score: 100 });
      }
    });

    // Search events
    twin.events?.forEach(event => {
      const searchText = `${event.person} ${event.event} ${event.date}`.toLowerCase();
      if (searchText.includes(query)) {
        results.push({ ...event, source: 'twin', twinType: 'relationship', type: 'event', score: 90 });
      }
    });
  }

  searchFounder(twin, query, results) {
    twin.ventures?.forEach(venture => {
      const searchText = `${venture.name} ${venture.status}`.toLowerCase();
      if (searchText.includes(query)) {
        results.push({ ...venture, source: 'twin', twinType: 'founder', type: 'venture', score: 100 });
      }
    });
  }

  searchHealth(query, results) {
    this.searchHealthTwin(query, results);
  }
}

module.exports = TwinSearch;
