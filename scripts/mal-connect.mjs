import { createServer } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { readFile, writeFile, chmod } from "node:fs/promises";
import { resolve } from "node:path";
import nextEnv from "@next/env";

const envDirectory = resolve(process.env.MAL_ENV_DIR || process.cwd());
nextEnv.loadEnvConfig(envDirectory);
const { MAL_CLIENT_ID: clientId, MAL_CLIENT_SECRET: clientSecret } = process.env;
if (!clientId || !clientSecret) {
  console.error("Configure MAL_CLIENT_ID and MAL_CLIENT_SECRET in .env.local before running mal:connect.");
  process.exit(1);
}
const redirectUri = "http://127.0.0.1:4382/callback";
const state = randomBytes(32).toString("hex");
const verifier = randomBytes(48).toString("base64url");
const url = new URL("https://myanimelist.net/v1/oauth2/authorize");
url.search = new URLSearchParams({ client_id: clientId, response_type: "code", redirect_uri: redirectUri, state, code_challenge: verifier, code_challenge_method: "plain" }).toString();
let completing = false;
const server = createServer(async (request, response) => {
  const callback = new URL(request.url, redirectUri);
  if (callback.pathname !== "/callback") { response.writeHead(404).end(); return; }
  const received = callback.searchParams.get("state") ?? "";
  if (Buffer.byteLength(received) !== Buffer.byteLength(state) || !timingSafeEqual(Buffer.from(received), Buffer.from(state))) {
    response.writeHead(400).end("Invalid authorization state. Use the link from the terminal."); return;
  }
  if (completing) { response.writeHead(409).end("Authorization is already being processed."); return; }
  completing = true;
  try {
    const code = callback.searchParams.get("code");
    if (!code) throw new Error("Authorization was declined. Run mal:connect again.");
    const tokenResponse = await fetch("https://myanimelist.net/v1/oauth2/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "authorization_code", code, redirect_uri: redirectUri, code_verifier: verifier }),
      signal: AbortSignal.timeout(15000),
    });
    const token = await tokenResponse.json();
    if (!tokenResponse.ok || !token.refresh_token || !token.access_token) throw new Error("MAL did not return usable tokens. Check the app credentials and registered redirect URI.");
    const profile = await fetch("https://api.myanimelist.net/v2/users/@me", { headers: { Authorization: `Bearer ${token.access_token}` }, signal: AbortSignal.timeout(15000) });
    if (!profile.ok || (await profile.json()).name?.toLowerCase() !== "theswiginator") throw new Error("Sign in as TheSwiginator. No credentials were saved for this account.");
    const envFile = resolve(envDirectory, ".env.local");
    let env = await readFile(envFile, "utf8").catch(error => { if (error.code === "ENOENT") return ""; throw error; });
    const entry = `MAL_REFRESH_TOKEN=${token.refresh_token}`;
    env = /^MAL_REFRESH_TOKEN=.*$/m.test(env) ? env.replace(/^MAL_REFRESH_TOKEN=.*$/m, () => entry) : `${env.trimEnd()}\n${entry}\n`;
    await writeFile(envFile, env, { mode: 0o600 });
    await chmod(envFile, 0o600);
    response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }).end("MyAnimeList connected as TheSwiginator. Close this tab and restart the website server.");
    console.log("Connected as TheSwiginator. Refresh token saved privately in .env.local. Restart the server; synchronize the MAL variables to deployment before enabling public recommendations.");
  } catch (error) {
    response.writeHead(500, { "Content-Type": "text/plain", "Cache-Control": "no-store" }).end("Connection failed. See the terminal for details.");
    console.error(error instanceof Error ? error.message : "Connection failed.");
    process.exitCode = 1;
  } finally { clearTimeout(timeout); server.close(); }
});
const timeout = setTimeout(() => { console.error("Authorization timed out. Run mal:connect again."); server.close(); process.exitCode = 1; }, 600000);
server.on("error", () => { clearTimeout(timeout); console.error("Could not start the authorization listener on port 4382."); process.exitCode = 1; });
server.listen(4382, "127.0.0.1", () => {
  console.log(`Register ${redirectUri} as a redirect URI in your MAL app, then authorize TheSwiginator:\n\n${url}\n\nWaiting up to ten minutes…`);
  // A launcher can receive only the public authorization URL, never tokens.
  if (process.send) process.send({ authorizationUrl: url.href });
});
