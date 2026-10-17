import assert from "node:assert/strict";
const base = "https://www.goldbet365.xyz";
async function read(path) {
 const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(30000) });
 assert.equal(response.status, 200, `${path} status`);
 return response.text();
}
const robots = await read("/robots.txt");
assert.ok(robots.includes(`Sitemap: ${base}/sitemap.xml`));
assert.ok(!robots.includes("Disallow: /\n"));
const sitemap = await read("/sitemap.xml");
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
assert.equal(urls.length, 15);
assert.equal(new Set(urls).size, urls.length);
for (let offset = 0; offset < urls.length; offset += 4) {
 await Promise.all(urls.slice(offset, offset + 4).map(async url => {
  assert.equal(new URL(url).origin, base);
  const html = await read(new URL(url).pathname);
  assert.ok(html.includes(`rel="canonical" href="${url}"`), `${url} canonical`);
  assert.ok(!/<meta name="robots" content="[^"]*noindex/.test(html), `${url} indexable`);
  assert.ok(html.includes('property="og:image"'), `${url} share image`);
 }));
}
const home = await read("/");
assert.ok(home.includes("Sports fixtures, live scores and original casino games"));
const schema = [...home.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
assert.ok(schema.some(item => item["@graph"]?.some(node => node["@type"] === "WebSite" && node.name === "GoldBet365")));
for (const path of ["/login", "/casino/history"]) {
 const html = await read(path);
 assert.match(html, /<meta name="robots" content="[^"]*noindex/);
}
const filtered = await read("/?sport=tennis&day=1&view=live");
assert.ok(filtered.includes(`rel="canonical" href="${base}/"`));
console.log(`SEO smoke checks passed: ${urls.length} public URLs, canonicals, sitemap, robots, structured data and private-page noindex.`);
