import "server-only";

/** Turn a thrown job error into an accurate, user-facing message — keeping the
 *  original text and appending a hint for common operational failures. */
export function describeJobError(e: unknown, fallback: string): string {
  let message = e instanceof Error ? e.message : fallback;
  if (/\bEACCES\b|\bEPERM\b|permission denied/i.test(message)) {
    message +=
      " — the snapshot directory is not writable by the app. Make sure SNAPSHOT_DIR (the mounted snapshots volume) is writable, e.g. `chmod 777 ./snapshots`.";
  } else if (/\bENOSPC\b|no space left/i.test(message)) {
    message += " — the disk is full where snapshots are stored.";
  } else if (/binary not found/i.test(message)) {
    message += " — install the database client tools, or set the binary path in Settings.";
  }
  return message;
}
