import { readFile, writeFile, chmod } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { parseEnv } from "node:util";

let text = await readFile(".env.local", "utf8").catch((error) => {
    if (error.code === "ENOENT") return "";
    throw error;
});
const existing = parseEnv(text);
const originalText = text;
for (const [name, value] of Object.entries({ NEXTAUTH_SECRET: randomBytes(32).toString("base64url"), NEXTAUTH_URL: "http://localhost:3001" })) {
    if (existing[name]) continue;
    const line = `${name}=${value}`;
    text = new RegExp(`^${name}=.*$`, "m").test(text) ? text.replace(new RegExp(`^${name}=.*$`, "m"), line) : `${text.trimEnd()}\n${line}\n`;
    console.log(`Configured ${name} locally.`);
}
if (text !== originalText) await writeFile(".env.local", text, { mode: 0o600 });
await chmod(".env.local", 0o600);
const values = parseEnv(text);
const missing = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "PHOTO_ADMIN_EMAIL"].filter((name) => !values[name]?.trim());
console.log(missing.length ? `Still required in .env.local: ${missing.join(", ")}` : "Google photo-auth variables are present. Restart the site before signing in.");
console.log("Register the callback at your site origin plus /api/auth/callback/google. No credential values were printed.");
