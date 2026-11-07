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
  /** Where "Reply" goes, e.g. the visitor who asked for help. */
  replyTo?: string;
  attachments?: MailAttachment[];
  /** Message-ID of the mail this one answers, so mail apps show both in one conversation. */
  inReplyTo?: string;
  references?: string;
  headers?: Record<string, string>;
};

export const getMailFrom = (name?: string) => {
  const email = Deno.env.get("SMTP_FROM") ?? Deno.env.get("SMTP_USER") ?? "info@osmrtnica.com.hr";
  const fromName = name ?? Deno.env.get("SMTP_FROM_NAME") ?? "Osmrtnica.com.hr";
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
      replyTo: opts.replyTo,
      inReplyTo: opts.inReplyTo,
      references: opts.references,
      headers: opts.headers,
      subject: opts.subject,
      // denomailer does not dot-stuff quoted-printable lines, so a "." that lands at the start of a
      // wrapped line is dropped by the receiving server (seen: "osmrtnica.comhr"). As an entity it survives.
      html: opts.html.replace(/\./g, "&#46;"),
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
