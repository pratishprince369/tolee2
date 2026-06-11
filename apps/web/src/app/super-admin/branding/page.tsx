'use client';

import { useEffect, useRef, useState } from 'react';

interface BrandingSettings {
  siteName: string;
  tagline: string;
  headerLogoUrl: string | null;
  faviconUrl: string | null;
  mobileLogoUrl: string | null;
  splashScreenLogoUrl: string | null;
}

interface AssetSpec {
  key: keyof Pick<BrandingSettings, 'headerLogoUrl' | 'faviconUrl' | 'mobileLogoUrl' | 'splashScreenLogoUrl'>;
  assetType: string;
  label: string;
  desc: string;
  recommendedW: number;
  recommendedH: number;
  formats: string;
  accept: string;
  preview?: string;
}

const ASSET_SPECS: AssetSpec[] = [
  {
    key: 'headerLogoUrl',
    assetType: 'logo',
    label: 'Header / Main Logo',
    desc: 'Shown in the top navbar and sidebar.',
    recommendedW: 160,
    recommendedH: 40,
    formats: 'PNG, JPG, SVG, WEBP',
    accept: 'image/png,image/jpeg,image/svg+xml,image/webp',
  },
  {
    key: 'mobileLogoUrl',
    assetType: 'mobile_logo',
    label: 'Mobile Logo',
    desc: 'Compact logo shown on mobile header (square preferred).',
    recommendedW: 40,
    recommendedH: 40,
    formats: 'PNG, JPG, SVG, WEBP',
    accept: 'image/png,image/jpeg,image/svg+xml,image/webp',
  },
  {
    key: 'splashScreenLogoUrl',
    assetType: 'splash_logo',
    label: 'Mobile App Splash Screen Logo',
    desc: 'Logo displayed on the mobile app loading/splash screen.',
    recommendedW: 512,
    recommendedH: 512,
    formats: 'PNG, JPG, SVG, WEBP',
    accept: 'image/png,image/jpeg,image/svg+xml,image/webp',
  },
  {
    key: 'faviconUrl',
    assetType: 'favicon',
    label: 'Favicon',
    desc: 'Browser tab icon. Use a square image for best results.',
    recommendedW: 32,
    recommendedH: 32,
    formats: 'PNG, ICO, SVG',
    accept: 'image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml',
  },
];

const card: React.CSSProperties = {
  background: '#111113',
  border: '1px solid #1f1f23',
  borderRadius: 16,
  padding: 24,
  marginBottom: 20,
};

const label: React.CSSProperties = {
  color: '#a1a1aa',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 1,
  marginBottom: 6,
  display: 'block',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#18181b',
  border: '1px solid #27272a',
  borderRadius: 10,
  padding: '10px 14px',
  color: '#fff',
  fontSize: 14,
  outline: 'none',
  fontFamily: 'Inter, sans-serif',
};

const btn = (color: string, bg: string): React.CSSProperties => ({
  background: bg,
  color,
  border: 'none',
  borderRadius: 10,
  padding: '9px 20px',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'Inter, sans-serif',
  transition: 'opacity 0.2s',
});

export default function BrandingPage() {
  const [settings, setSettings] = useState<BrandingSettings>({
    siteName: 'tolee',
    tagline: 'Connect. Share. Discover.',
    headerLogoUrl: null,
    faviconUrl: null,
    mobileLogoUrl: null,
    splashScreenLogoUrl: null,
  });
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetch('/api/super-admin/branding')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.settings) {
          setSettings(d.settings);
        }
      });
  }, []);

  const handleUpload = async (assetType: string, key: keyof BrandingSettings, file: File) => {
    setUploading(p => ({ ...p, [key]: true }));

    // Local preview
    const reader = new FileReader();
    reader.onload = e => setPreviews(p => ({ ...p, [key]: e.target?.result as string }));
    reader.readAsDataURL(file);

    const form = new FormData();
    form.append('file', file);
    form.append('assetType', assetType);

    const res = await fetch('/api/super-admin/upload-branding', { method: 'POST', body: form });
    const data = await res.json();

    if (data.success) {
      setSettings(p => ({ ...p, [key]: data.url }));
      showToast('✅ Image uploaded successfully!');
    } else {
      showToast(data.error || 'Upload failed', 'error');
    }
    setUploading(p => ({ ...p, [key]: false }));
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch('/api/super-admin/branding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    setSaving(false);
    if (data.success) {
      showToast('🎉 Branding saved & published!');
    } else {
      showToast(data.error || 'Save failed', 'error');
    }
  };

  const handleReset = (key: keyof BrandingSettings) => {
    setSettings(p => ({ ...p, [key]: null }));
    setPreviews(p => ({ ...p, [key]: '' }));
  };

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', fontFamily: 'Inter, sans-serif', position: 'relative' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          background: toast.type === 'success' ? '#16a34a' : '#dc2626',
          color: '#fff', padding: '12px 20px', borderRadius: 12,
          fontWeight: 600, fontSize: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          animation: 'fadeIn 0.3s ease',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #7c3aed, #a855f7)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
            🎨
          </div>
          <div>
            <h1 style={{ color: '#fff', fontWeight: 800, fontSize: 22, margin: 0 }}>Branding Settings</h1>
            <p style={{ color: '#71717a', fontSize: 13, margin: 0 }}>Manage logos, favicon, and site identity — no code required.</p>
          </div>
        </div>
      </div>

      {/* Site Name & Tagline */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 18 }}>🏷️</span>
          <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: 0 }}>Site Identity</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={label}>Website / Brand Name</label>
            <input
              style={inputStyle}
              value={settings.siteName}
              onChange={e => setSettings(p => ({ ...p, siteName: e.target.value }))}
              placeholder="e.g. tolee"
            />
            <p style={{ color: '#52525b', fontSize: 11, marginTop: 4 }}>Displayed in header, browser tab title, and login page.</p>
          </div>
          <div>
            <label style={label}>Tagline</label>
            <input
              style={inputStyle}
              value={settings.tagline}
              onChange={e => setSettings(p => ({ ...p, tagline: e.target.value }))}
              placeholder="e.g. Connect. Share. Discover."
            />
            <p style={{ color: '#52525b', fontSize: 11, marginTop: 4 }}>Short brand descriptor shown on the homepage.</p>
          </div>
        </div>
      </div>

      {/* Logo / Favicon Upload Cards */}
      {ASSET_SPECS.map(spec => {
        const currentUrl = (previews[spec.key] || settings[spec.key]) as string | null;
        const isUploading = uploading[spec.key];

        return (
          <div key={spec.key} style={card}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 18 }}>
                    {spec.key === 'faviconUrl' ? '🌐' : spec.key === 'mobileLogoUrl' ? '📱' : spec.key === 'splashScreenLogoUrl' ? '✨' : '🖼️'}
                  </span>
                  <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: 0 }}>{spec.label}</h2>
                </div>
                <p style={{ color: '#71717a', fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>{spec.desc}</p>

                {/* Recommended size badge */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: '#1e1b4b', border: '1px solid #3730a3', borderRadius: 8,
                  padding: '6px 12px', marginBottom: 16,
                }}>
                  <span style={{ fontSize: 14 }}>📐</span>
                  <div>
                    <div style={{ color: '#818cf8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Recommended Size</div>
                    <div style={{ color: '#c7d2fe', fontSize: 13, fontWeight: 800 }}>
                      {spec.recommendedW} × {spec.recommendedH} px
                    </div>
                  </div>
                  <div style={{ borderLeft: '1px solid #3730a3', paddingLeft: 8, marginLeft: 4 }}>
                    <div style={{ color: '#818cf8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Formats</div>
                    <div style={{ color: '#c7d2fe', fontSize: 12, fontWeight: 600 }}>{spec.formats}</div>
                  </div>
                </div>

                {/* Upload button */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    style={{ ...btn('#fff', '#7c3aed'), opacity: isUploading ? 0.6 : 1 }}
                    onClick={() => fileRefs.current[spec.key]?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? '⏳ Uploading...' : '📤 Upload Image'}
                  </button>
                  {currentUrl && (
                    <button
                      style={btn('#f87171', '#1f1f23')}
                      onClick={() => handleReset(spec.key)}
                    >
                      🗑️ Remove
                    </button>
                  )}
                  <input
                    ref={el => { fileRefs.current[spec.key] = el; }}
                    type="file"
                    accept={spec.accept}
                    style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(spec.assetType, spec.key, file);
                      e.target.value = '';
                    }}
                  />
                </div>
              </div>

              {/* Preview Box */}
              <div style={{ flexShrink: 0 }}>
                <div style={{ color: '#52525b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, textAlign: 'center' }}>
                  Preview
                </div>
                <div style={{
                  width: spec.key === 'faviconUrl' ? 80 : spec.key === 'mobileLogoUrl' ? 80 : spec.key === 'splashScreenLogoUrl' ? 80 : 180,
                  height: spec.key === 'faviconUrl' ? 80 : spec.key === 'mobileLogoUrl' ? 80 : spec.key === 'splashScreenLogoUrl' ? 80 : 60,
                  background: '#18181b',
                  border: '2px dashed #27272a',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  position: 'relative',
                }}>
                  {currentUrl ? (
                    <img
                      src={currentUrl}
                      alt="preview"
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <span style={{ color: '#3f3f46', fontSize: 12, textAlign: 'center', padding: 8 }}>No image</span>
                  )}
                </div>
                {currentUrl && (
                  <div style={{ textAlign: 'center', marginTop: 6 }}>
                    <span style={{
                      background: '#14532d', color: '#4ade80', fontSize: 10,
                      fontWeight: 700, padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: 0.5
                    }}>
                      ✓ Set
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Live Preview Banner */}
      <div style={{ ...card, background: 'linear-gradient(135deg, #0c0a1e, #1a0533)', border: '1px solid #4c1d95', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 20 }}>👁️</span>
          <h2 style={{ color: '#e9d5ff', fontWeight: 700, fontSize: 16, margin: 0 }}>Live Header Preview</h2>
        </div>
        {/* Simulated header */}
        <div style={{
          background: '#fff', borderRadius: 12, padding: '12px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        }}>
          {settings.headerLogoUrl || previews['headerLogoUrl'] ? (
            <img
              src={previews['headerLogoUrl'] || settings.headerLogoUrl!}
              alt="logo preview"
              style={{ height: 36, maxWidth: 160, objectFit: 'contain' }}
            />
          ) : (
            <div style={{
              width: 36, height: 36, background: '#09090b', borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 900, fontSize: 18,
            }}>
              {settings.siteName?.[0]?.toLowerCase() || 't'}
            </div>
          )}
          <span style={{ fontWeight: 800, fontSize: 18, color: '#09090b', fontFamily: 'Inter, sans-serif' }}>
            {settings.siteName || 'tolee'}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <div style={{ width: 80, height: 8, background: '#f4f4f5', borderRadius: 4 }} />
            <div style={{ width: 60, height: 8, background: '#f4f4f5', borderRadius: 4 }} />
            <div style={{ width: 32, height: 32, background: '#f4f4f5', borderRadius: '50%' }} />
          </div>
        </div>
        {settings.faviconUrl || previews['faviconUrl'] ? (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              background: '#e9e9e9', borderRadius: 8, padding: '4px 12px',
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#09090b',
            }}>
              <img
                src={previews['faviconUrl'] || settings.faviconUrl!}
                alt="favicon"
                style={{ width: 16, height: 16, objectFit: 'contain' }}
              />
              {settings.siteName || 'tolee'}.in
            </div>
            <span style={{ color: '#71717a', fontSize: 12 }}>← Browser tab preview</span>
          </div>
        ) : null}
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingBottom: 40 }}>
        <button
          style={{ ...btn('#a1a1aa', '#18181b'), border: '1px solid #27272a' }}
          onClick={() => window.location.reload()}
        >
          🔄 Reset
        </button>
        <button
          style={{ ...btn('#fff', 'linear-gradient(135deg, #7c3aed, #a855f7)'), opacity: saving ? 0.7 : 1, padding: '10px 28px' }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? '⏳ Publishing...' : '🚀 Save & Publish Branding'}
        </button>
      </div>
    </div>
  );
}
