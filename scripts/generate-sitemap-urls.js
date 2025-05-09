// const fs = require('fs');
// const XLSX = require('xlsx');

// // Load Excel file
// const workbook = XLSX.readFile('Dexifier-Worksheet.xlsx');
// const sheet = workbook.Sheets['Target Keywords'];
// const data = XLSX.utils.sheet_to_json(sheet);

// // Extract and clean keyword slugs
// const urls = data
//   .map((row) => {
//     const keyword = row['Keyword'];
//     if (!keyword) return null;

//     const slug = keyword
//       .toLowerCase()
//       .replace(/\s+/g, '-')           // spaces to dashes
//       .replace(/[^a-z0-9\-]/g, '');   // remove non-alphanumerics

//     return {
//       loc: `https://www.dexifier.com/swap/${slug}`,
//       lastmod: new Date().toISOString(),
//     };
//   })
//   .filter(Boolean);

// // Convert to XML-compatible format (next-sitemap or custom XML)
// const sitemapJson = JSON.stringify(urls, null, 2);
// fs.writeFileSync('public/server-sitemap.json', sitemapJson);

const fs = require('fs');
const path = require('path');

// Load tokens
const tokens = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'popular-tokens.json'), 'utf8')
);

// Group tokens by symbol
const tokensBySymbol = tokens.reduce((acc, token) => {
  if (!acc[token.s]) {
    acc[token.s] = [];
  }
  acc[token.s].push(token);
  return acc;
}, {});

// Generate all possible pairs
const pairs = [];
const symbols = Object.keys(tokensBySymbol);

for (const fromSymbol of symbols) {
  const fromTokens = tokensBySymbol[fromSymbol];

  for (const toSymbol of symbols) {
    if (fromSymbol === toSymbol) continue; // Skip same token pairs

    const toTokens = tokensBySymbol[toSymbol];

    // Generate pairs for each combination of blockchains
    for (const fromToken of fromTokens) {
      for (const toToken of toTokens) {
        const url = `https://dexifier.com/swap/${fromToken.b}.${fromSymbol}/${toToken.b}.${toSymbol}`;
        pairs.push({
          loc: url,
          lastmod: new Date().toISOString(),
        });
      }
    }
  }
}

// Save to file
// Convert to XML-compatible format (next-sitemap or custom XML)
const output = JSON.stringify(pairs, null, 2);
fs.writeFileSync('public/server-sitemap.json', output);

console.log(`Generated ${pairs.length} token pairs`);