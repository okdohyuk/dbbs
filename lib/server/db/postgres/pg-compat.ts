import "server-only";
import { Transform } from "node:stream";
import { StringDecoder } from "node:string_decoder";

// A newer pg_dump (e.g. 17) prepends GUC SETs an older target server rejects
// under ON_ERROR_STOP — notably pg17's `SET transaction_timeout = 0;`. Dropping
// these preamble lines is harmless (the values match the server defaults) and
// lets a dump restore into an older PostgreSQL.
const DROP_LINE = /^\s*SET\s+transaction_timeout\s*=/i;

/** Line-buffered transform that removes server-incompatible preamble SETs. */
export function pgRestoreCompatTransform(): Transform {
  const decoder = new StringDecoder("utf8");
  let buffer = "";
  return new Transform({
    transform(chunk, _enc, cb) {
      buffer += decoder.write(chunk as Buffer);
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      let out = "";
      for (const line of lines) {
        if (!DROP_LINE.test(line)) out += line + "\n";
      }
      cb(null, Buffer.from(out, "utf8"));
    },
    flush(cb) {
      buffer += decoder.end();
      cb(null, Buffer.from(DROP_LINE.test(buffer) ? "" : buffer, "utf8"));
    },
  });
}
