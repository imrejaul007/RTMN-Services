import Link from 'next/link';
import type { Service } from '@/lib/api';

interface Props { service: Service }

export default function ServiceCard({ service }: Props) {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{service.name}</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--muted)', background: 'var(--bg)', padding: '2px 8px', borderRadius: 4 }}>
          :{service.port}
        </span>
      </div>
      <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 12, lineHeight: 1.5 }}>
        {service.description}
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.88rem' }}>
          {service.price.pilot === 0 ? 'Custom' : `$${service.price.pilot}/mo`}
        </span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {service.pilotReady && <span className="badge badge-green" style={{ fontSize: '0.68rem' }}>PILOT</span>}
          <Link href="/auth" className="btn" style={{ padding: '5px 12px', fontSize: '0.78rem', background: 'var(--primary)', color: '#fff' }}>
            Select →
          </Link>
        </div>
      </div>
    </div>
  );
}