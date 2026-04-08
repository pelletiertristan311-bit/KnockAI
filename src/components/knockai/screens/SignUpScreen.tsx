'use client';
import { useState } from 'react';
import { useKnockAIStore } from '@/lib/knockai/store';

export default function SignUpScreen() {
  const { signup, setAuthScreen } = useKnockAIStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!name || !email || !password) { setError('Please fill in all fields.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (!agreed) { setError('Please accept the Terms of Service.'); return; }
    setLoading(true); setError('');
    const result = await signup(name, email, password);
    setLoading(false);
    if (!result.ok) setError(result.error || 'Registration failed');
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#1E1E2E', overflow: 'auto' }}>
      <div style={{ padding: '48px 24px 24px', background: 'linear-gradient(180deg, #0D2B55, #1E1E2E)' }}>
        <button onClick={() => setAuthScreen('login')} style={{ background: 'none', border: 'none', color: '#1A6FD6', cursor: 'pointer', marginBottom: 12, fontSize: 15 }}>← Back</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #1A6FD6, #00B4D8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>🤜</div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>Create Account</div>
            <p style={{ color: '#9CA3AF', fontSize: 13, marginTop: 2 }}>Your data is saved to the cloud</p>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, padding: '24px' }}>
        {([['Full Name', name, setName, 'text', 'John Smith'], ['Email', email, setEmail, 'email', 'you@example.com'], ['Password', password, setPassword, 'password', '••••••••'], ['Confirm Password', confirm, setConfirm, 'password', '••••••••']] as [string, string, (v: string) => void, string, string][]).map(([label, val, setter, type, ph]) => (
          <div key={label} style={{ marginBottom: 16 }}>
            <label style={labelStyle}>{label}</label>
            <input value={val} onChange={(e) => setter(e.target.value)} type={type} placeholder={ph} style={inputStyle} />
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#1A6FD6', cursor: 'pointer' }} />
          <span style={{ color: '#9CA3AF', fontSize: 14 }}>I agree to the <span style={{ color: '#1A6FD6' }}>Terms of Service</span></span>
        </div>
        {error && <p style={{ color: '#EF4444', fontSize: 14, marginBottom: 12 }}>{error}</p>}
        <button onClick={handle} disabled={loading} style={btnStyle}>{loading ? 'Creating Account...' : 'Create Account'}</button>
        <div style={{ textAlign: 'center', marginTop: 20, color: '#6B7280', fontSize: 14 }}>
          Already have an account?{' '}
          <button onClick={() => setAuthScreen('login')} style={{ background: 'none', border: 'none', color: '#1A6FD6', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>Sign In</button>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', color: '#9CA3AF', fontSize: 13, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: '#F0F4F822', color: '#fff', fontSize: 16, outline: 'none', boxSizing: 'border-box' };
const btnStyle: React.CSSProperties = { width: '100%', padding: '16px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(90deg, #1A6FD6, #00B4D8)', color: '#fff', fontSize: 17, fontWeight: 700, boxShadow: '0 4px 20px rgba(26,111,214,0.4)' };
