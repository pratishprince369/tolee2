'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const navItems = [
  { href: '/super-admin', label: 'Overview', icon: '📊' },
  { href: '/super-admin/users', label: 'Users', icon: '👥' },
  { href: '/super-admin/groups', label: 'Groups', icon: '🏘️' },
  { href: '/super-admin/content', label: 'Content', icon: '📝' },
  { href: '/super-admin/shoots', label: 'Tolee Shoots', icon: '🚀' },
  { href: '/super-admin/ads', label: 'Ads & Campaigns', icon: '📣' },
  { href: '/super-admin/security', label: 'Security & Logs', icon: '🛡️' },
  { href: '/super-admin/search', label: 'Search Analytics', icon: '🔍' },
  { href: '/super-admin/branding', label: 'Branding Settings', icon: '🎨' },
  { href: '/super-admin/contacts', label: 'Contact Queries', icon: '📬' },
  { href: '/super-admin/analytics', label: 'Visitor Analytics', icon: '📈' },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (pathname === '/super-admin/login') {
      setChecking(false);
      return;
    }
    fetch('/api/super-admin/auth/check')
      .then(r => {
        if (!r.ok) router.replace('/super-admin/login');
        else setChecking(false);
      })
      .catch(() => router.replace('/super-admin/login'));
  }, [pathname, router]);

  const handleLogout = async () => {
    await fetch('/api/super-admin/auth/logout', { method: 'POST' });
    router.replace('/super-admin/login');
  };

  if (pathname === '/super-admin/login') return <>{children}</>;
  if (checking) return (
    <div style={{ minHeight: '100vh', background: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, border: '3px solid #22c55e', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#71717a', fontFamily: 'Inter, sans-serif' }}>Verifying access...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', display: 'flex', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #18181b; }
        ::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 2px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .sa-nav-item { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-radius: 10px; color: #a1a1aa; text-decoration: none; font-size: 14px; font-weight: 500; transition: all 0.2s; cursor: pointer; }
        .sa-nav-item:hover { background: #18181b; color: #fff; }
        .sa-nav-item.active { background: linear-gradient(135deg, #16a34a22, #22c55e22); color: #22c55e; border: 1px solid #22c55e33; }
        .mobile-overlay { display: none; }
        @media (max-width: 768px) {
          .sa-sidebar { transform: translateX(-100%); transition: transform 0.3s; position: fixed !important; z-index: 50; }
          .sa-sidebar.open { transform: translateX(0); }
          .mobile-overlay { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 40; }
        }
      `}</style>

      {/* Mobile Overlay */}
      {sidebarOpen && <div className="mobile-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <div className={`sa-sidebar ${sidebarOpen ? 'open' : ''}`} style={{
        width: 240, background: '#0d0d0f', borderRight: '1px solid #18181b',
        display: 'flex', flexDirection: 'column', padding: '24px 12px',
        height: '100vh', position: 'sticky', top: 0, flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: '0 4px 24px', borderBottom: '1px solid #18181b', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #16a34a, #22c55e)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🌿</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>Tolee</div>
              <div style={{ color: '#22c55e', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Super Admin</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`sa-nav-item ${pathname === item.href ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ borderTop: '1px solid #18181b', paddingTop: 16 }}>
          <div style={{ padding: '8px 16px', marginBottom: 8 }}>
            <div style={{ color: '#71717a', fontSize: 11, marginBottom: 2 }}>Signed in as</div>
            <div style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 500 }}>pratishrupawate369@gmail.com</div>
          </div>
          <button
            onClick={handleLogout}
            className="sa-nav-item"
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', color: '#f87171' }}
          >
            <span style={{ fontSize: 18 }}>🚪</span>
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', overflow: 'auto' }}>
        {/* Top Bar */}
        <div style={{ background: '#0d0d0f', borderBottom: '1px solid #18181b', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ display: 'none', background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', fontSize: 20, padding: 4 }}
            className="mobile-menu-btn"
          >
            ☰
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>
              {navItems.find(n => n.href === pathname)?.label || 'Super Admin'}
            </div>
            <div style={{ color: '#71717a', fontSize: 12 }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#18181b', borderRadius: 20, padding: '6px 12px' }}>
            <div style={{ width: 8, height: 8, background: '#22c55e', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
            <span style={{ color: '#22c55e', fontSize: 12, fontWeight: 600 }}>LIVE</span>
          </div>
        </div>

        {/* Page Content */}
        <div style={{ flex: 1, padding: '24px', animation: 'fadeIn 0.3s ease' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
