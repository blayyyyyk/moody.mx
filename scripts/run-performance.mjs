import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const next = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const measure = fileURLToPath(new URL("./measure-page.mjs", import.meta.url));
const fixture = fileURLToPath(new URL("../tests/performance/data-fixture.cjs", import.meta.url));
const port = process.env.PERF_PORT ?? "3002";
const url = process.env.PERF_URL ?? `http://localhost:${port}`;

function run(command, args, env = process.env) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, { cwd: root, env, stdio: "inherit" });
        child.on("error", reject);
        child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
    });
}

async function waitForServer() {
    for (let attempt = 0; attempt < 120; attempt++) {
        try {
            const response = await fetch(url);
            if (response.ok) return;
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error(`Performance server did not become ready at ${url}`);
}

if (process.env.PERF_URL) {
    await run(process.execPath, [measure], { ...process.env, PERF_URL: url });
} else {
    const fixtureOptions = `${process.env.NODE_OPTIONS ?? ""} --require=${fixture}`.trim();
    const fixtureEnv = { ...process.env, NEXT_DIST_DIR: ".next-performance", NODE_OPTIONS: fixtureOptions };
    await run(process.execPath, [next, "build"], fixtureEnv);
    const server = spawn(process.execPath, [next, "start", "-p", port], { cwd: root, env: fixtureEnv, stdio: "inherit" });
    try {
        await waitForServer();
        await run(process.execPath, [measure], { ...process.env, PERF_URL: url });
    } finally {
        server.kill("SIGTERM");
    }
}
