# GoldBet365 search visibility

Canonical production origin: https://www.goldbet365.xyz. Public discovery: /sitemap.xml and /robots.txt.

## Implementation

- Server-owned titles, descriptions, canonical URLs, Open Graph and Twitter metadata. Homepage filter URLs canonicalize to the home page; game pages have their own canonical URLs.
- A sitemap of the homepage, casino lobby, ten active game pages, About, How it works and Responsible play. No fabricated last-modified dates, expired matches or account URLs.
- Public server-rendered product information and game rules stay readable without JavaScript or a healthy sports feed.
- Homepage WebSite and Organization JSON-LD uses actual name, URL and logo only. No invented reviews, licensing, ratings or contact details.
- Login, accounts, management, history and temporary match routes use noindex. Robots allows crawling these HTML pages to see noindex; authentication remains the security boundary. Service endpoints are disallowed.
- English is the canonical document language. French and Arabic are client-side preferences, not independent localized URLs; no misleading hreflang entries.

## Google Search Console (owner step)

1. Open https://search.google.com/search-console/ and add the domain property goldbet365.xyz.
2. Google supplies a unique DNS TXT verification record. Add that exact value in Porkbun without replacing A/CNAME records, then select Verify. Never invent a verification token.
3. Submit https://www.goldbet365.xyz/sitemap.xml under Sitemaps.
4. Inspect https://www.goldbet365.xyz/ and request indexing. Check Page indexing, HTTPS and Core Web Vitals after Google gathers data.
5. Look at branded queries such as GoldBet365 before expecting visibility for broad competitive search terms.

Search ranking and indexing are controlled by Google. Deployment does not submit a sitemap or guarantee indexing, rich results, traffic or first position. Avoid automated Indexing API submissions for ordinary pages, keyword stuffing, purchased links and fabricated schema.

## Verification

Inspect raw production HTML (not only hydrated DOM) for title, canonical, robots and JSON-LD; parse sitemap XML; check every sitemap URL returns 200. Check account pages expose noindex. Verify the apex HTTPS address redirects to www and that shared preview assets return image/png.

## References

https://nextjs.org/docs/app/getting-started/metadata-and-og-images
https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
https://developers.google.com/search/docs/fundamentals/seo-starter-guide
