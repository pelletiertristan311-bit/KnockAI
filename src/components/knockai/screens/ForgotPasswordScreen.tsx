'use client';
import { useState } from 'react';
import { useKnockAIStore } from '@/lib/knockai/store';

export default function ForgotPasswordScreen() {
  const { setAuthScreen } = useKnockAIStore();
  const [step, setStep] = useState<'email' | 'code' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    if (!email) { setError('Enter your email'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/knockai/auth/forgot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed'); setLoading(false); return; }
      setResetCode(json.code);
      setStep('code');
    } catch { setError('Network error'); }
    setLoading(false);
  };

  const resetPassword = async () => {
    if (!code || !newPassword) { setError('Fill all fields'); return; }
    if (newPassword !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/knockai/auth/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, newPassword }) });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed'); setLoading(false); return; }
      setStep('done');
    } catch { setError('Network error'); }
    setLoading(false);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#1E1E2E', overflowY: 'auto' }}>
      <div style={{ padding: '48px 24px 24px', background: 'linear-gradient(180deg, #0D2B55, #1E1E2E)' }}>
        <button onClick={() => setAuthScreen('login')} style={{ background: 'none', border: 'none', color: '#1A6FD6', cursor: 'pointer', marginBottom: 12, fontSize: 15 }}>← Back</button>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Reset Password</h1>
        <p style={{ color: '#9CA3AF', fontSize: 14, marginTop: 4 }}>
          {step === 'email' ? 'Enter your email to receive a reset code.' : step === 'code' ? 'Enter the code and your new password.' : 'Password reset successfully!'}
        </p>
      </div>

      <div style={{ flex: 1, padding: '24px' }}>
        {step === 'email' && (
          <>
            <label style={labelStyle}>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" style={inputStyle} />
            {error && <p style={{ color: '#EF4444', fontSize: 14, marginTop: 8 }}>{error}</p>}
            <button onClick={sendCode} disabled={loading} style={{ ...btnStyle, marginTop: 24 }}>{loading ? 'Sending...' : 'Send Reset Code'}</button>
          </>
        )}

        {step === 'code' && (
          <>
            {resetCode && (
              <div style={{ padding: 16, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, marginBottom: 20 }}>
                <p style={{ color: '#10B981', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Your reset code (copy it):</p>
                <p style={{ color: '#fff', fontSize: 28, fontWeight: 900, letterSpacing: 4 }}>{resetCode}</p>
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Reset Code</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>New Password</label>
              <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" placeholder="••••••••" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Confirm Password</label>
              <input value={confirm} onChange={(e) => setConfirm(e.target.value)} type="password" placeholder="••••••••" style={inputStyle} />
            </div>
            {error && <p style={{ color: '#EF4444', fontSize: 14, marginBottom: 12 }}>{error}</p>}
            <button onClick={resetPassword} disabled={loading} style={btnStyle}>{loading ? 'Resetting...' : 'Reset Password'}</button>
          </>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
            <p style={{ color: '#10B981', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Password reset!</p>
            <p style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 24 }}>You can now sign in with your new password.</p>
            <button onClick={() => setAuthScreen('login')} style={btnStyle}>Go to Sign In</button>
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', color: '#9CA3AF', fontSize: 13, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: '#F0F4F822', color: '#fff', fontSize: 16, outline: 'none', boxSizing: 'border-box' };
const btnStyle: React.CSSProperties = { width: '100%', padding: '16px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(90deg, #1A6FD6, #00B4D8)', color: '#fff', fontSize: 17, fontWeight: 700 };
