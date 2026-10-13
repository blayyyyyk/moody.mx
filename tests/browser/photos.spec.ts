import { test, expect } from "@playwright/test";

const ownerSession = { user: { name: "Test owner", email: "owner@example.test" }, photoOwner: true, expires: "2099-01-01T00:00:00.000Z" };

test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route("**/api/auth/session*", (route) => route.fulfill({ json: null }));
    await page.route("**/api/spotify", (route) => route.fulfill({ status: 503, json: { configured: false, error: "Fixture" } }));
    await page.route("**/api/spotify/queue", (route) => route.fulfill({ json: { allowance: { limit: 3, remaining: 3, resetsAt: null } } }));
    await page.route("**/api/mal**", (route) => route.fulfill({ status: 503, json: { error: "Fixture" } }));
    await page.route("**/_next/image?*", (route) => {
        const source = new URL(route.request().url()).searchParams.get("url") ?? "";
        const id = source.match(/photo-fixture-(\d+)/)?.[1];
        if (id === undefined) return route.continue();
        const portrait = Number(id) % 4 === 0 || Number(id) === 1;
        return route.fulfill({ contentType: "image/svg+xml", body: `<svg xmlns="http://www.w3.org/2000/svg" width="${portrait ? 800 : 1200}" height="${portrait ? 1200 : 800}"><rect x="20%" y="20%" width="60%" height="60%" fill="#357c8c"/></svg>` });
    });
});

test("masonry keeps featured selections stable and camera views form one strip", async ({ page }) => {
    await page.goto("/#photos");
    const gallery = page.getByRole("group", { name: "Photographs", exact: true });
    await expect(gallery).toHaveAttribute("data-layout", "masonry");
    await expect(gallery.locator("[data-photo-id]")).toHaveCount(24);
    const rotated = gallery.locator('[data-photo-id="photo-fixture-1"] > div:first-child');
    await expect.poll(() => rotated.evaluate((element) => {
        const rect = element.getBoundingClientRect(); return rect.width / rect.height;
    })).toBeCloseTo(2 / 3, 2);
    const selected = () => gallery.locator('[data-featured="true"] [data-photo-id]').evaluateAll((items) => items.map((item) => item.getAttribute("data-photo-id")));
    const ids = await selected();
    expect(ids).toHaveLength(3);
    const cameras = page.locator('[aria-label="Sony α7 III camera views"]');
    await expect(cameras.locator("figure")).toHaveCount(3);
    await expect(cameras).toHaveCSS("column-gap", "1px");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(async () => gallery.evaluate((el) => {
        const boxes = Array.from(el.querySelectorAll("[data-featured]")).map((item) => item.getBoundingClientRect());
        return boxes.some((a, i) => boxes.some((b, j) => i < j && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1));
    })).toBe(false);
    expect(await selected()).toEqual(ids);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

for (const width of [1440, 390]) for (const theme of ["light", "dark"] as const) {
    test(`viewer mat and image borders at ${width}px in ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
        await page.goto("/#photos");
        const trigger = page.getByRole("button", { name: "View photo: Synthetic gallery photograph 0", exact: true });
        await trigger.click();
        const dialog = page.getByRole("dialog", { name: "Photo details" });
        const image = dialog.getByRole("img");
        await expect(image).toBeVisible();
        await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
        await expect(dialog.getByRole("complementary", { name: "Photo metadata" })).toBeVisible();
        const geometry = await image.evaluate((img: HTMLImageElement) => {
            const frame = img.closest("figure")!;
            const style = getComputedStyle(img), frameStyle = getComputedStyle(frame);
            const bounds = img.getBoundingClientRect(), surrounding = frame.getBoundingClientRect();
            const contentWidth = bounds.width - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth);
            return { ratio: contentWidth / bounds.height, expected: img.naturalWidth / img.naturalHeight, border: style.borderLeftColor, frameBorder: frameStyle.borderLeftColor, line: style.borderLeftWidth, gradient: frameStyle.backgroundImage, backing: style.backgroundColor, frameBackground: frameStyle.backgroundColor, contained: bounds.left >= surrounding.left && bounds.right <= surrounding.right && bounds.top >= surrounding.top && bounds.bottom <= surrounding.bottom };
        });
        expect(geometry.contained).toBe(true);
        expect(Math.abs(geometry.ratio - geometry.expected)).toBeLessThan(.01);
        expect(geometry.border).toBe(geometry.frameBorder);
        expect(geometry.line).toBe("1px");
        expect(geometry.gradient).toContain(geometry.border);
        expect(geometry.backing).toBe(geometry.frameBackground);
        await page.keyboard.press("Escape");
        await expect(dialog).toHaveCount(0);
        await expect(trigger).toBeFocused();
    });
}

test("footer login remains public but upload is only shown for an owner session", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Internal login", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Upload photos", exact: true })).toHaveCount(0);
});

test("owner edits embedded PNG metadata before mocked upload and can start another image", async ({ page }) => {
    await page.route("**/api/auth/session*", (route) => route.fulfill({ json: ownerSession }));
    let size = 0, starts = 0, chunks = 0;
    await page.route("**/api/admin/photos/upload/start", async (route) => {
        const input = route.request().postDataJSON();
        size = input.size; starts++;
        expect(input.role).toBe("image");
        await route.fulfill({ json: { complete: false, offset: 0, ticket: "fixture-ticket", chunkSize: 2097152 } });
    });
    await page.route("**/api/admin/photos/upload/chunk", async (route) => {
        chunks++;
        const data = route.request().postDataBuffer()!;
        expect([...data.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
        expect(data.length).toBe(size);
        await route.fulfill({ json: { complete: true, offset: size, file: { id: "test-image", name: "fixture.png", url: "https://drive.google.com/file/d/test-image/view" } } });
    });
    await page.goto("/");
    const opener = page.getByRole("button", { name: "Upload photos", exact: true });
    await opener.click();
    const dialog = page.getByRole("dialog", { name: "Upload photos" });
    await dialog.getByLabel("Choose image file").evaluate((input: HTMLInputElement) => {
        const canvas = document.createElement("canvas"); canvas.width = 20; canvas.height = 16;
        canvas.getContext("2d")!.fillRect(0, 0, 20, 16);
        return new Promise<void>((resolve) => canvas.toBlob((blob) => {
            const transfer = new DataTransfer(); transfer.items.add(new File([blob!], "fixture.png", { type: "image/png" }));
            input.files = transfer.files; input.dispatchEvent(new Event("change", { bubbles: true })); resolve();
        }, "image/png"));
    });
    await dialog.getByLabel("Make", { exact: true }).fill("SONY");
    await dialog.getByLabel("Photographer", { exact: true }).fill("撮影者 — café");
    await dialog.getByLabel("ISO", { exact: true }).fill("400");
    await dialog.getByRole("button", { name: "Prepare image", exact: true }).click();
    await expect(dialog.getByText("EXIF verified", { exact: true })).toBeVisible({ timeout: 60000 });
    await dialog.getByRole("button", { name: "Upload to Drive", exact: true }).click();
    await expect(dialog.getByText("Saved to Google Drive. The gallery has been refreshed.")).toBeVisible();
    expect(starts).toBe(1); expect(chunks).toBe(1);
    await dialog.getByRole("button", { name: "Done", exact: true }).click();
    await expect(opener).toBeFocused();
    await opener.click();
    await expect(page.getByRole("dialog", { name: "Upload photos" }).getByRole("button", { name: "Prepare image", exact: true })).toBeDisabled();
});

test("closing a partial RAW upload preserves its files and resumes without duplicate originals", async ({ page }) => {
    await page.route("**/api/auth/session*", (route) => route.fulfill({ json: ownerSession }));
    // Exercise the real dialog/upload client with a small, deterministic RAW pair.
    // Actual JPEG/PNG/ARW EXIF processing is verified separately with the real WASM tools.
    await page.route("**/photo-tools/metadata-worker.js", (route) => route.fulfill({ contentType: "text/javascript", body: `
        self.onmessage = async ({data}) => {
            const canvas = new OffscreenCanvas(20, 16);
            canvas.getContext('2d').fillRect(0, 0, 20, 16);
            const preview = new File([await canvas.convertToBlob({type:'image/jpeg'})], 'fixture.jpg', {type:'image/jpeg'});
            const metadata = {'IFD0:Make':'SONY'};
            const result = data.action === 'inspect'
                ? {metadata, form:{make:'SONY'}, preview, raw:true, previewNote:'Synthetic RAW pair'}
                : {metadata, preview, changed:0, previewNote:'Synthetic RAW pair', files:[{file:data.file,role:'raw-original'},{file:preview,role:'raw-preview'}]};
            self.postMessage({id:data.id,result});
        };` }));
    const starts: string[] = [];
    const sizes: Record<string, number> = {};
    let waiting = false, allowPreview = false;
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => { release = resolve; });
    await page.route("**/api/admin/photos/upload/start", (route) => {
        const input = route.request().postDataJSON(); starts.push(input.role); sizes[input.role] = input.size;
        return route.fulfill({ json: { complete: false, offset: 0, ticket: input.role, chunkSize: 2097152 } });
    });
    await page.route("**/api/admin/photos/upload/chunk", async (route) => {
        const role = route.request().headers()["x-photo-upload"];
        if (route.request().method() === "GET") return route.fulfill({ json: { complete: false, offset: 0 } });
        if (role === "raw-preview" && !allowPreview) {
            waiting = true; await blocked;
            await route.abort().catch(() => {}); return;
        }
        return route.fulfill({ json: { complete: true, offset: sizes[role], file: { id: role, name: role === "raw-original" ? "fixture.ARW" : "fixture.jpg", url: `https://drive.google.com/file/d/${role}/view` } } });
    });
    await page.goto("/");
    const opener = page.getByRole("button", { name: "Upload photos", exact: true });
    await opener.click();
    let dialog = page.getByRole("dialog", { name: "Upload photos" });
    const bytes = Buffer.alloc(128); bytes.set([0x49, 0x49, 42, 0]);
    await dialog.getByLabel("Choose image file").setInputFiles({ name: "fixture.ARW", mimeType: "image/x-sony-arw", buffer: bytes });
    await dialog.getByRole("button", { name: "Prepare image", exact: true }).click();
    await expect(dialog.getByText("EXIF verified", { exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "Upload to Drive", exact: true }).click();
    await expect.poll(() => waiting).toBe(true);
    await dialog.getByRole("button", { name: "Pause upload", exact: true }).click();
    release();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await opener.click();
    dialog = page.getByRole("dialog", { name: "Upload photos" });
    await expect(dialog.getByRole("link", { name: /Saved: fixture.ARW/ })).toBeVisible();
    allowPreview = true;
    await dialog.getByRole("button", { name: "Resume upload", exact: true }).click();
    await expect(dialog.getByText("Saved to Google Drive. The gallery has been refreshed.")).toBeVisible();
    expect(starts).toEqual(["raw-original", "raw-preview"]);
});

test("the RAW worker removes cleared tags from a stale embedded JPEG companion", async ({ page }) => {
    // Metadata-engine double: the RAW and embedded JPEG deliberately retain
    // separate tag stores, reproducing the regression at the worker boundary.
    await page.route("**/photo-tools/exiftool/index.js", (route) => route.fulfill({ contentType: "text/javascript", body: `
        const encoder=new TextEncoder(), decoder=new TextDecoder();
        function pack(packet, raw){const json=encoder.encode(JSON.stringify(packet));const bytes=new Uint8Array(2048+json.length);bytes.set(raw?[73,73,42,0]:[255,216,255,224]);bytes.set(json,32);return bytes;}
        async function unpack(file){return JSON.parse(decoder.decode(new Uint8Array(await file.arrayBuffer()).subarray(32)).replace(/\\0+$/,''));}
        export async function parseMetadata(file,options){const packet=await unpack(file);return {success:true,exitCode:0,data:options.binary?new Uint8Array(packet.preview||[]):options.transform(JSON.stringify([packet.meta]))};}
        export async function writeMetadata(file,tags){const packet=await unpack(file);for(const [tag,value] of Object.entries(tags)){const key=tag.replace('EXIF:','IFD0:');if(value==='')delete packet.meta[key];else packet.meta[key]=value;}return {success:true,exitCode:0,data:pack(packet,/\\.arw$/i.test(file.name)).buffer};}
    ` }));
    await page.goto("/");
    const result = await page.evaluate(async () => {
        const encoder = new TextEncoder(), decoder = new TextDecoder();
        const pack = (packet: unknown, raw: boolean) => {
            const json = encoder.encode(JSON.stringify(packet)), bytes = new Uint8Array(2048 + json.length);
            bytes.set(raw ? [73, 73, 42, 0] : [255, 216, 255, 224]); bytes.set(json, 32); return bytes;
        };
        const tags = { "IFD0:Make": "SONY", "IFD0:Artist": "Remove this artist", "IFD0:Copyright": "Remove this copyright", "IFD0:ImageDescription": "Remove this description" };
        const jpeg = pack({ meta: tags }, false);
        const file = new File([pack({ meta: tags, preview: Array.from(jpeg) }, true)], "fixture.ARW", { type: "image/x-sony-arw" });
        const worker = new Worker("/photo-tools/metadata-worker.js", { type: "module" });
        const run = (message: unknown) => new Promise<any>((resolve, reject) => {
            worker.onmessage = ({ data }) => data.error ? reject(new Error(data.error)) : resolve(data.result);
            worker.onerror = (event) => reject(new Error(event.message)); worker.postMessage(message);
        });
        try {
            const inspection = await run({ id: 1, action: "inspect", file });
            const prepared = await run({ id: 2, action: "prepare", file, original: inspection.form, form: { ...inspection.form, artist: "", copyright: "", description: "" } });
            return Promise.all(prepared.files.map(async ({ file }: { file: File }) => JSON.parse(decoder.decode(new Uint8Array(await file.arrayBuffer()).subarray(32)).replace(/\0+$/, "")).meta));
        } finally { worker.terminate(); }
    });
    expect(result).toHaveLength(2);
    for (const metadata of result) expect(metadata).toEqual({ "IFD0:Make": "SONY" });
});

test("real WASM EXIF edits preserve decoded JPEG and PNG pixels", async ({ page }) => {
    await page.goto("/");
    const results = await page.evaluate(async () => {
        const canvas = document.createElement("canvas"); canvas.width = 20; canvas.height = 16;
        const drawing = canvas.getContext("2d")!;
        drawing.fillStyle = "#b5472a"; drawing.fillRect(0, 0, 20, 16);
        drawing.fillStyle = "#2345b7"; drawing.fillRect(4, 4, 8, 5);
        const pixels = async (file: File) => {
            const bitmap = await createImageBitmap(file), surface = new OffscreenCanvas(bitmap.width, bitmap.height);
            const context = surface.getContext("2d")!;
            context.drawImage(bitmap, 0, 0); bitmap.close();
            return Array.from(context.getImageData(0, 0, surface.width, surface.height).data).join(",");
        };
        const results = [];
        for (const [extension, mime] of [["jpg", "image/jpeg"], ["png", "image/png"]]) {
            const blob = await new Promise<Blob>((resolve) => canvas.toBlob((blob) => resolve(blob!), mime));
            const file = new File([blob], `pixels.${extension}`, { type: mime });
            const worker = new Worker("/photo-tools/metadata-worker.js", { type: "module" });
            const run = (message: unknown) => new Promise<any>((resolve, reject) => {
                worker.onmessage = ({ data }) => data.error ? reject(new Error(data.error)) : resolve(data.result);
                worker.onerror = (event) => reject(new Error(event.message)); worker.postMessage(message);
            });
            try {
                const read = await run({ id: 1, action: "inspect", file });
                const edited = await run({ id: 2, action: "prepare", file, original: read.form, form: { ...read.form, make: "SONY", iso: "400", shutter: "1/250" } });
                results.push({ extension, samePixels: await pixels(file) === await pixels(edited.files[0].file), make: edited.metadata["IFD0:Make"], iso: edited.metadata["ExifIFD:ISO"] });
            } finally { worker.terminate(); }
        }
        return results;
    });
    expect(results).toEqual([{ extension: "jpg", samePixels: true, make: "SONY", iso: 400 }, { extension: "png", samePixels: true, make: "SONY", iso: 400 }]);
});
