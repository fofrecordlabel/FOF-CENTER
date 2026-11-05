const CODE = "2222";
const SECRET = "fof-records-desk-gate";

export function codesMatch(input: string) {
  const given = input.trim();
  if (given.length !== CODE.length) return false;
  let difference = 0;
  for (let index = 0; index < CODE.length; index += 1) {
    difference |= given.charCodeAt(index) ^ CODE.charCodeAt(index);
  }
  return difference === 0;
}

export async function deskToken() {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("open"));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
