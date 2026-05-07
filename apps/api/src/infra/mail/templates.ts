// Plain-text + minimal HTML transactional templates.
// Kept as inlined strings on purpose — no JSX runtime, no framework, no fluff.
// Every email must work in plain text (text/plain part) and on legacy clients.

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const wrap = (heading: string, paragraphsHtml: string[], cta?: { label: string; href: string }) => {
  const ctaHtml = cta
    ? `<p style="margin:24px 0;">
         <a href="${escapeHtml(cta.href)}"
            style="display:inline-block;padding:12px 24px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">
           ${escapeHtml(cta.label)}
         </a>
       </p>`
    : '';

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(heading)}</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;padding:32px;border-radius:12px;border:1px solid #e2e8f0;">
    <h1 style="margin:0 0 16px;font-size:20px;">${escapeHtml(heading)}</h1>
    ${paragraphsHtml.join('\n')}
    ${ctaHtml}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0 16px;">
    <p style="font-size:12px;color:#64748b;margin:0;">
      You're receiving this because someone (hopefully you) used your email address with Outflow.
      If this wasn't you, you can safely ignore this message.
    </p>
  </div>
</body></html>`;
};

export function renderVerifyEmailEmail(opts: {
  to: string;
  name?: string | null;
  verifyUrl: string;
}): { html: string; text: string } {
  const greeting = opts.name ? `Hi ${opts.name},` : 'Hi there,';
  const html = wrap(
    'Verify your email',
    [
      `<p>${escapeHtml(greeting)}</p>`,
      `<p>Tap the button below to confirm <strong>${escapeHtml(opts.to)}</strong> belongs to you. The link expires in 24 hours.</p>`,
      `<p style="font-size:13px;color:#64748b;">If the button doesn't work, paste this link into your browser:<br>
        <a href="${escapeHtml(opts.verifyUrl)}">${escapeHtml(opts.verifyUrl)}</a></p>`,
    ],
    { label: 'Verify email', href: opts.verifyUrl },
  );

  const text = [
    greeting,
    '',
    `Tap this link to confirm ${opts.to} belongs to you (expires in 24 hours):`,
    opts.verifyUrl,
    '',
    "If you didn't sign up for Outflow you can safely ignore this email.",
  ].join('\n');

  return { html, text };
}

export function renderResetPasswordEmail(opts: {
  to: string;
  name?: string | null;
  resetUrl: string;
}): { html: string; text: string } {
  const greeting = opts.name ? `Hi ${opts.name},` : 'Hi there,';
  const html = wrap(
    'Reset your Outflow password',
    [
      `<p>${escapeHtml(greeting)}</p>`,
      `<p>Click the button below to choose a new password. This link is valid for 1 hour and can be used once.</p>`,
      `<p style="font-size:13px;color:#64748b;">If you didn't request this, ignore this email — your password won't change.</p>`,
    ],
    { label: 'Reset password', href: opts.resetUrl },
  );

  const text = [
    greeting,
    '',
    'Use this link to choose a new password (valid for 1 hour):',
    opts.resetUrl,
    '',
    "If you didn't request this, you can safely ignore this email.",
  ].join('\n');

  return { html, text };
}
