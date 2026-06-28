/**
 * Unit tests for CRM Connectors
 */
import { describe, it, expect } from 'vitest';

function normalizeContact(contact) {
  return {
    email: contact.email?.toLowerCase(),
    phone: contact.phone?.replace(/\D/g, ''),
    name: [contact.firstName, contact.lastName].filter(Boolean).join(' ')
  };
}

function mapToCRMSchema(contact, crmType) {
  if (crmType === 'hubspot') {
    return {
      properties: {
        email: contact.email,
        phone: contact.phone,
        firstname: contact.name?.split(' ')[0],
        lastname: contact.name?.split(' ').slice(1).join(' ')
      }
    };
  }
  if (crmType === 'salesforce') {
    return {
      Email: contact.email,
      Phone: contact.phone,
      FirstName: contact.name?.split(' ')[0],
      LastName: contact.name?.split(' ').slice(1).join(' ')
    };
  }
  return contact;
}

function matchContact(existing, newContact) {
  if (existing.email === newContact.email) return 'email';
  if (existing.phone === newContact.phone) return 'phone';
  return null;
}

describe('CRM Connectors', () => {
  it('should normalize email to lowercase', () => {
    expect(normalizeContact({ email: 'USER@EXAMPLE.COM' }).email).toBe('user@example.com');
  });

  it('should normalize phone numbers', () => {
    expect(normalizeContact({ phone: '+91 98765 43210' }).phone).toBe('919876543210');
    expect(normalizeContact({ phone: '9876543210' }).phone).toBe('9876543210');
  });

  it('should combine name fields', () => {
    expect(normalizeContact({ firstName: 'John', lastName: 'Doe' }).name).toBe('John Doe');
  });

  it('should map to HubSpot schema', () => {
    const contact = { email: 'john@example.com', name: 'John Doe' };
    const mapped = mapToCRMSchema(contact, 'hubspot');
    expect(mapped.properties.email).toBe('john@example.com');
  });

  it('should map to Salesforce schema', () => {
    const contact = { email: 'jane@example.com', name: 'Jane Doe' };
    const mapped = mapToCRMSchema(contact, 'salesforce');
    expect(mapped.Email).toBe('jane@example.com');
  });

  it('should match contacts by email', () => {
    expect(matchContact({ email: 'a@b.com' }, { email: 'a@b.com' })).toBe('email');
    expect(matchContact({ email: 'a@b.com' }, { email: 'c@d.com' })).toBeNull();
  });

  it('should match contacts by phone', () => {
    expect(matchContact({ phone: '9876543210' }, { phone: '9876543210' })).toBe('phone');
  });
});
