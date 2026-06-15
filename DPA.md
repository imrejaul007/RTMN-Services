# Data Processing Addendum (DPA)

**Last Updated:** June 15, 2026
**Version:** 1.0.0

This Data Processing Addendum ("DPA") forms part of the RTMN Terms of Service and applies to the extent that RTMN Group ("Processor") processes personal data on behalf of a customer ("Controller") in connection with the Services.

This DPA reflects the parties' agreement with respect to the processing of personal data in accordance with the requirements of the General Data Protection Regulation (Regulation (EU) 2016/679) ("GDPR") and other applicable data protection laws.

---

## 1. Definitions

- **"Personal Data"** has the meaning given in GDPR Article 4(1).
- **"Processing"** has the meaning given in GDPR Article 4(2).
- **"Controller," "Processor," "Data Subject," "Supervisory Authority"** have the meanings given in GDPR.
- **"Standard Contractual Clauses" (SCCs)** means the standard contractual clauses approved by the European Commission Decision (EU) 2021/914.
- **"Sub-processor"** means any third party engaged by Processor to process Personal Data.

## 2. Roles and Scope

- **Controller** determines the purposes and means of processing Personal Data.
- **Processor** processes Personal Data only on documented instructions from Controller.
- This DPA applies to the processing of Personal Data as described in **Annex I** (Details of Processing).

## 3. Processor Obligations

Processor shall:

3.1 Process Personal Data only on documented instructions from Controller, including with regard to transfers, unless required to do otherwise by EU or US law.

3.2 Ensure that persons authorized to process Personal Data have committed themselves to confidentiality or are under an appropriate statutory obligation of confidentiality.

3.3 Implement appropriate technical and organizational measures to ensure a level of security appropriate to the risk, including as set out in **Annex II** (Security Measures).

3.4 Engage Sub-processors only with the prior specific or general written authorization of Controller. Processor maintains a list of current Sub-processors at [SUB-PROCESSORS.md](SUB-PROCESSORS.md) and will notify Controller of any intended changes.

3.5 Taking into account the nature of the processing, assist Controller by appropriate technical and organizational measures, insofar as possible, in the fulfillment of Controller's obligation to respond to requests for exercising Data Subjects' rights (Chapter III GDPR).

3.6 Assist Controller in ensuring compliance with Articles 32-36 GDPR (security, breach notification, DPIAs).

3.7 At the choice of Controller, delete or return all Personal Data after the end of the provision of services relating to processing, and delete existing copies unless Union or Member State law requires storage.

3.8 Make available to Controller all information necessary to demonstrate compliance with Article 28 GDPR and allow for audits.

## 4. Controller Obligations

Controller shall:

4.1 Ensure that it has a legal basis for processing Personal Data and that its instructions comply with applicable data protection law.

4.2 Provide Processor with the necessary information to perform its obligations under this DPA.

4.3 Respond to inquiries from Data Subjects and Supervisory Authorities.

## 5. International Data Transfers

5.1 Personal Data may be transferred to countries outside the EEA, UK, or Switzerland only when appropriate safeguards are in place.

5.2 For transfers from the EEA to third countries, the parties rely on the **Standard Contractual Clauses (Module 2: Controller-to-Processor)**, which are incorporated by reference.

5.3 For transfers from the UK, the **UK International Data Transfer Addendum** to the SCCs applies.

5.4 Transfer Impact Assessment: A summary is available in **Annex III**.

## 6. Sub-processors

6.1 Controller grants Processor general authorization to engage Sub-processors, subject to:
- A list of current Sub-processors published at [SUB-PROCESSORS.md](SUB-PROCESSORS.md)
- 30 days' prior notice of any new Sub-processor
- The right to object on reasonable grounds related to data protection

6.2 Processor shall enter into a written contract with each Sub-processor that imposes data protection obligations no less protective than those in this DPA.

## 7. Security Incidents

7.1 Processor shall notify Controller without undue delay (and in any case within 48 hours) after becoming aware of a Personal Data Breach.

7.2 Notification shall include:
- Nature of the breach
- Categories and approximate number of Data Subjects and records affected
- Likely consequences
- Measures taken or proposed to address the breach and mitigate adverse effects

## 8. Term and Termination

8.1 This DPA remains in effect for the duration of the Services agreement.

8.2 Upon termination, Processor shall, at Controller's choice, delete or return all Personal Data, subject to legal retention requirements.

## 9. Liability

Liability under this DPA shall be subject to the limitations and exclusions set forth in the Terms of Service.

---

## ANNEX I — Details of Processing

**Categories of Data Subjects:**
- Controller's end users (customers, employees, contacts)
- Controller's authorized users

**Categories of Personal Data:**
- Account data: name, email, role
- Usage data: API calls, features used
- Customer-uploaded data (as determined by Controller)
- End-user interaction data (e.g., reviews, messages)

**Sensitive Data:** Processor does not intentionally process special categories of data. Controller is responsible for not uploading such data without prior written agreement.

**Processing Operations:**
- Storage, retrieval, analysis, transmission
- Hosting, backup, security
- Support and troubleshooting

**Processing Duration:** Duration of the Services agreement + 30 days

**Nature and Purpose:** Providing the RTMN platform and Services

---

## ANNEX II — Technical and Organizational Security Measures

Processor implements at least the following measures:

**Confidentiality**
- Role-based access control (RBAC)
- Principle of least privilege
- Background checks for personnel with data access
- Mandatory security training

**Integrity**
- TLS 1.3 encryption in transit
- AES-256 encryption at rest
- Database backups every 6 hours, retained 30 days
- Code review and change management

**Availability and Resilience**
- Multi-AZ deployment
- Daily backups, tested restoration quarterly
- Disaster recovery plan with RPO ≤ 1 hour, RTO ≤ 4 hours
- 99.9% uptime SLA on paid plans

**Access Control**
- Multi-factor authentication (MFA) for all personnel
- Just-in-time access provisioning
- Audit logging of all access events

**Incident Management**
- 24/7 security monitoring
- Documented incident response plan
- Annual tabletop exercises
- 48-hour breach notification commitment

---

## ANNEX III — Transfer Impact Assessment Summary

For transfers from EEA to US Sub-processors, Processor has assessed:
- Recipient country's legal framework
- Surveillance laws (e.g., US CLOUD Act, FISA 702)
- Supplementary measures implemented (encryption, pseudonymization, contractual controls)
- Right to challenge government access requests

Customers may request the full TIA at privacy@rtmn.com.

---

## Signature

By accepting the RTMN Terms of Service, Controller and Processor are deemed to have executed this DPA as of the effective date of the Terms.

For a countersigned PDF version, contact: legal@rtmn.com

---

*This DPA is designed to satisfy GDPR Article 28 requirements and is supplemented by the Standard Contractual Clauses for international transfers.*
