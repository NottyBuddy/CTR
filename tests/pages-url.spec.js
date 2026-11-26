const { test, expect } = require("@playwright/test");

test("GitHub Pages project URL responds on the canonical path", async ({ request }) => {
  const candidates = [
    "https://nottybuddy.github.io/CTR/",
    "https://nottybuddy.github.io/ctr/",
    "https://nottybuddy.github.io/CTR/index.html",
    "https://nottybuddy.github.io/ctr/index.html",
  ];
  const results = [];
  for (const url of candidates) {
    try {
      const response = await request.get(url, { timeout: 20000 });
      const body = await response.text();
      const title = (body.match(new RegExp("<title[^>]*>(.*?)" + "</title>", "i")) || [])[1] || "";
      results.push({ url, status: response.status(), title });
    } catch (error) {
      results.push({ url, error: String(error) });
    }
  }
  console.log("CTR_PAGES_URL_DIAGNOSTIC", JSON.stringify(results));
  expect(results.some(item => item.status === 200 && item.title.includes("IndiNext Orbit"))).toBeTruthy();
});
