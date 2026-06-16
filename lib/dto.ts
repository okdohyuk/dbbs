import type { Connection, ConnectionPublic } from "@/lib/types";

/** Strip the encrypted password before a connection crosses to the client. */
export function toConnectionPublic(c: Connection): ConnectionPublic {
  const { passwordEnc, ...rest } = c;
  return { ...rest, hasPassword: Boolean(passwordEnc) };
}

export function toConnectionPublicList(list: Connection[]): ConnectionPublic[] {
  return list.map(toConnectionPublic);
}
