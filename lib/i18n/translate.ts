export type Dict = Record<string, unknown>;

/** Translation function: dotted-path lookup with optional {var} interpolation. */
export type TFunction = (
  path: string,
  vars?: Record<string, string | number>,
) => string;

export function translate(
  dict: Dict,
  path: string,
  vars?: Record<string, string | number>,
): string {
  let cur: unknown = dict;
  for (const part of path.split(".")) {
    if (cur && typeof cur === "object" && part in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return path; // fall back to the key so missing translations are visible
    }
  }
  if (typeof cur !== "string") return path;
  if (!vars) return cur;
  return cur.replace(/\{(\w+)\}/g, (_, k: string) =>
    k in vars ? String(vars[k]) : `{${k}}`,
  );
}
