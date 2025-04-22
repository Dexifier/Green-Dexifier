const fs = require('fs');
const sitemapData = require('../public/server-sitemap.json');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${sitemapData
    .map(
      (entry) => `
    <url>
      <loc>${entry.loc}</loc>
      <lastmod>${entry.lastmod}</lastmod>
    </url>
  `
    )
    .join('')}
</urlset>`;

fs.writeFileSync('public/server-sitemap.xml', xml);
