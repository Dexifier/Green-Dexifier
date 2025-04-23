const fs = require('fs');
const XLSX = require('xlsx');

// Load Excel file
const workbook = XLSX.readFile('Dexifier-Worksheet.xlsx');
const sheet = workbook.Sheets['Target Keywords'];
const data = XLSX.utils.sheet_to_json(sheet);

// Extract and clean keyword slugs
const urls = data
  .map((row) => {
    const keyword = row['Keyword'];
    if (!keyword) return null;

    const slug = keyword
      .toLowerCase()
      .replace(/\s+/g, '-')           // spaces to dashes
      .replace(/[^a-z0-9\-]/g, '');   // remove non-alphanumerics

    return {
      loc: `https://www.dexifier.com/swap/${slug}`,
      lastmod: new Date().toISOString(),
    };
  })
  .filter(Boolean);

// Convert to XML-compatible format (next-sitemap or custom XML)
const sitemapJson = JSON.stringify(urls, null, 2);
fs.writeFileSync('public/server-sitemap.json', sitemapJson);
