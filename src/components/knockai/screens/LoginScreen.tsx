'use client';
import { useState } from 'react';
import { useKnockAIStore } from '@/lib/knockai/store';

export default function LoginScreen() {
  const { login, setAuthScreen } = useKnockAIStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true); setError('');
    const result = await login(email, password);
    setLoading(false);
    if (!result.ok) setError(result.error || 'Login failed');
  };

  return (
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', background: '#1E1E2E', overflowY: 'auto' }}>
      <div style={{ padding: '48px 24px 24px', background: 'linear-gradient(180deg, #0D2B55, #1E1E2E)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ width: 90, height: 90, borderRadius: 22, background: 'linear-gradient(135deg, #1A6FD6, #00B4D8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, marginBottom: 12, boxShadow: '0 0 30px rgba(26,111,214,0.5)' }}>🤜</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#fff' }}>KnockAI</div>
        <p style={{ color: '#9CA3AF', fontSize: 15 }}>Sign in to your account</p>
      </div>

      <div style={{ flex: 1, padding: '24px' }}>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" style={inputStyle} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={labelStyle}>Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" style={inputStyle} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
        </div>
        <div style={{ textAlign: 'right', marginBottom: 24 }}>
          <button onClick={() => setAuthScreen('forgot')} style={{ background: 'none', border: 'none', color: '#1A6FD6', fontSize: 14, cursor: 'pointer' }}>Forgot Password?</button>
        </div>

        {error && <p style={{ color: '#EF4444', fontSize: 14, marginBottom: 12 }}>{error}</p>}

        <button onClick={handleLogin} disabled={loading} style={btnStyle}>{loading ? 'Signing in...' : 'Sign In'}</button>

        <div style={{ textAlign: 'center', marginTop: 24, color: '#6B7280', fontSize: 14 }}>
          Don&apos;t have an account?{' '}
          <button onClick={() => setAuthScreen('signup')} style={{ background: 'none', border: 'none', color: '#1A6FD6', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>Sign Up</button>
        </div>

        <div style={{ marginTop: 32, padding: 16, background: 'rgba(26,111,214,0.1)', borderRadius: 12, border: '1px solid rgba(26,111,214,0.2)' }}>
          <p style={{ color: '#00B4D8', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>DEMO ACCOUNT</p>
          <p style={{ color: '#9CA3AF', fontSize: 13 }}>Email: demo@knockai.com</p>
          <p style={{ color: '#9CA3AF', fontSize: 13 }}>Password: password</p>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', color: '#9CA3AF', fontSize: 13, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: '#F0F4F822', color: '#fff', fontSize: 16, outline: 'none', boxSizing: 'border-box' };
const btnStyle: React.CSSProperties = { width: '100%', padding: '16px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(90deg, #1A6FD6, #00B4D8)', color: '#fff', fontSize: 17, fontWeight: 700, boxShadow: '0 4px 20px rgba(26,111,214,0.4)' };
