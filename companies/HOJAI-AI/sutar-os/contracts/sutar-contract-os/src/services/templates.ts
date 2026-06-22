// ============================================================================
// SUTAR Contract OS - Template Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { ContractTemplate, TemplateVariable, Clause, ContractType, ApiResponse } from '../types/index';

// In-memory store for templates
const templateStore = new Map<string, ContractTemplate>();

// Pre-built templates
const initializeDefaultTemplates = (): void => {
  const defaultTemplates: Partial<ContractTemplate>[] = [
    {
      name: 'Standard Service Agreement',
      description: 'A comprehensive service agreement template for professional services',
      type: 'service',
      category: 'Professional Services',
      terms: `This Service Agreement ("Agreement") is entered into as of {{effective_date}} by and between {{party_a_name}} ("Service Provider") and {{party_b_name}} ("Client").

WHEREAS, the Service Provider agrees to provide certain services to the Client; and
WHEREAS, the Client desires to engage the Service Provider to perform such services;

NOW, THEREFORE, in consideration of the mutual covenants and agreements contained herein, the parties agree as follows:

1. SERVICES
The Service Provider agrees to perform the services described in Exhibit A attached hereto ("Services").

2. TERM
This Agreement shall commence on {{start_date}} and continue until {{end_date}}, unless earlier terminated in accordance with Section 8.

3. COMPENSATION
The Client agrees to pay the Service Provider {{compensation_amount}} {{currency}} for the Services, payable according to the payment schedule in Exhibit B.

4. INDEPENDENT CONTRACTOR
The Service Provider is an independent contractor and not an employee of the Client.

5. CONFIDENTIALITY
Both parties agree to maintain the confidentiality of all proprietary information disclosed during the term of this Agreement.

6. INTELLECTUAL PROPERTY
All work product created by the Service Provider shall be the property of the Client upon full payment.

7. LIMITATION OF LIABILITY
Neither party shall be liable for any indirect, incidental, special, or consequential damages.

8. TERMINATION
Either party may terminate this Agreement with {{notice_days}} days written notice.`,
      clauses: [
        { id: 'clause-1', title: 'Services Scope', content: 'The Services shall be performed in accordance with industry standards.', required: true, category: 'general', order: 1 },
        { id: 'clause-2', title: 'Payment Terms', content: 'Payment is due within {{net_days}} days of invoice date.', required: true, category: 'payment', order: 2 },
        { id: 'clause-3', title: 'Confidentiality', content: 'All confidential information must be protected and not disclosed to third parties.', required: true, category: 'confidentiality', order: 3 },
        { id: 'clause-4', title: 'Termination Rights', content: 'Either party may terminate with proper notice as specified.', required: true, category: 'termination', order: 4 },
        { id: 'clause-5', title: 'Indemnification', content: 'Each party agrees to indemnify the other against claims arising from their negligence.', required: false, category: 'liability', order: 5 },
        { id: 'clause-6', title: 'Governing Law', content: 'This Agreement shall be governed by the laws of {{jurisdiction}}.', required: true, category: 'legal', order: 6 },
      ],
      variables: [
        { name: 'effective_date', label: 'Effective Date', type: 'date', required: true, description: 'Date when agreement becomes effective' },
        { name: 'party_a_name', label: 'Service Provider Name', type: 'string', required: true, description: 'Legal name of the service provider' },
        { name: 'party_b_name', label: 'Client Name', type: 'string', required: true, description: 'Legal name of the client' },
        { name: 'start_date', label: 'Start Date', type: 'date', required: true, description: 'Contract start date' },
        { name: 'end_date', label: 'End Date', type: 'date', required: true, description: 'Contract end date' },
        { name: 'compensation_amount', label: 'Compensation Amount', type: 'number', required: true, description: 'Total contract value' },
        { name: 'currency', label: 'Currency', type: 'select', required: true, defaultValue: 'INR', options: ['INR', 'USD', 'EUR', 'GBP'], description: 'Payment currency' },
        { name: 'notice_days', label: 'Notice Period (Days)', type: 'number', required: true, defaultValue: '30', description: 'Days of notice required for termination' },
        { name: 'net_days', label: 'Net Payment Days', type: 'number', required: true, defaultValue: '30', description: 'Payment terms in days' },
        { name: 'jurisdiction', label: 'Governing Jurisdiction', type: 'string', required: true, defaultValue: 'India', description: 'Legal jurisdiction' },
      ],
      tags: ['service', 'professional', 'standard'],
      isPublic: true,
      isActive: true,
      usageCount: 0,
    },
    {
      name: 'Non-Disclosure Agreement (NDA)',
      description: 'Mutual NDA template for protecting confidential business information',
      type: 'nda',
      category: 'Confidentiality',
      terms: `MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of {{effective_date}} by and between {{party_a_name}} and {{party_b_name}} (collectively referred to as the "Parties").

1. PURPOSE
The Parties wish to explore a potential business relationship ("Purpose") and in connection with the Purpose, each Party may disclose certain confidential information to the other Party.

2. DEFINITION OF CONFIDENTIAL INFORMATION
"Confidential Information" means any information disclosed by one Party to the other, either directly or indirectly, in writing, orally, or by inspection of tangible objects.

3. OBLIGATIONS
Each Party agrees to:
a) Hold the Confidential Information in strict confidence
b) Not disclose the Confidential Information to any third parties
c) Use the Confidential Information solely for the Purpose
d) Protect the Confidential Information using the same degree of care used to protect its own confidential information

4. EXCLUSIONS
Confidential Information does not include information that:
a) Was publicly known at the time of disclosure
b) Was independently developed by the receiving Party
c) Was rightfully received from a third party without restriction
d) Was disclosed with prior written consent

5. TERM
This Agreement shall remain in effect for {{term_years}} years from the Effective Date.

6. RETURN OF INFORMATION
Upon termination or request, each Party shall return or destroy all Confidential Information.`,
      clauses: [
        { id: 'clause-1', title: 'Definition of Confidential Information', content: 'Information marked as confidential or that reasonably should be understood to be confidential.', required: true, category: 'definitions', order: 1 },
        { id: 'clause-2', title: 'Non-Disclosure Obligation', content: 'Receiving party agrees not to disclose confidential information to any third parties.', required: true, category: 'obligations', order: 2 },
        { id: 'clause-3', title: 'Standard of Care', content: 'Information must be protected with at least the same care as the party\'s own confidential information.', required: true, category: 'obligations', order: 3 },
        { id: 'clause-4', title: 'Permitted Disclosures', content: 'Disclosures permitted to employees and contractors with need-to-know basis.', required: false, category: 'exceptions', order: 4 },
        { id: 'clause-5', title: 'Duration of Obligations', content: 'Confidentiality obligations survive for {{survival_years}} years after termination.', required: true, category: 'term', order: 5 },
      ],
      variables: [
        { name: 'effective_date', label: 'Effective Date', type: 'date', required: true },
        { name: 'party_a_name', label: 'First Party Name', type: 'string', required: true },
        { name: 'party_b_name', label: 'Second Party Name', type: 'string', required: true },
        { name: 'term_years', label: 'Term (Years)', type: 'number', required: true, defaultValue: '2' },
        { name: 'survival_years', label: 'Survival Period (Years)', type: 'number', required: true, defaultValue: '3' },
      ],
      tags: ['nda', 'confidentiality', 'mutual'],
      isPublic: true,
      isActive: true,
      usageCount: 0,
    },
    {
      name: 'Partnership Agreement',
      description: 'Template for forming business partnerships with profit sharing and responsibilities',
      type: 'partnership',
      category: 'Business Formation',
      terms: `PARTNERSHIP AGREEMENT

This Partnership Agreement is made on {{effective_date}} between {{partner_1_name}} and {{partner_2_name}}.

ARTICLE 1: FORMATION
The partners hereby form a partnership under the name {{partnership_name}}.

ARTICLE 2: PURPOSE
The purpose of this Partnership is to {{business_purpose}}.

ARTICLE 3: CAPITAL CONTRIBUTION
Each partner shall contribute the following capital:
- Partner 1: {{partner_1_contribution}} {{currency}}
- Partner 2: {{partner_2_contribution}} {{currency}}

ARTICLE 4: PROFIT AND LOSS SHARING
Profits and losses shall be shared as follows:
- Partner 1: {{partner_1_percentage}}%
- Partner 2: {{partner_2_percentage}}%

ARTICLE 5: MANAGEMENT
The partners shall jointly manage the Partnership affairs.

ARTICLE 6: WITHDRAWAL
A partner may withdraw upon {{notice_days}} days written notice to the other partners.`,
      clauses: [
        { id: 'clause-1', title: 'Partnership Formation', content: 'This partnership is formed under applicable laws.', required: true, category: 'formation', order: 1 },
        { id: 'clause-2', title: 'Capital Contributions', content: 'Partners contribute capital as specified in Article 3.', required: true, category: 'financial', order: 2 },
        { id: 'clause-3', title: 'Profit Sharing', content: 'Profits are distributed according to agreed percentages.', required: true, category: 'financial', order: 3 },
        { id: 'clause-4', title: 'Decision Making', content: 'Major decisions require unanimous consent of partners.', required: true, category: 'management', order: 4 },
        { id: 'clause-5', title: 'Withdrawal Terms', content: 'Partners may withdraw with proper notice.', required: true, category: 'termination', order: 5 },
        { id: 'clause-6', title: 'Dispute Resolution', content: 'Disputes shall be resolved through {{dispute_resolution}}.', required: true, category: 'legal', order: 6 },
      ],
      variables: [
        { name: 'effective_date', label: 'Effective Date', type: 'date', required: true },
        { name: 'partner_1_name', label: 'Partner 1 Name', type: 'string', required: true },
        { name: 'partner_2_name', label: 'Partner 2 Name', type: 'string', required: true },
        { name: 'partnership_name', label: 'Partnership Name', type: 'string', required: true },
        { name: 'business_purpose', label: 'Business Purpose', type: 'string', required: true },
        { name: 'partner_1_contribution', label: 'Partner 1 Contribution', type: 'number', required: true },
        { name: 'partner_2_contribution', label: 'Partner 2 Contribution', type: 'number', required: true },
        { name: 'partner_1_percentage', label: 'Partner 1 Share %', type: 'number', required: true, defaultValue: '50' },
        { name: 'partner_2_percentage', label: 'Partner 2 Share %', type: 'number', required: true, defaultValue: '50' },
        { name: 'notice_days', label: 'Notice Period (Days)', type: 'number', required: true, defaultValue: '90' },
        { name: 'currency', label: 'Currency', type: 'select', required: true, defaultValue: 'INR', options: ['INR', 'USD', 'EUR', 'GBP'] },
        { name: 'dispute_resolution', label: 'Dispute Resolution', type: 'select', required: true, defaultValue: 'arbitration', options: ['arbitration', 'mediation', 'litigation'] },
      ],
      tags: ['partnership', 'business', 'profit-sharing'],
      isPublic: true,
      isActive: true,
      usageCount: 0,
    },
    {
      name: 'Employment Contract',
      description: 'Standard employment agreement template for hiring employees',
      type: 'employment',
      category: 'Human Resources',
      terms: `EMPLOYMENT AGREEMENT

This Employment Agreement is entered into on {{effective_date}} between {{employer_name}} ("Employer") and {{employee_name}} ("Employee").

1. POSITION AND DUTIES
The Employee is hired for the position of {{job_title}} and shall perform duties as assigned by the Employer.

2. COMPENSATION
The Employee shall receive a salary of {{salary_amount}} {{currency}} per {{payment_frequency}}, subject to applicable tax deductions.

3. WORKING HOURS
The Employee shall work {{working_hours}} hours per week, with flexible scheduling as required by business needs.

4. PROBATION
This employment is subject to a probation period of {{probation_months}} months.

5. BENEFITS
The Employee shall be entitled to the following benefits:
- {{benefits_list}}

6. CONFIDENTIALITY
The Employee agrees to maintain confidentiality of all proprietary information.

7. TERMINATION
Either party may terminate this Agreement with {{notice_days}} days written notice.`,
      clauses: [
        { id: 'clause-1', title: 'Position and Responsibilities', content: 'Employee agrees to perform duties faithfully and to the best of their ability.', required: true, category: 'employment', order: 1 },
        { id: 'clause-2', title: 'Compensation', content: 'Employee will receive compensation as specified, subject to applicable laws.', required: true, category: 'compensation', order: 2 },
        { id: 'clause-3', title: 'Working Hours', content: 'Working hours may vary based on business requirements.', required: true, category: 'employment', order: 3 },
        { id: 'clause-4', title: 'Probation Period', content: 'Employment is subject to satisfactory completion of probation.', required: true, category: 'employment', order: 4 },
        { id: 'clause-5', title: 'Confidentiality', content: 'Employee must maintain strict confidentiality of company information.', required: true, category: 'confidentiality', order: 5 },
        { id: 'clause-6', title: 'Non-Compete', content: 'Employee agrees not to work for competitors during employment and for {{non_compete_months}} months after.', required: false, category: 'restrictions', order: 6 },
        { id: 'clause-7', title: 'Termination', content: 'Employment may be terminated with proper notice as specified.', required: true, category: 'termination', order: 7 },
        { id: 'clause-8', title: 'Governing Law', content: 'This Agreement is governed by employment laws of {{jurisdiction}}.', required: true, category: 'legal', order: 8 },
      ],
      variables: [
        { name: 'effective_date', label: 'Start Date', type: 'date', required: true },
        { name: 'employer_name', label: 'Employer Name', type: 'string', required: true },
        { name: 'employee_name', label: 'Employee Name', type: 'string', required: true },
        { name: 'job_title', label: 'Job Title', type: 'string', required: true },
        { name: 'salary_amount', label: 'Annual Salary', type: 'number', required: true },
        { name: 'currency', label: 'Currency', type: 'select', required: true, defaultValue: 'INR', options: ['INR', 'USD', 'EUR', 'GBP'] },
        { name: 'payment_frequency', label: 'Payment Frequency', type: 'select', required: true, defaultValue: 'monthly', options: ['monthly', 'bi-weekly', 'weekly'] },
        { name: 'working_hours', label: 'Weekly Hours', type: 'number', required: true, defaultValue: '40' },
        { name: 'probation_months', label: 'Probation Period (Months)', type: 'number', required: true, defaultValue: '3' },
        { name: 'benefits_list', label: 'Benefits', type: 'string', required: false, defaultValue: 'health insurance, paid leave' },
        { name: 'notice_days', label: 'Notice Period (Days)', type: 'number', required: true, defaultValue: '30' },
        { name: 'non_compete_months', label: 'Non-Compete Period (Months)', type: 'number', required: false, defaultValue: '6' },
        { name: 'jurisdiction', label: 'Jurisdiction', type: 'string', required: true, defaultValue: 'India' },
      ],
      tags: ['employment', 'hr', 'hiring'],
      isPublic: true,
      isActive: true,
      usageCount: 0,
    },
    {
      name: 'Software Licensing Agreement',
      description: 'Template for licensing software products to customers',
      type: 'licensing',
      category: 'Technology',
      terms: `SOFTWARE LICENSING AGREEMENT

This Software Licensing Agreement is made on {{effective_date}} between {{licensor_name}} ("Licensor") and {{licensee_name}} ("Licensee").

1. GRANT OF LICENSE
The Licensor hereby grants to the Licensee a {{license_type}} license to use the Software described in Exhibit A.

2. SCOPE OF LICENSE
The license is granted for use on {{number_of_devices}} devices within {{permitted_use}}.

3. LICENSE FEE
The Licensee shall pay a license fee of {{license_fee}} {{currency}} {{payment_schedule}}.

4. RESTRICTIONS
The Licensee shall not:
a) Copy, modify, or distribute the Software
b) Reverse engineer or decompile the Software
c) Sublicense or transfer the license to third parties
d) Use the Software for any unlawful purpose

5. INTELLECTUAL PROPERTY
The Licensor retains all intellectual property rights in the Software.

6. WARRANTY
The Software is provided "AS IS" without warranty of any kind.

7. TERM
This license is valid for {{term_months}} months from the Effective Date.`,
      clauses: [
        { id: 'clause-1', title: 'License Grant', content: 'Licensor grants a limited, non-exclusive license to use the Software.', required: true, category: 'license', order: 1 },
        { id: 'clause-2', title: 'Permitted Use', content: 'Software may only be used for the permitted purposes specified.', required: true, category: 'restrictions', order: 2 },
        { id: 'clause-3', title: 'Prohibited Activities', content: 'Licensee shall not copy, modify, or distribute the Software.', required: true, category: 'restrictions', order: 3 },
        { id: 'clause-4', title: 'Intellectual Property', content: 'All IP rights remain with the Licensor.', required: true, category: 'ip', order: 4 },
        { id: 'clause-5', title: 'Warranty Disclaimer', content: 'Software is provided without warranties.', required: true, category: 'warranty', order: 5 },
        { id: 'clause-6', title: 'Limitation of Liability', content: 'Licensor\'s liability is limited to the license fee paid.', required: true, category: 'liability', order: 6 },
        { id: 'clause-7', title: 'Support Terms', content: 'Support is provided as per the support agreement.', required: false, category: 'support', order: 7 },
      ],
      variables: [
        { name: 'effective_date', label: 'Effective Date', type: 'date', required: true },
        { name: 'licensor_name', label: 'Licensor Name', type: 'string', required: true },
        { name: 'licensee_name', label: 'Licensee Name', type: 'string', required: true },
        { name: 'license_type', label: 'License Type', type: 'select', required: true, defaultValue: 'non-exclusive', options: ['non-exclusive', 'exclusive', 'perpetual', 'subscription'] },
        { name: 'number_of_devices', label: 'Number of Devices', type: 'number', required: true, defaultValue: '1' },
        { name: 'permitted_use', label: 'Permitted Use', type: 'string', required: true, defaultValue: 'internal business use only' },
        { name: 'license_fee', label: 'License Fee', type: 'number', required: true },
        { name: 'currency', label: 'Currency', type: 'select', required: true, defaultValue: 'INR', options: ['INR', 'USD', 'EUR', 'GBP'] },
        { name: 'payment_schedule', label: 'Payment Schedule', type: 'select', required: true, defaultValue: 'annually', options: ['one-time', 'monthly', 'annually'] },
        { name: 'term_months', label: 'Term (Months)', type: 'number', required: true, defaultValue: '12' },
      ],
      tags: ['software', 'licensing', 'technology', 'saas'],
      isPublic: true,
      isActive: true,
      usageCount: 0,
    },
    {
      name: 'Vendor Agreement',
      description: 'Template for engaging vendors and suppliers for goods and services',
      type: 'vendor',
      category: 'Procurement',
      terms: `VENDOR AGREEMENT

This Vendor Agreement is entered into on {{effective_date}} between {{buyer_name}} ("Buyer") and {{vendor_name}} ("Vendor").

1. SCOPE OF SUPPLY
The Vendor agrees to supply {{goods_services}} according to the specifications in Exhibit A.

2. PRICING
Pricing shall be as follows:
- Unit Price: {{unit_price}} {{currency}} per {{unit_of_measure}}
- Minimum Order Quantity: {{moq}} units
- Maximum Order Quantity: {{max_order}} units

3. DELIVERY
Delivery shall be made within {{delivery_days}} business days of order receipt.

4. PAYMENT TERMS
Payment is due within {{payment_days}} days of invoice and delivery confirmation.

5. QUALITY ASSURANCE
Vendor guarantees that all goods/services meet the quality standards specified.

6. WARRANTY
Vendor warrants goods for {{warranty_period}} months from delivery date.

7. TERMINATION
Either party may terminate with {{notice_days}} days written notice.`,
      clauses: [
        { id: 'clause-1', title: 'Scope of Supply', content: 'Vendor agrees to supply goods/services as specified.', required: true, category: 'supply', order: 1 },
        { id: 'clause-2', title: 'Pricing', content: 'Prices are fixed for the term of this agreement.', required: true, category: 'pricing', order: 2 },
        { id: 'clause-3', title: 'Delivery Terms', content: 'Goods must be delivered within specified timeframes.', required: true, category: 'delivery', order: 3 },
        { id: 'clause-4', title: 'Payment Terms', content: 'Payment is due within specified days of invoice.', required: true, category: 'payment', order: 4 },
        { id: 'clause-5', title: 'Quality Standards', content: 'All goods must meet specified quality standards.', required: true, category: 'quality', order: 5 },
        { id: 'clause-6', title: 'Warranty', content: 'Vendor provides warranty as specified.', required: true, category: 'warranty', order: 6 },
        { id: 'clause-7', title: 'Acceptance', content: 'Buyer has {{inspection_days}} days to inspect and accept goods.', required: true, category: 'quality', order: 7 },
        { id: 'clause-8', title: 'Indemnification', content: 'Vendor indemnifies Buyer against defects and claims.', required: true, category: 'liability', order: 8 },
      ],
      variables: [
        { name: 'effective_date', label: 'Effective Date', type: 'date', required: true },
        { name: 'buyer_name', label: 'Buyer Name', type: 'string', required: true },
        { name: 'vendor_name', label: 'Vendor Name', type: 'string', required: true },
        { name: 'goods_services', label: 'Goods/Services', type: 'string', required: true },
        { name: 'unit_price', label: 'Unit Price', type: 'number', required: true },
        { name: 'currency', label: 'Currency', type: 'select', required: true, defaultValue: 'INR', options: ['INR', 'USD', 'EUR', 'GBP'] },
        { name: 'unit_of_measure', label: 'Unit of Measure', type: 'string', required: true, defaultValue: 'unit' },
        { name: 'moq', label: 'Minimum Order Qty', type: 'number', required: true, defaultValue: '1' },
        { name: 'max_order', label: 'Maximum Order Qty', type: 'number', required: true, defaultValue: '1000' },
        { name: 'delivery_days', label: 'Delivery Days', type: 'number', required: true, defaultValue: '14' },
        { name: 'payment_days', label: 'Payment Days', type: 'number', required: true, defaultValue: '30' },
        { name: 'warranty_period', label: 'Warranty (Months)', type: 'number', required: true, defaultValue: '6' },
        { name: 'notice_days', label: 'Notice Period (Days)', type: 'number', required: true, defaultValue: '30' },
        { name: 'inspection_days', label: 'Inspection Period (Days)', type: 'number', required: true, defaultValue: '7' },
      ],
      tags: ['vendor', 'procurement', 'supply', 'supplier'],
      isPublic: true,
      isActive: true,
      usageCount: 0,
    },
    {
      name: 'Customer Agreement',
      description: 'Template for customer-facing service agreements',
      type: 'customer',
      category: 'Sales',
      terms: `CUSTOMER AGREEMENT

This Customer Agreement is made on {{effective_date}} between {{company_name}} ("Company") and {{customer_name}} ("Customer").

1. SERVICES
The Company agrees to provide the following services to the Customer:
{{services_list}}

2. TERM
This Agreement shall commence on {{start_date}} and continue until {{end_date}}.

3. FEES
The Customer agrees to pay {{fees_amount}} {{currency}} for the services, payable {{payment_frequency}}.

4. CUSTOMER OBLIGATIONS
The Customer agrees to:
a) Provide timely cooperation and access as required
b) Pay fees on time
c) Use services in accordance with terms of service
d) Maintain confidentiality of account credentials

5. SERVICE LEVEL
The Company agrees to maintain service levels as specified in the SLA.

6. TERMINATION
This Agreement may be terminated by either party with {{notice_days}} days written notice.`,
      clauses: [
        { id: 'clause-1', title: 'Services Description', content: 'Company will provide services as described.', required: true, category: 'services', order: 1 },
        { id: 'clause-2', title: 'Fees and Payment', content: 'Customer agrees to pay all fees as specified.', required: true, category: 'payment', order: 2 },
        { id: 'clause-3', title: 'Customer Responsibilities', content: 'Customer must provide required cooperation.', required: true, category: 'obligations', order: 3 },
        { id: 'clause-4', title: 'Account Security', content: 'Customer is responsible for maintaining account security.', required: true, category: 'security', order: 4 },
        { id: 'clause-5', title: 'Service Availability', content: 'Services will be available as per SLA terms.', required: true, category: 'sla', order: 5 },
        { id: 'clause-6', title: 'Data Protection', content: 'Company will protect customer data as per privacy policy.', required: true, category: 'privacy', order: 6 },
        { id: 'clause-7', title: 'Termination Rights', content: 'Either party may terminate with proper notice.', required: true, category: 'termination', order: 7 },
      ],
      variables: [
        { name: 'effective_date', label: 'Effective Date', type: 'date', required: true },
        { name: 'company_name', label: 'Company Name', type: 'string', required: true },
        { name: 'customer_name', label: 'Customer Name', type: 'string', required: true },
        { name: 'services_list', label: 'Services List', type: 'string', required: true },
        { name: 'start_date', label: 'Start Date', type: 'date', required: true },
        { name: 'end_date', label: 'End Date', type: 'date', required: true },
        { name: 'fees_amount', label: 'Fees Amount', type: 'number', required: true },
        { name: 'currency', label: 'Currency', type: 'select', required: true, defaultValue: 'INR', options: ['INR', 'USD', 'EUR', 'GBP'] },
        { name: 'payment_frequency', label: 'Payment Frequency', type: 'select', required: true, defaultValue: 'monthly', options: ['one-time', 'monthly', 'quarterly', 'annually'] },
        { name: 'notice_days', label: 'Notice Period (Days)', type: 'number', required: true, defaultValue: '30' },
      ],
      tags: ['customer', 'sales', 'b2c', 'subscription'],
      isPublic: true,
      isActive: true,
      usageCount: 0,
    },
    {
      name: 'Consulting Agreement',
      description: 'Template for engaging professional consultants',
      type: 'consulting',
      category: 'Professional Services',
      terms: `CONSULTING AGREEMENT

This Consulting Agreement is entered into on {{effective_date}} between {{client_name}} ("Client") and {{consultant_name}} ("Consultant").

1. ENGAGEMENT
The Client hereby engages the Consultant to provide consulting services as described in Exhibit A.

2. SCOPE OF WORK
The Consultant agrees to perform the following:
{{scope_of_work}}

3. COMPENSATION
The Client agrees to pay the Consultant {{compensation_amount}} {{currency}} according to the following schedule:
{{payment_schedule}}

4. EXPENSES
The Client shall reimburse the Consultant for pre-approved expenses up to {{expense_limit}} {{currency}}.

5. INDEPENDENT CONTRACTOR
The Consultant is an independent contractor and not an employee of the Client.

6. DELIVERABLES
The Consultant shall deliver the following:
{{deliverables}}

7. TERM AND TERMINATION
This Agreement is effective from {{start_date}} until {{end_date}}. Either party may terminate with {{notice_days}} days notice.`,
      clauses: [
        { id: 'clause-1', title: 'Scope of Work', content: 'Consultant will perform services as agreed.', required: true, category: 'services', order: 1 },
        { id: 'clause-2', title: 'Compensation', content: 'Client will pay Consultant as specified.', required: true, category: 'payment', order: 2 },
        { id: 'clause-3', title: 'Expense Reimbursement', content: 'Pre-approved expenses will be reimbursed.', required: true, category: 'payment', order: 3 },
        { id: 'clause-4', title: 'Independent Contractor Status', content: 'Consultant is an independent contractor.', required: true, category: 'employment', order: 4 },
        { id: 'clause-5', title: 'Deliverables', content: 'All deliverables must meet agreed specifications.', required: true, category: 'services', order: 5 },
        { id: 'clause-6', title: 'Confidentiality', content: 'Consultant must maintain confidentiality of all Client information.', required: true, category: 'confidentiality', order: 6 },
        { id: 'clause-7', title: 'Intellectual Property', content: 'Work product belongs to Client upon payment.', required: true, category: 'ip', order: 7 },
        { id: 'clause-8', title: 'Non-Solicitation', content: 'Consultant agrees not to solicit Client employees or clients.', required: false, category: 'restrictions', order: 8 },
      ],
      variables: [
        { name: 'effective_date', label: 'Effective Date', type: 'date', required: true },
        { name: 'client_name', label: 'Client Name', type: 'string', required: true },
        { name: 'consultant_name', label: 'Consultant Name', type: 'string', required: true },
        { name: 'scope_of_work', label: 'Scope of Work', type: 'string', required: true },
        { name: 'compensation_amount', label: 'Compensation', type: 'number', required: true },
        { name: 'currency', label: 'Currency', type: 'select', required: true, defaultValue: 'INR', options: ['INR', 'USD', 'EUR', 'GBP'] },
        { name: 'payment_schedule', label: 'Payment Schedule', type: 'string', required: true },
        { name: 'expense_limit', label: 'Expense Limit', type: 'number', required: true, defaultValue: '5000' },
        { name: 'deliverables', label: 'Deliverables', type: 'string', required: true },
        { name: 'start_date', label: 'Start Date', type: 'date', required: true },
        { name: 'end_date', label: 'End Date', type: 'date', required: true },
        { name: 'notice_days', label: 'Notice Period (Days)', type: 'number', required: true, defaultValue: '30' },
      ],
      tags: ['consulting', 'professional', 'advisory'],
      isPublic: true,
      isActive: true,
      usageCount: 0,
    },
  ];

  // Initialize all default templates
  defaultTemplates.forEach((template) => {
    const fullTemplate: ContractTemplate = {
      id: `template-${uuidv4()}`,
      name: template.name!,
      description: template.description!,
      type: template.type!,
      category: template.category!,
      terms: template.terms!,
      clauses: template.clauses!,
      variables: template.variables!,
      metadata: {},
      usageCount: template.usageCount!,
      tags: template.tags!,
      isPublic: template.isPublic!,
      isActive: template.isActive!,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    templateStore.set(fullTemplate.id, fullTemplate);
  });
};

// Initialize default templates
initializeDefaultTemplates();

// Template Service Functions
export const templateService = {
  // List all templates
  listTemplates: (options: {
    type?: ContractType;
    category?: string;
    tags?: string[];
    isPublic?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): { templates: ContractTemplate[]; total: number } => {
    let result = Array.from(templateStore.values()).filter(t => t.isActive);

    if (options.type) {
      result = result.filter(t => t.type === options.type);
    }
    if (options.category) {
      result = result.filter(t => t.category === options.category);
    }
    if (options.tags && options.tags.length > 0) {
      result = result.filter(t => options.tags!.some(tag => t.tags.includes(tag)));
    }
    if (options.isPublic !== undefined) {
      result = result.filter(t => t.isPublic === options.isPublic);
    }
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower) ||
        t.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    const total = result.length;
    const offset = options.offset || 0;
    const limit = options.limit || 50;
    result = result.slice(offset, offset + limit);

    return { templates: result, total };
  },

  // Get single template
  getTemplate: (id: string): ContractTemplate | undefined => {
    return templateStore.get(id);
  },

  // Create new template
  createTemplate: (template: Partial<ContractTemplate>): ContractTemplate => {
    const newTemplate: ContractTemplate = {
      id: `template-${uuidv4()}`,
      name: template.name || 'Untitled Template',
      description: template.description || '',
      type: template.type || 'service',
      category: template.category || 'General',
      terms: template.terms || '',
      clauses: template.clauses || [],
      variables: template.variables || [],
      metadata: template.metadata || {},
      usageCount: 0,
      tags: template.tags || [],
      isPublic: template.isPublic ?? true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: template.createdBy,
    };
    templateStore.set(newTemplate.id, newTemplate);
    console.log(`[TEMPLATE] Created: ${newTemplate.id} - ${newTemplate.name}`);
    return newTemplate;
  },

  // Update template
  updateTemplate: (id: string, updates: Partial<ContractTemplate>): ContractTemplate | undefined => {
    const template = templateStore.get(id);
    if (!template) return undefined;

    const updatedTemplate: ContractTemplate = {
      ...template,
      ...updates,
      id: template.id,
      updatedAt: new Date().toISOString(),
    };
    templateStore.set(id, updatedTemplate);
    console.log(`[TEMPLATE] Updated: ${id}`);
    return updatedTemplate;
  },

  // Delete template
  deleteTemplate: (id: string): boolean => {
    const template = templateStore.get(id);
    if (!template) return false;

    // Soft delete - mark as inactive
    template.isActive = false;
    template.updatedAt = new Date().toISOString();
    templateStore.set(id, template);
    console.log(`[TEMPLATE] Deleted: ${id}`);
    return true;
  },

  // Clone template
  cloneTemplate: (id: string, newName?: string): ContractTemplate | undefined => {
    const original = templateStore.get(id);
    if (!original) return undefined;

    const cloned: ContractTemplate = {
      ...original,
      id: `template-${uuidv4()}`,
      name: newName || `${original.name} (Copy)`,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    templateStore.set(cloned.id, cloned);
    console.log(`[TEMPLATE] Cloned: ${id} -> ${cloned.id}`);
    return cloned;
  },

  // Increment usage count
  incrementUsage: (id: string): void => {
    const template = templateStore.get(id);
    if (template) {
      template.usageCount++;
      templateStore.set(id, template);
    }
  },

  // Get template categories
  getCategories: (): string[] => {
    const categories = new Set<string>();
    templateStore.forEach(t => categories.add(t.category));
    return Array.from(categories);
  },

  // Get all tags
  getAllTags: (): string[] => {
    const tags = new Set<string>();
    templateStore.forEach(t => t.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags);
  },

  // Get popular templates
  getPopularTemplates: (limit: number = 10): ContractTemplate[] => {
    return Array.from(templateStore.values())
      .filter(t => t.isActive)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  },

  // Add clause to template
  addClauseToTemplate: (templateId: string, clause: Partial<Clause>): Clause | undefined => {
    const template = templateStore.get(templateId);
    if (!template) return undefined;

    const newClause: Clause = {
      id: `clause-${uuidv4()}`,
      title: clause.title || 'Untitled Clause',
      content: clause.content || '',
      required: clause.required ?? false,
      category: clause.category || 'general',
      order: clause.order || template.clauses.length + 1,
      variables: clause.variables,
      version: 1,
    };

    template.clauses.push(newClause);
    template.updatedAt = new Date().toISOString();
    templateStore.set(templateId, template);
    return newClause;
  },

  // Remove clause from template
  removeClauseFromTemplate: (templateId: string, clauseId: string): boolean => {
    const template = templateStore.get(templateId);
    if (!template) return false;

    const index = template.clauses.findIndex(c => c.id === clauseId);
    if (index === -1) return false;

    template.clauses.splice(index, 1);
    template.updatedAt = new Date().toISOString();
    templateStore.set(templateId, template);
    return true;
  },

  // Render template with variables
  renderTemplate: (templateId: string, variableValues: Record<string, string>): { terms: string; clauses: Clause[] } | undefined => {
    const template = templateStore.get(templateId);
    if (!template) return undefined;

    let renderedTerms = template.terms;
    template.variables.forEach(v => {
      const value = variableValues[v.name] || v.defaultValue || '';
      const regex = new RegExp(`{{${v.name}}}`, 'g');
      renderedTerms = renderedTerms.replace(regex, value);
    });

    const renderedClauses = template.clauses.map(clause => ({
      ...clause,
      content: clause.content.replace(/\{\{(\w+)\}\}/g, (match, varName) => variableValues[varName] || match),
    }));

    return { terms: renderedTerms, clauses: renderedClauses };
  },
};

export default templateService;
