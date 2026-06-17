import { Contact, LifecycleStage } from '../models/Contact';
import { Deal, DealStage } from '../models/Deal';

const ZOHO_ENABLED = process.env.ZOHO_ENABLED === 'true';
const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID;
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
const ZOHO_REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN;

interface ZohoContact {
  id: string;
  Email: string;
  First_Name?: string;
  Last_Name?: string;
  Phone?: string;
  Company?: string;
  Lead_Status?: string;
}

interface ZohoDeal {
  id: string;
  Deal_Name: string;
  Amount: string;
  Stage: string;
  Closing_Date?: string;
  Contact_Name?: string;
}

const LIFECYCLE_STAGE_MAP: Record<string, LifecycleStage> = {
  'New': LifecycleStage.LEAD,
  'Contacted': LifecycleStage.PROSPECT,
  'Working': LifecycleStage.PROSPECT,
  'Nurturing': LifecycleStage.PROSPECT,
  'Qualified': LifecycleStage.PROSPECT,
  'Unqualified': LifecycleStage.LEAD,
  'Converted': LifecycleStage.CUSTOMER,
};

const DEAL_STAGE_MAP: Record<string, DealStage> = {
  'Prospecting': DealStage.PROSPECT,
  'Qualification': DealStage.QUALIFICATION,
  'Needs Analysis': DealStage.PROPOSAL,
  'Value Proposition': DealStage.PROPOSAL,
  'Id. Decision Makers': DealStage.NEGOTIATION,
  'Perception Analysis': DealStage.NEGOTIATION,
  'Proposal/Price Quote': DealStage.PROPOSAL,
  'Negotiation/Review': DealStage.NEGOTIATION,
  'Closed Won': DealStage.CLOSED_WON,
  'Closed Lost': DealStage.CLOSED_LOST,
};

const REVERSE_STAGE_MAP: Record<DealStage, string> = {
  [DealStage.PROSPECT]: 'Prospecting',
  [DealStage.QUALIFICATION]: 'Qualification',
  [DealStage.PROPOSAL]: 'Proposal/Price Quote',
  [DealStage.NEGOTIATION]: 'Negotiation/Review',
  [DealStage.CLOSED_WON]: 'Closed Won',
  [DealStage.CLOSED_LOST]: 'Closed Lost',
};

let zohoAccessToken: string | null = null;
let tokenExpiry: number = 0;

async function getZohoAccessToken(): Promise<string> {
  if (zohoAccessToken && Date.now() < tokenExpiry) {
    return zohoAccessToken;
  }

  if (!ZOHO_ENABLED || !ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET || !ZOHO_REFRESH_TOKEN) {
    throw new Error('Zoho integration is not configured');
  }

  const response = await fetch(
    'https://accounts.zoho.com/oauth/v2/token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: ZOHO_CLIENT_ID!,
        client_secret: ZOHO_CLIENT_SECRET!,
        refresh_token: ZOHO_REFRESH_TOKEN!,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Zoho OAuth error: ${response.status}`);
  }

  const data = await response.json();
  zohoAccessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;

  return zohoAccessToken!;
}

async function zohoRequest<T>(
  module: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getZohoAccessToken();

  const response = await fetch(
    `https://www.zohoapis.com/crm/v2/${module}`,
    {
      ...options,
      headers: {
        'Authorization': `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Zoho API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function zohoSyncContacts(tenantId: string): Promise<{
  imported: number;
  exported: number;
  errors: string[];
}> {
  const result = {
    imported: 0,
    exported: 0,
    errors: [] as string[],
  };

  if (!ZOHO_ENABLED) {
    console.log('[Zoho] Integration disabled, skipping sync');
    return result;
  }

  try {
    // Fetch contacts from Zoho
    const zohoResponse = await zohoRequest<{
      data: ZohoContact[];
    }>('contacts?per_page=100');

    // Import Zoho contacts to our CRM
    for (const zc of zohoResponse.data) {
      try {
        const fullName = [zc.First_Name, zc.Last_Name]
          .filter(Boolean)
          .join(' ');

        const lifecycleStage =
          LIFECYCLE_STAGE_MAP[zc.Lead_Status || ''] || LifecycleStage.LEAD;

        await Contact.findOneAndUpdate(
          { tenantId, 'externalIds.zohoId': zc.id },
          {
            $set: {
              name: fullName || zc.Email,
              email: zc.Email,
              phone: zc.Phone,
              company: zc.Company,
              lifecycleStage,
              leadSource: zc.Lead_Status,
              'externalIds.zohoId': zc.id,
            },
          },
          { upsert: true, new: true }
        );
        result.imported++;
      } catch (error) {
        result.errors.push(
          `Failed to import contact ${zc.id}: ${error}`
        );
      }
    }

    // Export our contacts to Zoho
    const ourContacts = await Contact.find({
      tenantId,
      'externalIds.zohoId': { $exists: false },
    });

    for (const contact of ourContacts) {
      try {
        const nameParts = contact.name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const response = await zohoRequest<{
          data: [{ id: string }];
        }>('contacts', {
          method: 'POST',
          body: JSON.stringify({
            data: [
              {
                Email: contact.email,
                First_Name: firstName,
                Last_Name: lastName,
                Phone: contact.phone,
                Company: contact.company,
              },
            ],
          }),
        });

        if (response.data?.[0]?.id) {
          contact.externalIds.zohoId = response.data[0].id;
          await contact.save();
          result.exported++;
        }
      } catch (error) {
        result.errors.push(
          `Failed to export contact ${contact._id}: ${error}`
        );
      }
    }
  } catch (error) {
    result.errors.push(`Zoho sync failed: ${error}`);
  }

  console.log(
    `[Zoho] Contacts sync complete: ${result.imported} imported, ${result.exported} exported`
  );
  return result;
}

export async function zohoSyncDeals(tenantId: string): Promise<{
  imported: number;
  exported: number;
  errors: string[];
}> {
  const result = {
    imported: 0,
    exported: 0,
    errors: [] as string[],
  };

  if (!ZOHO_ENABLED) {
    console.log('[Zoho] Integration disabled, skipping sync');
    return result;
  }

  try {
    // Fetch deals from Zoho
    const zohoResponse = await zohoRequest<{
      data: ZohoDeal[];
    }>('deals?per_page=100');

    // Import Zoho deals to our CRM
    for (const zd of zohoResponse.data) {
      try {
        const stage = DEAL_STAGE_MAP[zd.Stage] || DealStage.PROSPECT;

        // Find contact by email if Contact_Name is provided
        let contactId: any = null;
        if (zd.Contact_Name) {
          const contact = await Contact.findOne({
            tenantId,
            name: zd.Contact_Name,
          });
          if (contact) {
            contactId = contact._id;
          }
        }

        const deal = await Deal.findOneAndUpdate(
          { tenantId, 'externalIds.zohoId': zd.id },
          {
            $set: {
              title: zd.Deal_Name,
              value: parseFloat(zd.Amount) || 0,
              stage,
              contactId,
              expectedClose: zd.Closing_Date
                ? new Date(zd.Closing_Date)
                : undefined,
              'externalIds.zohoId': zd.id,
            },
          },
          { upsert: true, new: true }
        );
        result.imported++;
      } catch (error) {
        result.errors.push(`Failed to import deal ${zd.id}: ${error}`);
      }
    }

    // Export our deals to Zoho
    const ourDeals = await Deal.find({
      tenantId,
      'externalIds.zohoId': { $exists: false },
    }).populate('contactId');

    for (const deal of ourDeals) {
      try {
        const response = await zohoRequest<{
          data: [{ id: string }];
        }>('deals', {
          method: 'POST',
          body: JSON.stringify({
            data: [
              {
                Deal_Name: deal.title,
                Amount: deal.value.toString(),
                Stage: REVERSE_STAGE_MAP[deal.stage],
                Closing_Date: deal.expectedClose?.toISOString().split('T')[0],
              },
            ],
          }),
        });

        if (response.data?.[0]?.id) {
          deal.externalIds.zohoId = response.data[0].id;
          await deal.save();
          result.exported++;
        }
      } catch (error) {
        result.errors.push(`Failed to export deal ${deal._id}: ${error}`);
      }
    }
  } catch (error) {
    result.errors.push(`Zoho sync failed: ${error}`);
  }

  console.log(
    `[Zoho] Deals sync complete: ${result.imported} imported, ${result.exported} exported`
  );
  return result;
}

export async function getZohoStatus(): Promise<{
  enabled: boolean;
  connected: boolean;
}> {
  return {
    enabled: ZOHO_ENABLED,
    connected: false, // Would test connection in real implementation
  };
}
