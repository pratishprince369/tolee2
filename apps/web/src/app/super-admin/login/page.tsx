'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SuperAdminLogin() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/super-admin/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setSuccess('OTP sent! Check your email (or server console in dev mode).');
      setStep('otp');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/super-admin/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      router.replace('/super-admin');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#09090b',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', sans-serif", padding: 24,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .otp-input { background:#18181b; border:1px solid #27272a; border-radius:10px; color:#fff; font-size:24px; font-weight:700; letter-spacing:8px; text-align:center; padding:16px; width:100%; outline:none; transition:border-color 0.2s; font-family:monospace; }
        .otp-input:focus { border-color:#22c55e; }
        .sa-input { background:#18181b; border:1px solid #27272a; border-radius:10px; color:#fff; font-size:14px; padding:12px 16px; width:100%; outline:none; transition:border-color 0.2s; }
        .sa-input:focus { border-color:#22c55e; }
        .sa-btn { background:linear-gradient(135deg,#16a34a,#22c55e); border:none; border-radius:12px; color:#fff; font-size:15px; font-weight:700; padding:14px; width:100%; cursor:pointer; transition:opacity 0.2s,transform 0.1s; }
        .sa-btn:hover { opacity:0.9; }
        .sa-btn:active { transform:scale(0.98); }
        .sa-btn:disabled { opacity:0.5; cursor:not-allowed; }
      `}</style>

      {/* Background glow */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, background: 'radial-gradient(circle, #22c55e12 0%, transparent 70%)', borderRadius: '50%' }} />
      </div>

      <div style={{ width: '100%', maxWidth: 420, animation: 'fadeUp 0.5s ease' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 72, height: 72, background: 'linear-gradient(135deg, #16a34a, #22c55e)',
            borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, margin: '0 auto 16px', boxShadow: '0 0 40px #22c55e40',
          }}>🌿</div>
          <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 800, margin: 0 }}>Tolee</h1>
          <p style={{ color: '#22c55e', fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', margin: '4px 0 0' }}>Super Admin Panel</p>
        </div>

        {/* Card */}
        <div style={{
          background: '#0d0d0f', border: '1px solid #1c1c1e', borderRadius: 20,
          padding: 32, boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}>
          {step === 'email' ? (
            <>
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>🔐</span>
                  <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>Secure Access</h2>
                </div>
                <p style={{ color: '#71717a', fontSize: 14, lineHeight: 1.6 }}>
                  Enter your authorized admin email. A one-time password will be sent to verify your identity.
                </p>
              </div>

              <form onSubmit={handleRequestOTP} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>ADMIN EMAIL</label>
                  <input
                    className="sa-input"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="pratishrupawate369@gmail.com"
                    required
                    autoFocus
                  />
                </div>

                {error && (
                  <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 10, padding: '10px 14px', color: '#fca5a5', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span>⚠️</span> {error}
                  </div>
                )}

                <button className="sa-btn" type="submit" disabled={loading}>
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <span style={{ width: 16, height: 16, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                      Sending OTP...
                    </span>
                  ) : 'Send OTP →'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 24 }}>
                <button
                  onClick={() => { setStep('email'); setError(''); setOtp(''); }}
                  style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  ← Back
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>📧</span>
                  <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>Enter OTP</h2>
                </div>
                {success && (
                  <div style={{ background: '#052e16', border: '1px solid #14532d', borderRadius: 10, padding: '10px 14px', color: '#86efac', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span>✅</span> {success}
                  </div>
                )}
                <p style={{ color: '#71717a', fontSize: 13, marginTop: 8 }}>
                  Sent to <strong style={{ color: '#a1a1aa' }}>{email}</strong>. Valid for 10 minutes.
                </p>
              </div>

              <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>6-DIGIT OTP</label>
                  <input
                    className="otp-input"
                    type="text"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    required
                    autoFocus
                    inputMode="numeric"
                  />
                </div>

                {error && (
                  <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 10, padding: '10px 14px', color: '#fca5a5', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span>⚠️</span> {error}
                  </div>
                )}

                <button className="sa-btn" type="submit" disabled={loading || otp.length !== 6}>
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <span style={{ width: 16, height: 16, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                      Verifying...
                    </span>
                  ) : '🔓 Access Dashboard'}
                </button>

                <button
                  type="button"
                  onClick={handleRequestOTP}
                  disabled={loading}
                  style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}
                >
                  Resend OTP
                </button>
              </form>
            </>
          )}
        </div>

        {/* Security note */}
        <p style={{ color: '#3f3f46', fontSize: 11, textAlign: 'center', marginTop: 20 }}>
          🔒 Secured with end-to-end encryption · Tolee.in Super Admin
        </p>
      </div>
    </div>
  );
}
