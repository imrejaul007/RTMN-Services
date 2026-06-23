# @rtmn/ics

> Reference validator for the **Industry Compliance Schema (ICS) v0.1.0** spec.

Pure JavaScript. Zero dependencies. Runs in Node 18+ and modern browsers.

- **Spec:** [`../../specs/INDUSTRY-COMPLIANCE-SCHEMA.md`](../../specs/INDUSTRY-COMPLIANCE-SCHEMA.md)
- **JSON Schema (strict):** [`../../specs/ics.schema.json`](../../specs/ics.schema.json) — use with Ajv for machine-checked validation
- **License:** Apache-2.0

---

## Install

```bash
npm install @rtmn/ics
```

## Quick start

```js
import { validate, rollupFrameworkStatus } from '@rtmn/ics';

const doc = {
  schemaVersion: '0.1.0',
  subjectType: 'industry_tenant_instance',
  subjectId: 'ti_abc123',
  tenantId: 't_xyz',
  industry: 'healthcare',
  jurisdiction: { country: 'US', region: 'CA' },
  frameworks: [
    {
      id: 'HIPAA',
      version: '2013-01-25',
      status: 'COMPLIANT',
      lastAssessedAt: '2026-01-15T00:00:00Z',
      nextAssessmentDue: '2026-07-15T00:00:00Z',
      controls: [
        { controlId: '164.312(a)(1)', name: 'Access Control', status: 'COMPLIANT' },
        { controlId: '164.312(b)',    name: 'Audit Controls', status: 'COMPLIANT' },
      ],
    },
  ],
  dataResidency: ['US'],
  isolationRequirements: {
    minimumLevel: 'DEDICATED',
    kmsProvider: 'aws-kms',
  },
  auditTrail: {
    enabled: true,
    retentionDays: 2555,
    immutable: true,
    sinkUrl: 'https://audit.example.com/hipaa',
  },
  updatedAt: '2026-01-15T12:00:00Z',
  updatedBy: 'auditor@example.com',
};

const result = validate(doc);
if (!result.ok) {
  console.error(result.errors);
  process.exit(1);
}
console.log('ICS document is valid');
```

## API

### `validate(doc) → { ok, value | errors }`

Structurally validates an ICS document. Returns a discriminated union:

```ts
type ValidationResult =
  | { ok: true;  value: IcsDocument }
  | { ok: false; errors: string[] };
```

Validation covers:
- All 12 required top-level fields present
- `schemaVersion` matches `^0\.1\.[0-9]+$`
- `subjectType` ∈ `['industry_tenant_instance']`
- `jurisdiction.country` is ISO-3166-1 alpha-2
- `frameworks[*].id`, `.version`, `.status` (one of 4 values), `.lastAssessedAt` + `.nextAssessmentDue` are ISO-8601
- `frameworks[*].controls[*].controlId`, `.name`, `.status` (one of 4 values)
- `isolationRequirements.minimumLevel` ∈ `['SHARED', 'DEDICATED', 'ISOLATED']`
- `isolationRequirements.kmsProvider` ∈ 5 allowed providers
- `auditTrail.enabled` boolean, `retentionDays` non-negative number, `immutable` boolean, `sinkUrl` `https?://...`
- `updatedAt` ISO-8601

All errors are reported in one pass — no early-exit.

### `rollupFrameworkStatus(framework) → 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT' | 'NOT_ASSESSED'`

Derives a framework's rollup status from its controls:

| Inputs | Rollup |
|---|---|
| Any control `NON_COMPLIANT` | `NON_COMPLIANT` |
| Some control `PARTIAL` (no `NON_COMPLIANT`) | `PARTIAL` |
| All controls `COMPLIANT` or `NOT_APPLICABLE` | `COMPLIANT` |
| No controls / missing | `NOT_ASSESSED` |

This is a helper for auditors and tools that auto-derive the framework status from granular control attestations.

## When to use `validate()` vs Ajv + `ics.schema.json`

- **`@rtmn/ics validate()`** — lightweight, no dependencies, friendly error messages. Use for runtime checks, CLI tools, examples.
- **Ajv + `ics.schema.json`** — strict JSON Schema validation, generates machine-readable reports, supports `$ref` reuse. Use in CI pipelines, audit tools, or when you need to validate against multiple schema versions.

```js
// Strict mode via Ajv
import Ajv from 'ajv/dist/2020';
import schema from '@rtmn/ics-schema/ics.schema.json' assert { type: 'json' };
const ajv = new Ajv();
const validateFn = ajv.compile(schema);
const ok = validateFn(doc);
if (!ok) console.error(validateFn.errors);
```

## Tests

```bash
npm test
```

Runs the bundled `node:test` suite (45 assertions covering valid docs, every error path, and all `rollupFrameworkStatus` cases).

## License

Apache-2.0. See [`../../LICENSE`](../../LICENSE).
