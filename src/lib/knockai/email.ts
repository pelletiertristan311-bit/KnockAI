// Minimal email sender using the Resend HTTP API (no SDK dependency needed).
// Without RESEND_API_KEY configured: in development the code is logged to the
// server console so local testing keeps working; in production the call fails
// loudly instead of silently pretending to have sent anything.

export async function sendPasswordResetEmail(to: string, code: string): Promise<{ ok: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[dev] Password reset code for ${to}: ${code}`);
      return { ok: true };
    }
    console.error('RESEND_API_KEY is not configured — cannot send password reset email');
    return { ok: false };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESET_EMAIL_FROM || 'KnockAI <onboarding@resend.dev>',
        to,
        subject: 'Votre code de réinitialisation KnockAI',
        html: `<div style="font-family:sans-serif">
          <p>Voici votre code de réinitialisation de mot de passe KnockAI :</p>
          <p style="font-size:28px;font-weight:800;letter-spacing:4px">${code}</p>
          <p style="color:#6B7280;font-size:13px">Ce code expire dans 15 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail — votre mot de passe ne sera pas modifié.</p>
        </div>`,
      }),
    });
    if (!res.ok) {
      console.error('Resend API error:', res.status, await res.text().catch(() => ''));
    }
    return { ok: res.ok };
  } catch (err) {
    console.error('Resend email error:', err);
    return { ok: false };
  }
}
