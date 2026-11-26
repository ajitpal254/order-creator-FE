import React from 'react';
import { Wrench, Shield, Globe, Award, Mail, Phone, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const Footer = () => {
  const { t } = useTranslation();
  return (
    <footer
      style={{
        backgroundColor: '#090D16',
        borderTop: '1px solid var(--border-subtle)',
        padding: '3rem 0 1.5rem',
        color: 'var(--text-secondary)',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '2.5rem',
            marginBottom: '2.5rem',
          }}
        >
          {/* Col 1 */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid var(--accent-amber)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  padding: '2px',
                }}
              >
                <img src="/logo.jpg" alt="H.A. Overseas Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', fontFamily: 'var(--font-heading)' }}>
                H.A. OVERSEAS
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-muted)' }}>
              {t('footer.about')}
            </p>
          </div>

          {/* Col 2 */}
          <div>
            <h4 style={{ fontSize: '0.95rem', color: '#FFFFFF', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('footer.divisionsTitle')}
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
              <li>• {t('footer.divisionGreaseGuns')}</li>
              <li>• {t('footer.divisionSpanners')}</li>
              <li>• {t('footer.divisionPliers')}</li>
              <li>• {t('footer.divisionWrenches')}</li>
              <li>• {t('footer.divisionSockets')}</li>
            </ul>
          </div>

          {/* Col 3 */}
          <div>
            <h4 style={{ fontSize: '0.95rem', color: '#FFFFFF', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('footer.qualityTitle')}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award size={18} color="#F59E0B" />
                <span>{t('footer.iso')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={18} color="#38BDF8" />
                <span>{t('footer.standards')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Globe size={18} color="#10B981" />
                <span>{t('footer.shipping')}</span>
              </div>
            </div>
          </div>

          {/* Col 4 */}
          <div>
            <h4 style={{ fontSize: '0.95rem', color: '#FFFFFF', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('footer.exportDeskTitle')}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={16} color="var(--accent-amber)" />
                <a href="mailto:haoverseas1313@gmail.com" style={{ color: 'inherit', textDecoration: 'none' }}>haoverseas1313@gmail.com</a>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Phone size={16} color="var(--accent-amber)" />
                <span>+91-99884-65800 / +91-99888-70308</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <MapPin size={16} color="var(--accent-amber)" style={{ marginTop: '2px' }} />
                <span>{t('footer.location')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <Globe size={16} color="var(--accent-amber)" />
                <a href="https://haoverseas.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-amber)', textDecoration: 'none' }}>
                  haoverseas.com
                </a>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid rgba(42, 54, 79, 0.5)',
            paddingTop: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
          }}
        >
          <div>{t('footer.rights', { year: new Date().getFullYear() })}</div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <span>{t('footer.privacy')}</span>
            <span>{t('footer.terms')}</span>
            <span>{t('footer.guarantee')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
