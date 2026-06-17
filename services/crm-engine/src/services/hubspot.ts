import { Contact, LifecycleStage } from '../models/Contact';
import { Deal, DealStage } from '../models/Deal';

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const HUBSPOT_ENABLED = process.env.HUBSPOT_ENABLED === 'true';

interface HubSpotContact {
  id: string;
  properties: {
    email: string;
    firstname: string;
    lastname: string;
    phone?: string;
    company?: string;
    lifecyclestage?: string;
    hs_lead_status?: string;
  };
}

interface HubSpotDeal {
  id: string;
  properties: {
    dealname: string;
    amount: string;
    dealstage: string;
    closedate: string;
    hubspot_owner_id?: string;
  };
}

const LIFECYCLE_STAGE_MAP: Record<string, LifecycleStage> = {
  subscriber: LifecycleStage.LEAD,
  lead: LifecycleStage.LEAD,
  marketingqualifiedlead: LifecycleStage.PROSPECT,
  salesqualifiedlead: LifecycleStage.PROSPECT,
  opportunity: LifecycleStage.PROSPECT,
  customer: LifecycleStage.CUSTOMER,
  evangelist: LifecycleStage.EVANGELIST,
};

const DEAL_STAGE_MAP: Record<string, DealStage> = {
  appointmentscheduled: DealStage.PROSPECT,
  qualifiedtobuy: DealStage.QUALIFICATION,
  presentationscheduled: DealStage.PROPOSAL,
  decisionmakerboughtin: DealStage.NEGOTIATION,
  contractsigned: DealStage.NEGOTIATION,
  closedwon: DealStage.CLOSED_WON,
  closedlost: DealStage.CLOSED_LOST,
};

const REVERSE_STAGE_MAP: Record<DealStage, string> = {
  [DealStage.PROSPECT]: 'appointmentscheduled',
  [DealStage.QUALIFICATION]: 'qualifiedtobuy',
  [DealStage.PROPOSAL]: 'presentationscheduled',
  [DealStage.NEGOTIATION]: 'decisionmakerboughtin',
  [DealStage.CLOSED_WON]: 'closedwon',
  [DealStage.CLOSED_LOST]: 'closedlost',
};

async function hubspotRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!HUBSPOT_ENABLED || !HUBSPOT_API_KEY) {
    throw new Error('HubSpot integration is not enabled');
  }

  const response = await fetch(`https://api.hubapi.com${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HubSpot API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function hubspotSyncContacts(tenantId: string): Promise<{
  imported: number;
  exported: number;
  errors: string[];
}> {
  const result = {
    imported: 0,
    exported: 0,
    errors: [] as string[],
  };

  if (!HUBSPOT_ENABLED) {
    console.log('[HubSpot] Integration disabled, skipping sync');
    return result;
  }

  try {
    // Fetch contacts from HubSpot
    const hubspotContacts = await hubspotRequest<{ results: HubSpotContact[] }>(
      '/crm/v3/objects/contacts?limit=100'
    );

    // Import HubSpot contacts to our CRM
    for (const hsContact of hubspotContacts.results) {
      try {
        const fullName = [
          hsContact.properties.firstname,
          hsContact.properties.lastname,
        ]
          .filter(Boolean)
          .join(' ');

        const lifecycleStage =
          LIFECYCLE_STAGE_MAP[hsContact.properties.lifecyclestage || ''] ||
          LifecycleStage.LEAD;

        await Contact.findOneAndUpdate(
          { tenantId, 'externalIds.hubspotId': hsContact.id },
          {
            $set: {
              name: fullName || hsContact.properties.email,
              email: hsContact.properties.email,
              phone: hsContact.properties.phone,
              company: hsContact.properties.company,
              lifecycleStage,
              leadSource: hsContact.properties.hs_lead_status,
              'externalIds.hubspotId': hsContact.id,
            },
          },
          { upsert: true, new: true }
        );
        result.imported++;
      } catch (error) {
        result.errors.push(
          `Failed to import contact ${hsContact.id}: ${error}`
        );
      }
    }

    // Export our contacts to HubSpot
    const ourContacts = await Contact.find({
      tenantId,
      'externalIds.hubspotId': { $exists: false },
    });

    for (const contact of ourContacts) {
      try {
        const nameParts = contact.name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const response = await hubspotRequest<{ id: string }>(
          '/crm/v3/objects/contacts',
          {
            method: 'POST',
            body: JSON.stringify({
              properties: {
                email: contact.email,
                firstname: firstName,
                lastname: lastName,
                phone: contact.phone,
                company: contact.company,
              },
            }),
          }
        );

        contact.externalIds.hubspotId = response.id;
        await contact.save();
        result.exported++;
      } catch (error) {
        result.errors.push(
          `Failed to export contact ${contact._id}: ${error}`
        );
      }
    }
  } catch (error) {
    result.errors.push(`HubSpot sync failed: ${error}`);
  }

  console.log(
    `[HubSpot] Contacts sync complete: ${result.imported} imported, ${result.exported} exported`
  );
  return result;
}

export async function hubspotSyncDeals(tenantId: string): Promise<{
  imported: number;
  exported: number;
  errors: string[];
}> {
  const result = {
    imported: 0,
    exported: 0,
    errors: [] as string[],
  };

  if (!HUBSPOT_ENABLED) {
    console.log('[HubSpot] Integration disabled, skipping sync');
    return result;
  }

  try {
    // Fetch deals from HubSpot
    const hubspotDeals = await hubspotRequest<{ results: HubSpotDeal[] }>(
      '/crm/v3/objects/deals?limit=100'
    );

    // Import HubSpot deals to our CRM
    for (const hsDeal of hubspotDeals.results) {
      try {
        const stage = DEAL_STAGE_MAP[hsDeal.properties.dealstage] || DealStage.PROSPECT;

        // Find associated contact by email (would need contact email in real implementation)
        const deal = await Deal.findOneAndUpdate(
          { tenantId, 'externalIds.hubspotId': hsDeal.id },
          {
            $set: {
              title: hsDeal.properties.dealname,
              value: parseFloat(hsDeal.properties.amount) || 0,
              stage,
              expectedClose: hsDeal.properties.closedate
                ? new Date(hsDeal.properties.closedate)
                : undefined,
              'externalIds.hubspotId': hsDeal.id,
            },
          },
          { upsert: true, new: true }
        );
        result.imported++;
      } catch (error) {
        result.errors.push(`Failed to import deal ${hsDeal.id}: ${error}`);
      }
    }

    // Export our deals to HubSpot
    const ourDeals = await Deal.find({
      tenantId,
      'externalIds.hubspotId': { $exists: false },
    }).populate('contactId');

    for (const deal of ourDeals) {
      try {
        const response = await hubspotRequest<{ id: string }>(
          '/crm/v3/objects/deals',
          {
            method: 'POST',
            body: JSON.stringify({
              properties: {
                dealname: deal.title,
                amount: deal.value.toString(),
                dealstage: REVERSE_STAGE_MAP[deal.stage],
                closedate: deal.expectedClose?.toISOString(),
              },
            }),
          }
        );

        deal.externalIds.hubspotId = response.id;
        await deal.save();
        result.exported++;
      } catch (error) {
        result.errors.push(`Failed to export deal ${deal._id}: ${error}`);
      }
    }
  } catch (error) {
    result.errors.push(`HubSpot sync failed: ${error}`);
  }

  console.log(
    `[HubSpot] Deals sync complete: ${result.imported} imported, ${result.exported} exported`
  );
  return result;
}

export async function getHubSpotStatus(): Promise<{
  enabled: boolean;
  connected: boolean;
}> {
  return {
    enabled: HUBSPOT_ENABLED,
    connected: false, // Would test connection in real implementation
  };
}
