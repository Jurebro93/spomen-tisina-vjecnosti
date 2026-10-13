import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

export type MailAttachment = {
  filename: string;
  content: Uint8Array | string;
  contentType?: string;
  encoding?: "base64" | "binary" | "utf-8";
};

export type SendMailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  fromName?: string;
  attachments?: MailAttachment[];
};

export const getMailFrom = (name?: string) => {
  const email = Deno.env.get("SMTP_FROM") ?? Deno.env.get("SMTP_USER") ?? "info@osmrtnica.com.hr";
  const fromName = name ?? Deno.env.get("SMTP_FROM_NAME") ?? "Osmrtnica";
  return `${fromName} <${email}>`;
};

export const isMailConfigured = () =>
  Boolean(Deno.env.get("SMTP_HOST") && Deno.env.get("SMTP_USER") && Deno.env.get("SMTP_PASS"));

export const sendMail = async (opts: SendMailOptions) => {
  const hostname = Deno.env.get("SMTP_HOST") ?? "";
  const port = Number(Deno.env.get("SMTP_PORT") ?? "465");
  const username = Deno.env.get("SMTP_USER") ?? "";
  const password = Deno.env.get("SMTP_PASS") ?? "";
  if (!hostname || !username || !password) {
    throw new Error("SMTP is not configured");
  }

  const to = (Array.isArray(opts.to) ? opts.to : [opts.to]).map((addr) => addr.trim()).filter(Boolean);
  if (to.length === 0) throw new Error("Missing email recipient");

  const client = new SMTPClient({
    connection: {
      hostname,
      port,
      tls: Deno.env.get("SMTP_SECURE") !== "false",
      auth: { username, password },
    },
  });

  try {
    await client.send({
      from: opts.from ?? getMailFrom(opts.fromName),
      to,
      subject: opts.subject,
      html: opts.html,
      content: " ",
      attachments: opts.attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
        encoding: attachment.encoding ?? (typeof attachment.content === "string" ? "base64" : "binary"),
        contentType: attachment.contentType ?? "application/octet-stream",
      })),
    });
  } finally {
    try {
      await client.close();
    } catch {
      // Ignore shutdown errors after a successful or failed send.
    }
  }
};
