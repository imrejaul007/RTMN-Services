import { createClient } from '@/lib/supabase'
import { templates } from './components'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ template?: string }>
}

export default async function ScanPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { template: templateName } = await searchParams
  const supabase = createClient()

  const { data: qr } = await supabase
    .from('qr_codes')
    .select('*, campaigns(*)')
    .eq('qr_slug', slug)
    .single()

  if (!qr) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold mb-2">QR Code Not Found</h1>
          <p className="text-gray-500">This QR code doesn&apos;t exist or has been removed.</p>
        </div>
      </div>
    )
  }

  if (!qr.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">⏸️</div>
          <h1 className="text-2xl font-bold mb-2">Campaign Paused</h1>
          <p className="text-gray-500">This QR code is no longer active.</p>
        </div>
      </div>
    )
  }

  const campaign = qr.campaigns || {}
  const offer = campaign.offer || {}
  const TemplateComponent = templateName && templates[templateName as keyof typeof templates]
    ? templates[templateName as keyof typeof templates]
    : templates.bold

  return (
    <TemplateComponent
      campaignName={campaign.name || 'Campaign'}
      headline={offer.headline || 'Special Offer!'}
      details={offer.details}
      terms={offer.terms}
      scanReward={campaign.scan_reward || 10}
      visitReward={campaign.visit_reward || 25}
      purchaseReward={campaign.purchase_reward || 50}
      brandColor={campaign.brand_color || '#6366F1'}
      bannerUrl={campaign.banner_url}
    />
  )
}
