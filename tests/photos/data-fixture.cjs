require("../performance/data-fixture.cjs");

const upstream = globalThis.fetch;
globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    if (url.hostname === "www.googleapis.com" && url.pathname === "/drive/v2/files") {
        return Response.json({ items: Array.from({ length: 24 }, (_, index) => ({
            id: `photo-fixture-${index}`, title: `Gallery fixture ${index}`, description: `Synthetic gallery photograph ${index}`,
            mimeType: "image/png", fileExtension: "png", fileSize: "1000000",
            webContentLink: `/photo-fixture-${index}.png`,
            imageMediaMetadata: { width: index % 4 === 0 || index === 1 ? 800 : 1200, height: index % 4 === 0 || index === 1 ? 1200 : 800, rotation: index === 1 ? 1 : 0, date: "2026:10:12 12:00:00", cameraMake: "Sony", cameraModel: "A7 III", aperture: 5.6, exposureTime: .004, isoSpeed: 400, focalLength: 35 },
        })) });
    }
    return upstream(input, init);
};
