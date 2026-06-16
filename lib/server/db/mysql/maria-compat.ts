import "server-only";
import { Transform } from "node:stream";
import { StringDecoder } from "node:string_decoder";

/**
 * Rewrite MariaDB-only column-default syntax to MySQL-compatible syntax.
 * MySQL 8.0 rejects function defaults without parentheses (e.g.
 * `DEFAULT sysdate()` / `DEFAULT current_timestamp()`), which MariaDB emits.
 */
export function rewriteMariaLine(line: string): string {
  return line
    .replace(/\bdefault\s+sysdate\s*\(\s*\)/gi, "DEFAULT CURRENT_TIMESTAMP")
    .replace(/\bdefault\s+current_timestamp\s*\(\s*\)/gi, "DEFAULT CURRENT_TIMESTAMP")
    .replace(/\bon\s+update\s+sysdate\s*\(\s*\)/gi, "ON UPDATE CURRENT_TIMESTAMP")
    .replace(/\bon\s+update\s+current_timestamp\s*\(\s*\)/gi, "ON UPDATE CURRENT_TIMESTAMP");
}

/**
 * Line-buffered transform that applies {@link rewriteMariaLine} ONLY inside
 * `CREATE TABLE` blocks. This keeps the rewrite scoped to column definitions so
 * it never mutates row data in INSERT statements or comments — a dump value such
 * as `'... default sysdate() ...'` is left untouched.
 */
export function mariadbCompatTransform(): Transform {
  const decoder = new StringDecoder("utf8");
  let buffer = "";
  let inCreateTable = false;

  const processLine = (line: string): string => {
    if (!inCreateTable) {
      if (/^\s*create\s+table\b/i.test(line)) inCreateTable = true;
      else return line; // outside DDL (INSERT data, comments, etc.) — untouched
    }
    const rewritten = rewriteMariaLine(line);
    // mysqldump closes a CREATE TABLE on a line starting with ')'.
    if (/^\s*\)/.test(line)) inCreateTable = false;
    return rewritten;
  };

  return new Transform({
    transform(chunk, _enc, cb) {
      buffer += decoder.write(chunk as Buffer);
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      let out = "";
      for (const line of lines) out += processLine(line) + "\n";
      cb(null, Buffer.from(out, "utf8"));
    },
    flush(cb) {
      buffer += decoder.end();
      cb(null, Buffer.from(processLine(buffer), "utf8"));
    },
  });
}
