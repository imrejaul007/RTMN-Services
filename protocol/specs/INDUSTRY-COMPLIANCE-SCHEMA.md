# Industry Compliance Schema (ICS)

> **Version:** 0.1.0 (draft, 2026-06-23)
> **Status:** Open for community review. Not yet a 1.0.
> **License:** Apache-2.0
> **Spec home:** [protocol/specs/INDUSTRY-COMPLIANCE-SCHEMA.md](https://github.com/imrejaul007/RTMN-Services/blob/main/protocol/specs/INDUSTRY-COMPLIANCE-SCHEMA.md)

## 1. Purpose

ICS is a **declarative JSON Schema** that describes the regulatory requirements an Industry OS instance must meet for a given jurisdiction + framework combination (e.g. *healthcare in California + HIPAA*, or *financial services in the EU + GDPR*).

ICS lets a per-tenant industry instance **self-describe its compliance posture** in a way that:

- Auditors can verify without proprietary tools.
- Provisioning engines can use to choose the right isolation level.
- Tenant summary aggregators can show compliance status at a glance.

## 2. Non-goals

- **Not a legal opinion.** ICS describes posture, not compliance. Actual compliance is determined by auditors.
- **Not a certification.** ICS doesn't grant certifications (SOC2, HITRUST, etc.) — it only describes what an instance claims.
- **Not a control library.** Control mapping is the implementer's job (see §7 for examples).

## 3. Top-level shape

```json
{
  "schemaVersion": "0.1.0",
  "subjectType": "industry_tenant_instance",
  "subjectId": "iti_abc",
  "tenantId": "t_x",
  "industry": "healthcare",
  "jurisdiction": {
    "country": "US",
    "region": "CA",
    "authority": "HHS-OCR"   // jurisdiction-specific regulator
  },
  "frameworks": [
    {
      "id": "HIPAA",
      "version": "2013-omnibus",
      "status": "COMPLIANT",          // COMPLIANT | PARTIAL | NON_COMPLIANT | NOT_ASSESSED
      "controls": [
        {
          "controlId": "164.308(a)(1)(ii)(A)",
          "name": "Risk analysis",
          "status": "COMPLIANT",
          "evidenceUrl": "https://audit.example.com/iti_abc/hipaa/164.308-a-1-ii-A.pdf",
          "lastAssessedAt": "2026-05-01T00:00:00Z",
          "nextAssessmentDue": "2027-05-01T00:00:00Z"
        }
      ],
      "lastAssessedAt": "2026-05-01T00:00:00Z",
      "nextAssessmentDue": "2027-05-01T00:00:00Z"
    }
  ],
  "dataResidency": {
    "primary": "us-west-2",
    "replicas": ["us-east-1"],
    "noCrossBorderTransfer": true
  },
  "isolationRequirements": {
    "minimumLevel": "DEDICATED",      // SHARED | DEDICATED | ISOLATED
    "encryptionAtRest": "AES-256",
    "encryptionInTransit": "TLS-1.3",
    "kmsProvider": "aws-kms",
    "kmsKeyRef": "arn:aws:kms:us-west-2:..."
  },
  "auditTrail": {
    "enabled": true,
    "retentionDays": 2555,            // 7 years for HIPAA
    "immutable": true,
    "sinkUrl": "https://audit.example.com/iti_abc/sink"
  },
  "updatedAt": "2026-06-23T12:00:00Z",
  "updatedBy": "auditor_jane@firm.com"
}
```

## 4. Field reference

### 4.1 `subjectType`

Always `"industry_tenant_instance"` in v0.1. Future versions may add `"saas_app"`, `"agent"`, `"data_pipeline"`.

### 4.2 `jurisdiction`

| Field | Required | Description |
|-------|----------|-------------|
| `country` | yes | ISO-3166-1 alpha-2 |
| `region`  | no  | Sub-national region (state, emirate, etc.). Free-text or controlled vocab per jurisdiction. |
| `authority` | no | The regulator body (e.g. `HHS-OCR`, `ICO`, `CNIL`). |

### 4.3 `frameworks`

A list of compliance frameworks the subject claims conformance with. Each entry has:

| Field | Required | Description |
|-------|----------|-------------|
| `id` | yes | Canonical framework identifier (`HIPAA`, `GDPR`, `PCI-DSS`, `SOC2`, `HITRUST`, `ISO27001`, …) |
| `version` | yes | Framework version (e.g. `"2013-omnibus"`, `"v4.0"`) |
| `status` | yes | Overall posture (`COMPLIANT` / `PARTIAL` / `NON_COMPLIANT` / `NOT_ASSESSED`) |
| `controls` | yes | Per-control breakdown (see §4.4) |
| `lastAssessedAt` | yes | When the latest assessment happened |
| `nextAssessmentDue` | yes | When the next assessment is due |
| `evidenceUrl` | no | Where the auditor's report lives |

### 4.4 `controls`

| Field | Required | Description |
|-------|----------|-------------|
| `controlId` | yes | Framework-specific control identifier (e.g. HIPAA `164.308(a)(1)(ii)(A)`, PCI-DSS `1.1`, GDPR `Art.32`) |
| `name` | yes | Human-readable control name |
| `status` | yes | `COMPLIANT` / `PARTIAL` / `NON_COMPLIANT` / `NOT_APPLICABLE` |
| `evidenceUrl` | no | Where the evidence for this control lives |
| `lastAssessedAt` | yes | When this control was last assessed |
| `nextAssessmentDue` | yes | When this control must next be assessed |
| `notes` | no | Free-text notes from the auditor |

### 4.5 `dataResidency`

Where the data lives. Critical for GDPR, HIPAA, China PIPL, UAE data law, etc.

| Field | Required | Description |
|-------|----------|-------------|
| `primary` | yes | Primary region (e.g. `us-west-2`, `eu-central-1`, `ae-dxb`) |
| `replicas` | no | Other regions holding replicas |
| `noCrossBorderTransfer` | yes | `true` if data MUST NOT leave the primary region |

### 4.6 `isolationRequirements`

Hints to the provisioning engine about how this instance should be deployed.

| Field | Required | Description |
|-------|----------|-------------|
| `minimumLevel` | yes | `SHARED` (cheapest) / `DEDICATED` (own pod, shared cluster) / `ISOLATED` (own cluster) |
| `encryptionAtRest` | yes | Algorithm identifier (`AES-256`, etc.) |
| `encryptionInTransit` | yes | TLS version (`TLS-1.3`, etc.) |
| `kmsProvider` | yes | `aws-kms` / `gcp-kms` / `azure-kv` / `hashicorp-vault` / `customer-managed` |
| `kmsKeyRef` | yes | Reference to the KMS key used |

### 4.7 `auditTrail`

| Field | Required | Description |
|-------|----------|-------------|
| `enabled` | yes | `true` if every action is logged |
| `retentionDays` | yes | How long logs are retained |
| `immutable` | yes | `true` if logs cannot be modified after write |
| `sinkUrl` | yes | Where logs are shipped |

## 5. Status semantics

### 5.1 Framework-level status

- `COMPLIANT` — all controls are `COMPLIANT` and current
- `PARTIAL` — some controls are `COMPLIANT`, others are `PARTIAL` or `NON_COMPLIANT`
- `NON_COMPLIANT` — at least one critical control is `NON_COMPLIANT`
- `NOT_ASSESSED` — never audited

### 5.2 Control-level status

- `COMPLIANT` — fully meets the control requirement
- `PARTIAL` — meets the requirement with documented exceptions
- `NON_COMPLIANT` — fails the control requirement
- `NOT_APPLICABLE` — control does not apply to this subject (e.g. HIPAA pediatric rules for an adult-only clinic)

## 6. Provisioning integration

A provisioning engine (such as [nexha-provisioning-engine](../README.md)) uses ICS to choose deployment shape:

```
if any framework.status == "NON_COMPLIANT":
  refuse to provision
elif isolationRequirements.minimumLevel == "ISOLATED":
  allocate dedicated cluster + KMS + audit sink
elif isolationRequirements.minimumLevel == "DEDICATED":
  allocate dedicated namespace + DB schema
else:
  allocate shared namespace
```

The provisioning engine reads ICS at plan time and writes back the chosen deployment shape into the plan's `resources[]`.

## 7. Worked example — HIPAA-compliant healthcare tenant

```json
{
  "schemaVersion": "0.1.0",
  "subjectType": "industry_tenant_instance",
  "subjectId": "iti_clinic_001",
  "tenantId": "t_clinic_001",
  "industry": "healthcare",
  "jurisdiction": {
    "country": "US",
    "region": "CA",
    "authority": "HHS-OCR"
  },
  "frameworks": [{
    "id": "HIPAA",
    "version": "2013-omnibus",
    "status": "COMPLIANT",
    "controls": [
      { "controlId": "164.308(a)(1)(ii)(A)", "name": "Risk analysis",
        "status": "COMPLIANT", "lastAssessedAt": "2026-05-01T00:00:00Z",
        "nextAssessmentDue": "2027-05-01T00:00:00Z" },
      { "controlId": "164.308(a)(3)", "name": "Workforce security",
        "status": "COMPLIANT", "lastAssessedAt": "2026-05-01T00:00:00Z",
        "nextAssessmentDue": "2027-05-01T00:00:00Z" },
      { "controlId": "164.312(a)(2)(iv)", "name": "Encryption at rest",
        "status": "COMPLIANT", "lastAssessedAt": "2026-05-01T00:00:00Z",
        "nextAssessmentDue": "2027-05-01T00:00:00Z" },
      { "controlId": "164.312(e)(1)", "name": "Transmission security",
        "status": "COMPLIANT", "lastAssessedAt": "2026-05-01T00:00:00Z",
        "nextAssessmentDue": "2027-05-01T00:00:00Z" }
    ],
    "lastAssessedAt": "2026-05-01T00:00:00Z",
    "nextAssessmentDue": "2027-05-01T00:00:00Z"
  }],
  "dataResidency": { "primary": "us-west-2", "replicas": [], "noCrossBorderTransfer": true },
  "isolationRequirements": {
    "minimumLevel": "DEDICATED",
    "encryptionAtRest": "AES-256",
    "encryptionInTransit": "TLS-1.3",
    "kmsProvider": "aws-kms",
    "kmsKeyRef": "arn:aws:kms:us-west-2:111122223333:key/abcd1234-..."
  },
  "auditTrail": { "enabled": true, "retentionDays": 2555, "immutable": true, "sinkUrl": "https://audit.clinic.example.com/iti_clinic_001/sink" },
  "updatedAt": "2026-06-23T12:00:00Z",
  "updatedBy": "auditor_jane@firm.com"
}
```

## 8. Worked example — PCI-DSS + GDPR combo for an EU fintech

```json
{
  "schemaVersion": "0.1.0",
  "subjectType": "industry_tenant_instance",
  "subjectId": "iti_eu_payments_001",
  "tenantId": "t_eu_payments_001",
  "industry": "financial",
  "jurisdiction": { "country": "DE", "authority": "BaFin" },
  "frameworks": [
    {
      "id": "GDPR", "version": "2018", "status": "COMPLIANT",
      "controls": [
        { "controlId": "Art.5", "name": "Lawful processing", "status": "COMPLIANT", "lastAssessedAt": "2026-04-01T00:00:00Z", "nextAssessmentDue": "2027-04-01T00:00:00Z" },
        { "controlId": "Art.32", "name": "Security of processing", "status": "COMPLIANT", "lastAssessedAt": "2026-04-01T00:00:00Z", "nextAssessmentDue": "2027-04-01T00:00:00Z" },
        { "controlId": "Art.44", "name": "Cross-border transfer", "status": "COMPLIANT", "lastAssessedAt": "2026-04-01T00:00:00Z", "nextAssessmentDue": "2027-04-01T00:00:00Z" }
      ],
      "lastAssessedAt": "2026-04-01T00:00:00Z", "nextAssessmentDue": "2027-04-01T00:00:00Z"
    },
    {
      "id": "PCI-DSS", "version": "4.0", "status": "COMPLIANT",
      "controls": [
        { "controlId": "1.1", "name": "Network security controls", "status": "COMPLIANT", "lastAssessedAt": "2026-04-01T00:00:00Z", "nextAssessmentDue": "2027-04-01T00:00:00Z" },
        { "controlId": "3.5", "name": "Cardholder data protection", "status": "COMPLIANT", "lastAssessedAt": "2026-04-01T00:00:00Z", "nextAssessmentDue": "2027-04-01T00:00:00Z" },
        { "controlId": "10.x", "name": "Logging and monitoring", "status": "COMPLIANT", "lastAssessedAt": "2026-04-01T00:00:00Z", "nextAssessmentDue": "2027-04-01T00:00:00Z" }
      ],
      "lastAssessedAt": "2026-04-01T00:00:00Z", "nextAssessmentDue": "2027-04-01T00:00:00Z"
    }
  ],
  "dataResidency": { "primary": "eu-central-1", "replicas": [], "noCrossBorderTransfer": true },
  "isolationRequirements": {
    "minimumLevel": "ISOLATED",
    "encryptionAtRest": "AES-256",
    "encryptionInTransit": "TLS-1.3",
    "kmsProvider": "aws-kms",
    "kmsKeyRef": "arn:aws:kms:eu-central-1:444455556666:key/efgh5678-..."
  },
  "auditTrail": { "enabled": true, "retentionDays": 2555, "immutable": true, "sinkUrl": "https://audit.fintech.example.com/iti_eu_payments_001/sink" },
  "updatedAt": "2026-06-23T12:00:00Z",
  "updatedBy": "auditor_peter@firm.com"
}
```

## 9. JSON Schema

A machine-readable JSON Schema for ICS lives at [protocol/specs/ics.schema.json](ics.schema.json). Use it to validate any ICS document.

## 10. Reference implementation

The reference implementation lives in [`industry-tenant-instances`](https://github.com/imrejaul007/RTMN-Services/tree/main/industry-os/services/industry-tenant-instances) (136 vitest tests). The `compliance` field on a tenant instance carries the ICS payload.

## 11. Versioning

ICS versions are semver (major.minor.patch).

- **Major** bump = breaking schema change (renaming a field, removing a status, etc.)
- **Minor** bump = additive change (new optional field, new status enum value)
- **Patch** bump = clarification only (no schema change)

Receivers SHOULD accept any minor version of the same major version.

## 12. Contributing

Issues + PRs welcome. For breaking changes, please open an `ics-discussion` issue first.