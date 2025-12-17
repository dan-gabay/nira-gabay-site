export function getUserIdentifier(): string {
  if (typeof window === "undefined") return "server";
  const key = "user_identifier";

  let v = localStorage.getItem(key);
  if (!v) {
    v = crypto.randomUUID();
    localStorage.setItem(key, v);
  }
  return v;
}
