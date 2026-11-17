/** Shell-quotes a value unless it is plainly safe. */
export const shellQuote = (s: string): string =>
  /^[\w@%+=:,./-]+$/.test(s) ? s : `'${s.replace(/'/g, `'\\''`)}'`;

/** Lowercase and drop everything but letters/digits: "Current Branch" = "currentBranch". */
export const normalizeName = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]/g, '');

export const pad2 = (n: number): string => String(n).padStart(2, '0');
