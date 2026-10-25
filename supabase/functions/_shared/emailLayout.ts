// Shared look for e-mails to visitors: logo header, white card on a warm background, gold button, footer.
// Table layout with inline styles, because e-mail clients (Gmail, Outlook) ignore most CSS.
export const SITE = "https://osmrtnica.com.hr";
const LOGO = `${SITE}/logo-osmrtnica.png`;

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export const emailButton = (href: string, label: string) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0">
  <tr><td style="background:#c9a24a;border-radius:4px">
    <a href="${href}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#111111;text-decoration:none">${label}</a>
  </td></tr>
</table>`;

export const emailParagraph = (html: string) =>
  `<p style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.6;color:#2b2b2b">${html}</p>`;

export const emailNote = (html: string) =>
  `<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#777777">${html}</p>`;

type Layout = {
  /** Hidden preview text that inboxes show next to the subject. */
  preheader: string;
  title: string;
  body: string;
  /** Optional image above the title (absolute URL). */
  image?: { src: string; alt: string; width: number };
  /** Footer line saying why the reader got this e-mail. */
  reason?: string;
};

export const emailLayout = ({ preheader, title, body, image, reason }: Layout) => `<!doctype html>
<html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#f4efe6">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4efe6">
  <tr><td align="center" style="padding:24px 12px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px">
      <tr><td style="background:#111111;padding:20px 28px;border-radius:6px 6px 0 0">
        <a href="${SITE}" style="text-decoration:none">
          <img src="${LOGO}" width="44" height="44" alt="" style="vertical-align:middle;border:0">
          <span style="vertical-align:middle;margin-left:12px;font-family:Georgia,'Times New Roman',serif;font-size:20px;color:#ffffff">Osmrtnica.com.hr</span>
        </a>
      </td></tr>
      <tr><td style="background:#ffffff;padding:32px 28px 12px;border-radius:0 0 6px 6px">
        ${image ? `<img src="${image.src}" width="${image.width}" alt="${escapeHtml(image.alt)}" style="display:block;margin:0 auto 24px;max-width:100%;height:auto;border:0;border-radius:4px;box-shadow:0 4px 14px rgba(0,0,0,.15)">` : ""}
        <h1 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.3;font-weight:normal;color:#111111">${title}</h1>
        ${body}
        <p style="margin:24px 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#2b2b2b">S poštovanjem,<br>tim Osmrtnica.com.hr</p>
      </td></tr>
      <tr><td style="padding:20px 28px;text-align:center">
        ${reason ? emailNote(reason) : ""}
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#999999">
          <a href="${SITE}" style="color:#999999">osmrtnica.com.hr</a> · <a href="mailto:info@osmrtnica.com.hr" style="color:#999999">info@osmrtnica.com.hr</a> · <a href="${SITE}/politika-privatnosti/" style="color:#999999">Politika privatnosti</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
