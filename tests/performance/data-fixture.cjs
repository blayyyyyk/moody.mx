// Loaded only by Playwright's performance server. Synthetic data keeps every
// expensive section present without depending on credentials or external APIs.
require("../projects/github-fixture.cjs");

process.env.NEXT_PUBLIC_GCP_API_KEY = "performance-browser-fixture";
process.env.NEXT_PUBLIC_SHARED_SHEETS_ID = "performance-sheet";
process.env.NEXT_PUBLIC_SHARED_FOLDER_ID = "performance-photos";

const fixtureFetch = globalThis.fetch;
const tables = {
  Courses: {
    header: ["Course ID", "Course Name", "Program Name", "Start Date", "Description", "Professor", "Location"],
    rows: [["fixture-course", "Performance Engineering", "Fixture Program", "2026-01-01", "Synthetic course for model coverage.", "Test Professor", "Remote"]],
  },
  Programs: {
    header: ["Program Name", "Location", "Organization", "Start", "End", "Program Description"],
    rows: [["Fixture Program", "Remote", "Test Organization", "2026", "2026", "Synthetic program for GPU coverage."]],
  },
};

globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  if (url.hostname === "sheets.googleapis.com") {
    const match = decodeURIComponent(url.pathname).match(/values\/(Courses|Programs)!(.+)$/);
    if (!match) return Response.json({ error: "Fixture not found" }, { status: 404 });
    const [, table, range] = match;
    return Response.json({ values: range === "1:1" ? [tables[table].header] : tables[table].rows });
  }
  if (url.hostname === "www.googleapis.com" && url.pathname === "/drive/v2/files") {
    return Response.json({ items: [{
      id: "fixture-photo", title: "Fixture photo", fileExtension: "jpg", fileSize: "1000000",
      webContentLink: "/IMG_5008.jpg", imageMediaMetadata: {
        width: 1200, height: 800, date: "2026:10:12 12:00:00", aperture: 2.8,
        exposureTime: 0.01, isoSpeed: 100, focalLength: 35, cameraMake: "Sony",
        cameraModel: "A7 III", whiteBalance: "Auto", exposureMode: "Manual", colorSpace: "sRGB",
      },
    }] });
  }
  return fixtureFetch(input, init);
};
