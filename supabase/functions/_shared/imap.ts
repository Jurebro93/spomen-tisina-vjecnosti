// Minimal read-only IMAP client over TLS, just enough for the e-mail assistant: log in, open INBOX, list UIDs
// and fetch whole messages with BODY.PEEK[] (which leaves the "unread" flag alone, so the inbox looks the same
// in webmail afterwards). No library: the npm IMAP clients depend on Node sockets that the edge runtime only
// partly emulates.

const enc = new TextEncoder();
const dec = new TextDecoder("latin1");

export type ImapMessage = { uid: number; raw: Uint8Array };

export class ImapClient {
  private conn!: Deno.TlsConn;
  private buf = new Uint8Array(0);
  private tagNo = 0;

  constructor(private host: string, private port = 993) {}

  async connect(user: string, pass: string) {
    this.conn = await Deno.connectTls({ hostname: this.host, port: this.port });
    await this.readLine(); // server greeting
    await this.command(`LOGIN ${quote(user)} ${quote(pass)}`);
  }

  /** Opens INBOX read-only and returns its UIDVALIDITY. */
  async selectInbox(): Promise<number> {
    const { lines } = await this.command("EXAMINE INBOX");
    for (const l of lines) {
      const m = l.match(/UIDVALIDITY (\d+)/i);
      if (m) return Number(m[1]);
    }
    return 0;
  }

  /** UIDs greater than `afterUid`, ascending. */
  async uidsAfter(afterUid: number): Promise<number[]> {
    const { lines } = await this.command(`UID SEARCH UID ${afterUid + 1}:*`);
    const out: number[] = [];
    for (const l of lines) {
      if (/^\* SEARCH/i.test(l)) {
        for (const n of l.replace(/^\* SEARCH/i, "").trim().split(/\s+/)) if (n) out.push(Number(n));
      }
    }
    // "N:*" always matches the newest message, even when its UID is below N.
    return out.filter((u) => u > afterUid).sort((a, b) => a - b);
  }

  async fetch(uid: number): Promise<ImapMessage | null> {
    const { literals } = await this.command(`UID FETCH ${uid} (BODY.PEEK[])`);
    return literals.length ? { uid, raw: literals[0] } : null;
  }

  async logout() {
    try {
      await this.command("LOGOUT");
    } catch {
      // The server may close first.
    }
    try {
      this.conn.close();
    } catch {
      // Already closed.
    }
  }

  private async command(cmd: string) {
    const tag = `A${++this.tagNo}`;
    await this.conn.write(enc.encode(`${tag} ${cmd}\r\n`));
    const lines: string[] = [];
    const literals: Uint8Array[] = [];
    for (;;) {
      let line = await this.readLine();
      // A line ending in {N} is followed by exactly N bytes of literal data, then the rest of the line.
      let lit = line.match(/\{(\d+)\}$/);
      while (lit) {
        literals.push(await this.readBytes(Number(lit[1])));
        const rest = await this.readLine();
        line += rest;
        lit = rest.match(/\{(\d+)\}$/);
      }
      if (line.startsWith(`${tag} `)) {
        if (!/^\S+ OK/i.test(line)) throw new Error(`IMAP ${cmd.split(" ")[0]} failed: ${line.slice(0, 200)}`);
        return { lines, literals };
      }
      lines.push(line);
    }
  }

  private async fill() {
    const chunk = new Uint8Array(64 * 1024);
    const n = await this.conn.read(chunk);
    if (n === null) throw new Error("IMAP connection closed");
    const next = new Uint8Array(this.buf.length + n);
    next.set(this.buf);
    next.set(chunk.subarray(0, n), this.buf.length);
    this.buf = next;
  }

  private async readLine(): Promise<string> {
    for (;;) {
      const i = this.buf.indexOf(10);
      if (i >= 0) {
        const line = dec.decode(this.buf.subarray(0, i)).replace(/\r$/, "");
        this.buf = this.buf.slice(i + 1);
        return line;
      }
      await this.fill();
    }
  }

  private async readBytes(n: number): Promise<Uint8Array> {
    while (this.buf.length < n) await this.fill();
    const out = this.buf.slice(0, n);
    this.buf = this.buf.slice(n);
    return out;
  }
}

const quote = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
