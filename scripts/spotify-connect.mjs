import { createServer } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { readFile, writeFile, chmod } from "node:fs/promises";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());
const { SPOTIFY_CLIENT_ID: clientId, SPOTIFY_CLIENT_SECRET: clientSecret } = process.env;
if (!clientId || !clientSecret) {
    console.error("Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to .env.local first. See AGENTS.md.");
    process.exit(1);
}

const redirectUri = "http://127.0.0.1:4381/callback";
const state = randomBytes(32).toString("hex");
const verifier = randomBytes(48).toString("base64url");
const { createHash } = await import("node:crypto");
const url = new URL("https://accounts.spotify.com/authorize");
url.search = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    state,
    code_challenge_method: "S256",
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    scope: "user-read-recently-played user-top-read user-read-currently-playing user-modify-playback-state",
}).toString();

let completing = false;
const server = createServer(async (request, response) => {
    const callback = new URL(request.url, redirectUri);
    const received = callback.searchParams.get("state") ?? "";
    if (callback.pathname !== "/callback") { response.writeHead(404).end(); return; }
    if (Buffer.byteLength(received) !== Buffer.byteLength(state) || !timingSafeEqual(Buffer.from(received), Buffer.from(state))) {
        response.writeHead(400).end("Invalid authorization state. Retry using the terminal link."); return;
    }
    if (completing) { response.writeHead(409).end("Authorization is already being processed."); return; }
    completing = true;
    try {
        const code = callback.searchParams.get("code");
        if (!code) throw new Error("Authorization was declined. Run npm run spotify:connect to try again.");
        const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}` },
            body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri, code_verifier: verifier }),
            signal: AbortSignal.timeout(15000),
        });
        const token = await tokenResponse.json();
        if (!tokenResponse.ok || !token.refresh_token) throw new Error("Spotify did not return a refresh token. Check the app credentials and redirect URI.");
        let env = await readFile(".env.local", "utf8").catch((error) => {
            if (error.code === "ENOENT") return "";
            throw error;
        });
        const entry = `SPOTIFY_REFRESH_TOKEN=${token.refresh_token}`;
        env = /^SPOTIFY_REFRESH_TOKEN=.*$/m.test(env) ? env.replace(/^SPOTIFY_REFRESH_TOKEN=.*$/m, entry) : `${env.trimEnd()}\n${entry}\n`;
        await writeFile(".env.local", env, { mode: 0o600 });
        await chmod(".env.local", 0o600);
        response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }).end("Spotify connected. Close this tab and restart the website's development server.");
        console.log("Connected. Refresh token saved privately in .env.local. Restart npm run dev.");
    } catch (error) {
        response.writeHead(500, { "Content-Type": "text/plain" }).end("Connection failed. See the terminal for details.");
        console.error(error.message);
        process.exitCode = 1;
    } finally { clearTimeout(timeout); server.close(); }
});
const timeout = setTimeout(() => { console.error("Authorization timed out. Run npm run spotify:connect again."); server.close(); process.exitCode = 1; }, 300000);
server.on("error", (error) => { clearTimeout(timeout); console.error(error.message); process.exitCode = 1; });
server.listen(4381, "127.0.0.1", () => console.log(`Open this URL and sign in to Blake's Spotify account:\n\n${url}\n\nWaiting up to five minutes for authorization…`));
