// Pure parsers for git file formats and naming conventions (no vscode dependency).

export interface ReflogEntry {
  oldSha: string;
  newSha: string;
  message: string;
}

/** Parses a reflog file; newest entry first. */
export function parseReflog(text: string): ReflogEntry[] {
  return text
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [meta, message = ''] = line.split('\t');
      const [oldSha, newSha] = meta.split(' ');
      return { oldSha, newSha, message };
    })
    .reverse();
}

/** Parses .git/config into sections keyed "user", "remote.origin", "branch.main", … */
export function parseConfig(text: string): Map<string, Record<string, string>> {
  const sections = new Map<string, Record<string, string>>();
  let current: Record<string, string> | undefined;
  for (const line of text.split(/\r?\n/)) {
    const header = /^\s*\[\s*([^\s\]"]+)(?:\s+"([^"]*)")?\s*\]/.exec(line);
    if (header) {
      const base = header[1].toLowerCase();
      const key = header[2] === undefined ? base : `${base}.${header[2]}`;
      current = sections.get(key) ?? {};
      sections.set(key, current);
      continue;
    }
    const kv = /^\s*([A-Za-z][\w-]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (current && kv) {
      current[kv[1].toLowerCase()] = kv[2].replace(/^"(.*)"$/, '$1');
    }
  }
  return sections;
}

export interface SemVer {
  prefix: string;
  v: [number, number, number];
}

/** Parses "v1.2.3" / "1.2.3"; other tags are ignored for version math. */
export function parseSemver(tag: string): SemVer | undefined {
  const m = /^(v?)(\d+)\.(\d+)\.(\d+)$/.exec(tag);
  return m ? { prefix: m[1], v: [+m[2], +m[3], +m[4]] } : undefined;
}

export function compareSemverDesc(a: SemVer, b: SemVer): number {
  return b.v[0] - a.v[0] || b.v[1] - a.v[1] || b.v[2] - a.v[2];
}

/** Bumps part 0 (major), 1 (minor) or 2 (patch) and resets the lower parts. */
export function bumpSemver(s: SemVer, part: 0 | 1 | 2): string {
  const v = [...s.v];
  v[part]++;
  for (let i = part + 1; i < 3; i++) {
    v[i] = 0;
  }
  return `${s.prefix}${v.join('.')}`;
}

/** Turns a clone URL (ssh or https) into the repository's web page URL. */
export function remoteToWebUrl(remote: string): string | undefined {
  const ssh = /^(?:ssh:\/\/)?[^@/\s]+@([^:/\s]+)(?::\d+)?[:/](.+?)(?:\.git)?\/?$/.exec(remote);
  if (ssh && !/^https?:/.test(remote)) {
    return `https://${ssh[1]}/${ssh[2]}`;
  }
  const http = /^https?:\/\/(?:[^@/]+@)?([^/]+)\/(.+?)(?:\.git)?\/?$/.exec(remote);
  return http ? `https://${http[1]}/${http[2]}` : undefined;
}

/** Ticket id in a branch name: "feat/ABC-123-login" → "ABC-123", "fix/123-x" → "123". */
export function ticketFromBranch(branch: string): string | undefined {
  return (
    /[A-Z][A-Z0-9]+-\d+/.exec(branch)?.[0] ?? /(?:^|[/_-])#?(\d{2,})(?=$|[/_-])/.exec(branch)?.[1]
  );
}

/** "feat/ABC-123-login" → { prefix: "feat", topic: "ABC-123-login" }. */
export function splitBranch(branch: string): { prefix?: string; topic?: string } {
  const slash = branch.lastIndexOf('/');
  return {
    prefix: slash > 0 ? branch.slice(0, branch.indexOf('/')) : undefined,
    topic: branch.slice(slash + 1) || undefined,
  };
}

/**
 * Lists paths with unmerged (conflict) entries in a git index file (versions 2-4).
 * Each entry: 62 fixed bytes (stat data, sha, flags), optional 2 extended-flag bytes, the path.
 */
export function conflictsFromIndex(buf: Uint8Array): string[] {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (buf.length < 12 || dv.getUint32(0) !== 0x44495243 /* "DIRC" */) {
    return [];
  }
  const version = dv.getUint32(4);
  const count = dv.getUint32(8);
  const decoder = new TextDecoder();
  const out = new Set<string>();
  let pos = 12;
  let prev: Uint8Array = new Uint8Array(0);
  for (let i = 0; i < count && pos + 62 <= buf.length; i++) {
    const start = pos;
    const flags = dv.getUint16(pos + 60);
    pos += 62;
    if (version >= 3 && flags & 0x4000) {
      pos += 2;
    }
    let name: Uint8Array;
    if (version === 4) {
      // Path is prefix-compressed: varint = bytes to drop from the previous path, then a suffix.
      let c = buf[pos++];
      let strip = c & 0x7f;
      while (c & 0x80) {
        c = buf[pos++];
        strip = ((strip + 1) << 7) | (c & 0x7f);
      }
      const end = buf.indexOf(0, pos);
      const keep = prev.subarray(0, prev.length - strip);
      name = new Uint8Array(keep.length + end - pos);
      name.set(keep);
      name.set(buf.subarray(pos, end), keep.length);
      pos = end + 1;
    } else {
      const end = buf.indexOf(0, pos);
      name = buf.subarray(pos, end);
      pos = start + ((end - start + 8) & ~7); // padded with 1-8 NULs to a multiple of 8
    }
    prev = name;
    if ((flags >> 12) & 3) {
      out.add(decoder.decode(name));
    }
  }
  return [...out];
}
