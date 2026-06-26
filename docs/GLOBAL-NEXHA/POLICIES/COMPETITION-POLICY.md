# Competition Policy Framework

**Version:** 1.0  
**Last Updated:** June 26, 2026  
**Policy Owner:** Nexha Competition Authority  
**Jurisdiction:** Global (Multi-jurisdictional)

---

## 1. Preamble & Purpose

This Competition Policy establishes the rules governing fair competition within the Global Nexha Federation. As an autonomous business network operating across 190+ countries, Nexha must ensure a level playing field where businesses of all sizes can compete fairly while preventing monopolistic behaviors, anti-competitive agreements, and market manipulation.

**Core Principle:** The federation thrives when competition thrives. Anti-competitive behavior threatens the entire ecosystem.

---

## 2. Definitions & Scope

### 2.1 Key Definitions

```javascript
const COMPETITION_DEFINITIONS = {
  // Market Participants
  NEXHA_PARTICIPANT: "Any business entity operating within the Nexha federation",
  MARKETPLACE_SELLER: "Business offering goods/services through Nexha",
  MARKETPLACE_BUYER: "Business purchasing goods/services through Nexha",
  
  // Market Types
  TWO_SIDED_MARKET: "Platform connecting buyers and sellers",
  DIRECT_COMPETITION: "Businesses offering similar goods/services",
  COMPLEMENTARY_MARKETS: "Business whose products support each other",
  
  // Anti-Competitive Behaviors
  HORIZONTAL_AGREEMENT: "Agreement between competitors",
  VERTICAL_AGREEMENT: "Agreement between businesses at different levels",
  ABUSE_OF_DOMINANCE: "Exploitation of market power",
  
  // Market Thresholds
  SIGNIFICANT_MARKET_POWER: "≥25% market share in relevant market",
  DOMINANT_POSITION: "≥40% market share in relevant market",
  MONOPOLY: "≥70% market share in relevant market"
};
```

### 2.2 Scope of Application

| Category | Applies | Notes |
|----------|---------|-------|
| All Nexha participants | ✅ | Mandatory |
| HOJAI AI services | ✅ | Internal pricing subject to review |
| Third-party integrations | ✅ | Via API access policies |
| Cross-border transactions | ✅ | Multi-jurisdiction compliance |
| AI agent negotiations | ✅ | Agent behavior must be compliant |

---

## 3. Prohibited Anti-Competitive Behaviors

### 3.1 Horizontal Anti-Competitive Agreements

The following agreements between competitors are strictly prohibited:

```javascript
const PROHIBITED_HORIZONTAL_AGREEMENTS = {
  PRICE_FIXING: {
    definition: "Agreements to set prices at certain levels",
    examples: [
      "Minimum price agreements",
      "Maximum discount limits",
      "Coordinated price increases",
      "Algorithmic price signaling"
    ],
    severity: "SEVERE",
    penalty: "Expulsion + Damages × 3"
  },
  
  MARKET_ALLOCATION: {
    definition: "Agreements to divide markets between competitors",
    examples: [
      "Geographic market division",
      "Customer segment allocation",
      "Product category division",
      "Exclusive dealing by territory"
    ],
    severity: "SEVERE",
    penalty: "Expulsion + Damages × 3"
  },
  
  BID_RIGGING: {
    definition: "Coordinated behavior in procurement bidding",
    examples: [
      "Bid suppression",
      "Bid rotation",
      "Bid signaling",
      "Cover bidding"
    ],
    severity: "SEVERE",
    penalty: "Expulsion + blacklisting from procurement"
  },
  
  PRODUCTION_QUOTAS: {
    definition: "Agreements to limit production or sales",
    examples: [
      "Output restrictions",
      "Capacity limitations",
      "Sales volume caps"
    ],
    severity: "MODERATE",
    penalty: "Fine + Compliance plan"
  },
  
  INFORMATION_SHARING: {
    definition: "Exchange of competitively sensitive information",
    examples: [
      "Sharing pricing data",
      "Exchanging future business plans",
      "Coordinating inventory levels",
      "Sharing customer data"
    ],
    severity: "MODERATE",
    penalty: "Fine + Information barrier requirements"
  }
};
```

### 3.2 Vertical Anti-Competitive Restrictions

The following vertical restrictions require careful scrutiny:

```javascript
const VERTICAL_RESTRICTIONS = {
  // Per Se Illegal (Always prohibited)
  RESALE_PRICE_MAINTENANCE: {
    definition: "Fixing minimum or maximum resale prices",
    types: [
      "Minimum RPM - Absolute prohibition",
      "Maximum RPM - Allowed only if non-predatory"
    ],
    exception: "Recommended prices allowed if non-binding",
    severity: "SEVERE"
  },
  
  // Subject to Rule of Reason
  EXCLUSIVE_DEALING: {
    definition: "Requiring buyer to deal exclusively with one seller",
    thresholds: {
      safe_harbor: "<30% of relevant market",
      investigation: "≥30% market share",
      presumption_of_harm: "≥50% market share"
    },
    allowed_if: [
      "Efficiency justification",
      "No substantial foreclosure of market",
      "Competitors can compete for account"
    ]
  },
  
  TYING_ARRANGEMENTS: {
    definition: "Conditioning purchase of one product on another",
    scrutiny: "High - often anti-competitive",
    allowed_if: [
      "Two genuinely separate products",
      "Technical integration requirement",
      "Quality control justification",
      "No foreclosure of tied market"
    ]
  },
  
  PREDATORY_PRICING: {
    definition: "Pricing below cost to eliminate competitors",
    test: {
      cost_measure: "Average variable cost (AVC)",
      below_cost: "Price < AVC",
      recoupment: "Ability to raise prices after competitor elimination",
      duration: "Sufficient time for predation to work"
    },
    safe_harbor: "Price ≥ AVC, or price ≥ ATC with legitimate business reason"
  }
};
```

### 3.3 Abuse of Dominant Position

Participants with dominant positions (≥40% market share) are subject to additional restrictions:

```javascript
const DOMINANCE_RULES = {
  UNFAIR_PRICING: {
    definition: "Charging excessively high or low prices",
    excessive_pricing: {
      test: "Price significantly above competitive level",
      factors: [
        "Cost of production",
        "Price in comparable markets",
        "Competitor prices"
      ]
    },
    predation: {
      definition: "Prices below cost with intent to eliminate competition",
      test: "Prices < ATC with ability to sustain losses and recoup"
    }
  },
  
  REFUSAL_TO_DEAL: {
    definition: "Unjustified denial of access to essential facilities",
    essential_facility_test: [
      "Access necessary to compete",
      "No reasonable substitute",
      "Feasible duplication impossible",
      "Access can be provided without destroying product"
    ],
    allowed_if: [
      "Technical necessity",
      "Quality control",
      "Safety requirements",
      "Legitimate business reason"
    ]
  },
  
  DISCRIMINATORY_PRICING: {
    definition: "Applying different prices to similarly situated parties",
    prohibited_if: [
      "Not cost-justified",
      "Anti-competitive purpose",
      "Eliminates competition in downstream market"
    ],
    allowed_if: [
      "Cost differences",
      "Quantity discounts",
      "Payment terms",
      "Meeting competition"
    ]
  },
  
  EXCLUSIVE_SUPPLY: {
    definition: "Requiring suppliers to supply exclusively to one buyer",
    investigation_threshold: "Buyer ≥30% of relevant upstream market",
    allowed_if: [
      "Efficiency gains",
      "Investment justification",
      "No substantial foreclosure"
    ]
  }
};
```

---

## 4. AI-Specific Competition Rules

### 4.1 AI Agent Behavior Constraints

```javascript
const AI_COMPETITION_RULES = {
  // Algorithmic Pricing
  algorithmic_pricing: {
    prohibited: [
      "AI systems that signal prices to competitors",
      "Algorithms designed to follow competitor prices",
      "AI coordination with competitor AI systems"
    ],
    allowed: [
      "Independent AI price optimization",
      "Market-based pricing adjustments",
      "Dynamic pricing based on demand signals"
    ],
    monitoring: "Audit logs of AI pricing decisions required"
  },
  
  // AI Collusion Prevention
  collusion_prevention: {
    requirements: [
      "AI systems must have independent decision-making",
      "No data sharing between competitor AI systems",
      "Regular AI behavior audits",
      "Human oversight of AI pricing decisions"
    ],
    red_flags: [
      "Unusual price parallelism",
      "Coordinated promotional timing",
      "Similar inventory levels"
    ]
  },
  
  // AI Market Transparency
  transparency_requirements: {
    disclose: [
      "Use of AI for pricing decisions",
      "AI model type (if material to competition)",
      "Key factors in AI pricing"
    ],
    audit_rights: "Competition authority can audit AI systems"
  }
};
```

### 4.2 AI Pricing Audit System

```javascript
const AI_PRICING_AUDIT = {
  // Required logging for AI pricing decisions
  required_fields: [
    "timestamp",
    "participant_id",
    "product_category",
    "input_factors",
    "output_decision",
    "confidence_score",
    "human_reviewed"
  ],
  
  // Anomaly detection
  suspicious_patterns: [
    {
      name: "Price convergence",
      detection: "Similar price changes within time window",
      threshold: "Correlation > 0.8 within 24 hours"
    },
    {
      name: "Follow-the-leader",
      detection: "Price changes following specific competitor",
      threshold: ">5 instances per week"
    },
    {
      name: "Capacity signaling",
      detection: "Inventory changes precede competitor price changes",
      threshold: ">3 instances per week"
    }
  ]
};
```

---

## 5. Market Definition & Analysis

### 5.1 Relevant Market Definition

```javascript
const MARKET_DEFINITION = {
  product_market: {
    definition: "Products or services considered interchangeable",
    factors: [
      "Physical characteristics",
      "Intended use",
      "Price sensitivity",
      "Distribution channels",
      "Consumer preferences",
      "Supplier substitutability"
    ],
    hypothetical_monopolist_test: "Would 5-10% price increase be profitable?"
  },
  
  geographic_market: {
    definition: "Area where competition occurs",
    factors: [
      "Natural trade barriers",
      "Transportation costs",
      "Regulatory barriers",
      "Language/cultural barriers",
      "Consumer mobility"
    ]
  },
  
  temporal_market: {
    definition: "Time period for analysis",
    considerations: [
      "Seasonal variations",
      "Cyclical patterns",
      "Long-term vs short-term"
    ]
  }
};
```

### 5.2 Market Share Calculation

```javascript
const MARKET_SHARE_CALCULATION = {
  // Methods
  revenue_based: {
    formula: "Revenue / Total market revenue",
    advantages: "Data readily available",
    limitations: "May not reflect volumes"
  },
  
  volume_based: {
    formula: "Units sold / Total market units",
    advantages: "Direct competition measurement",
    limitations: "Ignores price differences"
  },
  
  capacity_based: {
    formula: "Capacity / Total market capacity",
    advantages: "Future competition indicator",
    limitations: "May not reflect actual output"
  },
  
  // Weighted composite
  composite_index: {
    formula: "(Revenue × 0.4) + (Volume × 0.3) + (Capacity × 0.3)",
    usage: "Primary market share metric"
  }
};
```

### 5.3 Dominance Assessment

```javascript
const DOMINANCE_ASSESSMENT = {
  factors: [
    // Market shares
    { factor: "Market share", weight: 0.30 },
    { factor: "Market share trend", weight: 0.10 },
    
    // Barriers to entry
    { factor: "Capital requirements", weight: 0.10 },
    { factor: "Regulatory barriers", weight: 0.10 },
    { factor: "Network effects", weight: 0.10 },
    
    // Countervailing factors
    { factor: "Buyer power", weight: 0.15 },
    { factor: "Competitor strength", weight: 0.10 },
    { factor: "Potential entry", weight: 0.05 }
  ],
  
  dominance_threshold: {
    presumption: "≥40% share creates presumption of dominance",
    rebuttal_evidence: [
      "Market is contestable",
      "Low barriers to entry",
      "Strong countervailing buyer power",
      "Rapid market evolution"
    ]
  }
};
```

---

## 6. Merger Control

### 6.1 Merger Notification Thresholds

```javascript
const MERGER_NOTIFICATION = {
  thresholds: {
    worldwide_turnover: {
      threshold: "≥$500M combined global revenue",
      all_parties: "At least one party ≥$50M"
    },
    nexus_turnover: {
      threshold: "≥$100M combined Nexha revenue",
      party_threshold: "At least one party ≥$25M Nexha revenue"
    },
    market_share: {
      threshold: "≥25% combined market share",
      note: "Lower threshold for highly concentrated markets"
    }
  },
  
  notification_timing: {
    pre_merger: "Before closing",
    waiting_period: "30 days (simplified) / 90 days (full review)",
    suspension: "Cannot close during waiting period"
  },
  
  exemptions: {
    failing_firm: "Competitor exit would occur anyway",
    passive_investment: "<10% equity, no management rights",
    temporary_holding: "Investment to be divested within 12 months"
  }
};
```

### 6.2 Merger Review Criteria

```javascript
const MERGER_REVIEW = {
  // Competitive Effects
  horizontal_effects: {
    unilateral_effects: [
      "Elimination of close competitor",
      "Increased market power",
      "Reduced innovation incentives"
    ],
    coordinated_effects: [
      "Reduced number of competitors",
      "Increased transparency",
      "Facilitates collusion"
    ]
  },
  
  vertical_effects: {
    foreclosure: [
      "Upstream input foreclosure",
      "Downstream customer foreclosure",
      "Bundling/tying"
    ],
    input_exclusion: "Competitors denied access to inputs",
    customer_exclusion: "Competitors denied access to customers"
  },
  
  conglomerate_effects: {
    portfolio_power: "Multi-market presence deters entry",
    bundled_foreclosure: "Tying maintenance through portfolio"
  },
  
  // Efficiencies
  efficiency_defense: {
    requirements: [
      "Merger-specific efficiencies",
      "Verifiable efficiencies",
      "Consumer pass-through",
      "Efficiencies outweigh anti-competitive effects"
    ]
  },
  
  // Remedies
  possible_outcomes: [
    "Clear (no concerns)",
    "Conditional approval (with remedies)",
    "Blocked (significant harm)"
  ]
};
```

### 6.3 Merger Remedies

```javascript
const MERGER_REMEDIES = {
  structural: {
    // Divestitures
    type: "Sale of assets/business lines",
    timing: "Upfront or within specified period",
    buyer_approval: "Competition authority approval required",
    hold_separate: "Maintain independent until completion"
  },
  
  behavioral: {
    // Access remedies
    type: "Required access to inputs/platforms",
    examples: [
      "Data sharing requirements",
      "Interoperability mandates",
      "Non-discrimination obligations"
    ],
    monitoring: "Ongoing compliance monitoring required"
  },
  
  hybrid: {
    type: "Structural + behavioral combination",
    usage: "Complex cases where pure structural insufficient"
  }
};
```

---

## 7. Network Effects & Platform Competition

### 7.1 Multi-Sided Platform Rules

```javascript
const PLATFORM_COMPETITION = {
  // Two-sided market considerations
  market_definition: {
    approach: "Define market for each side separately",
    with_interactions: "Consider cross-platform network effects",
    ssndip_test: "Hypothetical monopolist test on each side"
  },
  
  // Self-preferencing rules
  self_preferencing: {
    prohibited: [
      "Preferencing own products in search/ranking",
      "Lower fees for own products",
      "Better access for own services"
    ],
    allowed: [
      "Same treatment as competitors",
      "Transparent ranking criteria",
      "Non-discrimination commitments"
    ]
  },
  
  // Essential facility doctrine
  essential_facility_rules: {
    platform_responsibilities: [
      "Non-discriminatory access",
      "Interoperability standards",
      "Fair API terms",
      "Reasonable pricing"
    ],
    exceptions: [
      "Technical necessity",
      "Security/privacy requirements",
      "Quality maintenance"
    ]
  }
};
```

### 7.2 Network Effect Monetization

```javascript
const NETWORK_MONETIZATION = {
  allowed: [
    // Value creation monetization
    "Subscription fees for platform access",
    "Commission on transactions",
    "Premium features and services",
    "Advertising (if disclosed)",
    "Data analytics services"
  ],
  
  prohibited: [
    // Anti-competitive monetization
    "Rent extraction from network effects",
    "Forcing exclusive arrangements",
    "Cross-subsidization to undercut competitors",
    "Tying platform access to unrelated services"
  ],
  
  fee_transparency: {
    required: [
      "Clear fee structure",
      "No hidden fees",
      "Reasonableness review",
      "Annual fee review"
    ]
  }
};
```

---

## 8. State Aid & Subsidies

### 8.1 Federation-Level Support

```javascript
const FEDERATION_SUPPORT = {
  // Permitted support
  permitted: [
    "General infrastructure development",
    "Universal service obligations",
    "Research and development grants",
    "SME support programs",
    "Environmental/ESG initiatives"
  ],
  
  // Conditional support
  conditional: [
    "Sector-specific support (requires justification)",
    "Regional development (time-limited)",
    "Crisis support (temporary)"
  ],
  
  // Prohibited
  prohibited: [
    "Market-distorting subsidies",
    "Export-contingent support",
    "Local content requirements",
    "Export finance at below-market rates"
  ]
};
```

### 8.2 Member State Support

```javascript
const MEMBER_STATE_SUPPORT = {
  notification_required: [
    "Support ≥$100M to single recipient",
    "Sector-specific support",
    "Regional support ≥$50M",
    "Any support to dominant players"
  ],
  
  assessment_criteria: [
    "Necessity of aid",
    "Appropriateness (subsidy vs other instruments)",
    "Instrument (grant, loan, tax, equity)",
    "Incentive effect",
    "Proportionality",
    "Competition distortion",
    "Trade diversion"
  ]
};
```

---

## 9. Enforcement Mechanisms

### 9.1 Investigation Powers

```javascript
const INVESTIGATION_POWERS = {
  information_requests: {
    formal_requirements: [
      "Written request with legal basis",
      "Reasonable time to respond",
      "Proportionality to investigation"
    ],
    sanctions: "Non-compliance = presumption of guilt"
  },
  
  dawn_raids: {
    triggers: [
      "Refusal to provide information",
      "Evidence tampering risk",
      "Emergency situations"
    ],
    procedures: [
      "Warrant required",
      "Simultaneous multiple locations",
      "Legal privilege respected"
    ]
  },
  
 监听_intercept: {
    threshold: "Serious anti-competitive conduct",
    authorization: "Senior authority approval",
    safeguards: "Time limits, review mechanisms"
  }
};
```

### 9.2 Sanctions & Penalties

```javascript
const SANCTIONS = {
  // Financial penalties
  financial: {
    participation_fee_violation: "Up to 10% of annual revenue",
    procedural_violation: "Up to 1% of annual revenue",
    gun_jumping: "Up to 5% of annual revenue",
    ongoing: "Up to 5% of daily revenue during violation"
  },
  
  // Behavioral remedies
  behavioral: [
    "Compliance program requirements",
    "Monitor/trustee appointments",
    "Information disclosure obligations",
    "Access commitments",
    "Pricing constraints"
  ],
  
  // Structural remedies
  structural: [
    "Divestiture of assets",
    "Business separation",
    "Licensing obligations",
    "Termination of agreements"
  ],
  
  // Exclusion
  exclusion: [
    "Temporary suspension from federation",
    "Permanent expulsion",
    "Blacklisting from public contracts",
    "Reputation damage (public disclosure)"
  },
  
  // Criminal (for individuals)
  criminal: {
    applies_to: ["Executives authorizing violations", "Cartel participants"],
    penalties: [
      "Personal fines",
      "Imprisonment (in applicable jurisdictions)",
      "Disqualification as director"
    ]
  }
};
```

### 9.3 Leniency Program

```javascript
const LENIENCY_PROGRAM = {
  purpose: "Encourage reporting of anti-competitive behavior",
  
  tiers: {
    first_immunity: {
      position: "First to report",
      benefits: [
        "Full immunity from fines",
        "Protection from behavioral remedies",
        "Priority in damage claims"
      ],
      requirements: [
        "Prompt reporting",
        "Full cooperation",
        "No coercion of others",
        "Violation ended on reporting"
      ]
    },
    
    second_reduction: {
      position: "Second to report",
      reduction: "30-50% fine reduction",
      requirements: [
        "Substantial added value",
        "Continued cooperation",
        "Evidence not available to authority"
      ]
    },
    
    third_reduction: {
      position: "Subsequent reporters",
      reduction: "Up to 30% fine reduction",
      requirements: [
        "Cooperation adds value",
        "Continued cooperation"
      ]
    }
  }
};
```

---

## 10. Competition Compliance Program

### 10.1 Required Compliance Elements

```javascript
const COMPLIANCE_PROGRAM = {
  required_for: [
    "Participants with ≥25% market share",
    "Frequent API access users",
    "New participants (voluntary)"
  ],
  
  minimum_requirements: [
    {
      element: "Governance",
      requirements: [
        "Board-level competition oversight",
        "Compliance officer appointment",
        "Reporting channels"
      ]
    },
    {
      element: "Policies",
      requirements: [
        "Written competition policy",
        "AI behavior guidelines",
        "Deal approval procedures"
      ]
    },
    {
      element: "Training",
      requirements: [
        "Annual competition training",
        "Specific training for at-risk roles",
        "Testing/certification"
      ]
    },
    {
      element: "Monitoring",
      requirements: [
        "Regular compliance audits",
        "AI system reviews",
        "Hotline for concerns"
      ]
    },
    {
      element: "Enforcement",
      requirements: [
        "Disciplinary procedures",
        "Remediation protocols",
        "Self-reporting policy"
      ]
    }
  ]
};
```

### 10.2 Compliance Certification

```javascript
const COMPLIANCE_CERTIFICATION = {
  annual_certification: {
    required: true,
    content: [
      "Competition policy acknowledgment",
      "No violations self-reporting",
      "Compliance program confirmation",
      "Changes disclosure"
    },
    signatories: ["CEO", "Legal Counsel", "Compliance Officer"]
  },
  
  audit_rights: {
    nexus_rights: "Authority can audit compliance programs",
    frequency: "Every 3 years (random selection)",
    scope: [
      "Policies and procedures",
      "Training records",
      "AI system logs",
      "Deal approval files"
    ]
  }
};
```

---

## 11. Market Studies & Research

### 11.1 Market Investigation Powers

```javascript
const MARKET_INVESTIGATION = {
  trigger_conditions: [
    "Consumer harm indicators",
    "Innovation concerns",
    "Barrier to entry patterns",
    "Price convergence patterns",
    "Complaints from market participants"
  ],
  
  process: {
    phase1_screening: "6 weeks - Initial assessment",
    phase2_full: "12 months - Detailed investigation",
    phase3_remedies: "6 months - Remedy design"
  },
  
  powers: [
    "Information requests",
    "Site visits",
    "Expert appointments",
    "Hearings"
  ]
};
```

### 11.2 Sector Inquiries

```javascript
const SECTOR_INQUIRIES = {
  purpose: "Cross-sector analysis of competition",
  
  topics: [
    "AI platform competition",
    "Cross-platform data usage",
    "Algorithmic decision-making",
    "Network effect sustainability",
    "Interoperability standards"
  ],
  
  recommendations: [
    "Regulation updates",
    "New guidance",
    "Enforcement priorities",
    "Structural remedies"
  ]
};
```

---

## 12. Appeals & Review

### 12.1 Appeal Process

```javascript
const APPEAL_PROCESS = {
  internal_appeal: {
    body: "Nexha Competition Appeals Board",
    grounds: [
      "Procedural irregularity",
      "Error of law",
      "Manifest error in assessment",
      "Disproportionality"
    ],
    timeline: "30 days from decision"
  },
  
  external_appeal: {
    body: "Designated arbitration panel",
    grounds: [
      "Jurisdictional questions",
      "Inter-federation matters",
      "Constitutional issues"
    ],
    binding: true
  }
};
```

---

## 13. Governance Structure

### 13.1 Competition Authority

```javascript
const COMPETITION_AUTHORITY = {
  // Structure
  board: {
    members: 9,
    composition: [
      "4 Industry experts",
      "3 Legal professionals",
      "2 Consumer representatives"
    ],
    term: "3 years, renewable once"
  },
  
  enforcement_division: {
    responsibilities: [
      "Complaint investigation",
      "Market studies",
      "Merger review",
      "Enforcement actions"
    ]
  },
  
  legal_division: {
    responsibilities: [
      "Decision drafting",
      "Appeal preparation",
      "Policy guidance"
    ]
  },
  
  economics_division: {
    responsibilities: [
      "Market analysis",
      "Damage quantification",
      "Efficiency assessment"
    ]
  }
};
```

### 13.2 Transparency

```javascript
const TRANSPARENCY = {
  public_disclosure: [
    "Non-confidential decision versions",
    "Annual report",
    "Statistics on investigations",
    "Enforcement priorities"
  ],
  
  confidential_information: [
    "Business secrets",
    "Commercially sensitive data",
    "Ongoing investigation details",
    "Leniency applicant information"
  ]
};
```

---

## 14. Implementation Timeline

| Phase | Description | Target Date |
|-------|-------------|-------------|
| **Phase 1** | Core competition infrastructure | Q3 2026 |
| **Phase 2** | AI-specific competition rules | Q4 2026 |
| **Phase 3** | Merger control procedures | Q4 2026 |
| **Phase 4** | Full enforcement capability | Q1 2027 |

---

## 15. Appendix

### A. Prohibited Agreement Checklist

| Agreement Type | Example | Risk Level |
|---------------|---------|-----------|
| Price-fixing | Competitors agree on minimum price | HIGH |
| Market allocation | Competitors divide territories | HIGH |
| Bid-rigging | Coordinated responses to RFPs | HIGH |
| Output restrictions | Competitors limit production | MEDIUM |
| Information sharing | Competitors share pricing data | MEDIUM |
| Resale price maintenance | Minimum advertised price | HIGH |
| Exclusive dealing | Required supplier exclusivity | MEDIUM |
| Tying | Required bundled purchase | MEDIUM |

### B. Dominance Indicators

| Indicator | Dominance Threshold |
|-----------|-------------------|
| Market share | ≥40% |
| Market share trend | Rapidly increasing |
| Barriers to entry | High |
| Countervailing buyer power | Low |
| Innovation rate | Declining |
| Profitability | Above competitive level |

### C. Contact

For questions about competition compliance:
- **Competition Authority:** competition@nexha.io
- **Compliance Team:** compliance@nexha.io
- **Confidential Reporting:** report@nexha.io

---

**Document Control**
- Version: 1.0
- Approved by: Nexha Governance Board
- Review Date: December 26, 2026
- Classification: Public
