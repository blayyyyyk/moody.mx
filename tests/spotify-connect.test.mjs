import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";

const script = new URL("../scripts/spotify-connect.mjs", import.meta.url);

test("connection helper loads its dependencies and explains missing credentials", () => {
    const result = spawnSync(process.execPath, [script.pathname], {
        env: { ...process.env, SPOTIFY_CLIENT_ID: "", SPOTIFY_CLIENT_SECRET: "" },
        encoding: "utf8", timeout: 10000,
    });
    assert.equal(result.status, 1);
    assert.doesNotMatch(result.stderr, /SyntaxError|Named export/);
    assert.match(result.stderr, /Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET/);
});

test("connection helper starts the authorization listener with configured credentials", async () => {
    const child = spawn(process.execPath, [script.pathname], {
        env: { ...process.env, SPOTIFY_CLIENT_ID: "test-client", SPOTIFY_CLIENT_SECRET: "test-secret" },
        stdio: ["ignore", "pipe", "pipe"],
    });
    const exited = once(child, "exit");
    try {
        const output = await new Promise((resolve, reject) => {
            let output = "";
            const timer = setTimeout(() => reject(new Error("Authorization listener did not start")), 10000);
            child.once("error", (error) => { clearTimeout(timer); reject(error); });
            child.once("exit", (code) => { clearTimeout(timer); reject(new Error(`Helper exited before startup: ${code}`)); });
            child.stdout.on("data", (chunk) => {
                output += chunk;
                if (output.includes("Waiting up to five minutes")) { clearTimeout(timer); resolve(output); }
            });
        });
        assert.match(output, /https:\/\/accounts.spotify.com\/authorize\?/);
        assert.match(output, /code_challenge_method=S256/);
        const response = await fetch("http://127.0.0.1:4381/callback?state=invalid");
        assert.equal(response.status, 400);
    } finally {
        child.kill("SIGTERM");
        await exited;
    }
});
