// Builds one page per available watch (watch/<id>/index.html), sitemap.xml and robots.txt
// from the live WESTELIS feed. Run by GitHub Actions every hour; safe to run by hand:
//   node scripts/build-watch-pages.mjs            (fetches the live feed)
//   FEED_FILE=feed.json node scripts/build-watch-pages.mjs   (uses a saved copy)
import fs from 'node:fs';
import path from 'node:path';

const SITE = 'https://westelis.com';
const FEED_URL = 'https://script.google.com/macros/s/AKfycbyngHdGrAkyT9-t7RPQ5bfvDkzMJBYQBj5wOqg6hSY-PJ5ktJn7clQLXDuJMtJRZeYAzQ/exec';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PHONE = '+18633329829';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slug = id => String(id).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const money = n => '$' + Math.round(n).toLocaleString('en-US');
const size = (url, w) => String(url).replace(/=w\d+$/, '=w' + w);
const cleanDesc = d => String(d || '').replace(/Includes Watch Only\.?/i, 'Watch only.').trim();

async function loadFeed() {
  if (process.env.FEED_FILE) return JSON.parse(fs.readFileSync(process.env.FEED_FILE, 'utf8'));
  const res = await fetch(FEED_URL + '?t=' + Date.now(), { redirect: 'follow' });
  if (!res.ok) throw new Error('Feed HTTP ' + res.status);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('Feed is not a list');
  return data;
}

function brandOf(title) {
  const known = ['Audemars Piguet', 'Patek Philippe', 'Vacheron Constantin', 'Jaeger-LeCoultre', 'A. Lange & Söhne',
    'Grand Seiko', 'TAG Heuer', 'Glashütte Original', 'Glashutte Original'];
  const t = String(title || '');
  const k = known.find(b => t.toLowerCase().startsWith(b.toLowerCase()));
  return k || t.split(' ')[0] || 'WESTELIS';
}

function page(w) {
  const url = `${SITE}/watch/${slug(w.id)}/`;
  const name = [w.title, w.reference].filter(Boolean).join(' ');
  const desc = cleanDesc(w.description);
  const photos = (w.photos || []).filter(Boolean);
  const hero = photos[0] ? size(photos[0], 1600) : `${SITE}/assets/og-card.jpg`;
  const ogImg = photos[0] ? size(photos[0], 1200) : `${SITE}/assets/og-card.jpg`;
  const price = Number(w.price) > 0 ? Number(w.price) : null;
  const metaDesc = `${name}${price ? ' · ' + money(price) : ''}. ${desc} Available now from WESTELIS, Central Florida.`.slice(0, 300);
  const sms = `sms:${PHONE}?&body=${encodeURIComponent(`Hi JB, I'm interested in the ${name} (${w.id}) on westelis.com`)}`;

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    sku: w.id,
    ...(w.reference ? { mpn: w.reference } : {}),
    brand: { '@type': 'Brand', name: brandOf(w.title) },
    description: desc,
    image: photos.slice(0, 8).map(p => size(p, 1600)),
    url,
    ...(price ? {
      offers: {
        '@type': 'Offer', url, price: String(price), priceCurrency: 'USD',
        availability: 'https://schema.org/InStock', itemCondition: 'https://schema.org/UsedCondition',
        seller: { '@type': 'Organization', name: 'WESTELIS', url: SITE + '/' }
      }
    } : {})
  };

  const thumbs = photos.length > 1 ? `<div class="thumbs">${photos.map((p, i) =>
    `<button type="button" data-src="${esc(size(p, 1600))}" aria-label="Photo ${i + 1}"><img src="${esc(size(p, 200))}" alt="" loading="lazy"></button>`).join('')}</div>` : '';

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(name)} | WESTELIS</title>
<meta name="description" content="${esc(metaDesc)}">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#071d33">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<meta property="og:type" content="product"><meta property="og:site_name" content="WESTELIS">
<meta property="og:url" content="${url}"><meta property="og:title" content="${esc(name)}${price ? ' · ' + money(price) : ''}">
<meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${esc(ogImg)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${esc(ogImg)}">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
<style>
:root{--ink:#202527;--muted:#596063;--gold:#755528;--line:#d9d8d2;--bg:#fff;--soft:#f7f6f2}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.7 Arial,Helvetica,sans-serif}
a{color:inherit}header{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:18px 6%;border-bottom:1px solid var(--line)}
.wordmark{font:28px Georgia,serif;letter-spacing:5px;color:var(--gold);text-decoration:none}
nav{display:flex;gap:22px;font-size:14px}nav a{text-decoration:none}
main{max-width:1180px;margin:0 auto;padding:40px 6% 70px;display:grid;grid-template-columns:1.15fr 1fr;gap:50px}
.crumb{grid-column:1/-1;font-size:13px;color:var(--muted);margin:-10px 0 -20px}.crumb a{text-decoration:none}
.hero{width:100%;aspect-ratio:1/1;object-fit:contain;background:#eeeee8;display:block}
.thumbs{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.thumbs button{padding:0;border:1px solid var(--line);background:none;cursor:pointer}
.thumbs img{width:62px;height:62px;object-fit:cover;display:block}
h1{font:clamp(30px,4vw,46px)/1.15 Georgia,serif;margin:0 0 6px}.ref{color:var(--muted);margin:0 0 18px;overflow-wrap:anywhere}
.price{font-size:30px;color:var(--gold);margin:0}.note{font-size:13px;color:var(--muted);margin:2px 0 22px}
.desc{border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:16px 0;margin:0 0 24px}
.btn{display:block;text-align:center;padding:15px 18px;margin-bottom:12px;text-decoration:none;font-size:15px;border:1px solid #9b9e97;background:none;color:var(--ink);width:100%;font-family:inherit;cursor:pointer}
.btn.primary{background:#24292b;color:#fff;border-color:#24292b}.btn:hover{border-color:var(--gold)}
.trust{list-style:none;padding:0;margin:22px 0 0;font-size:14px;color:var(--muted)}.trust li{padding:4px 0}
footer{border-top:1px solid var(--line);padding:26px 6%;font-size:14px;color:var(--muted);display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px}
footer a{text-decoration:none}
@media(max-width:800px){main{grid-template-columns:1fr;gap:28px;padding-top:26px}nav a:not(.keep){display:none}.wordmark{font-size:22px}}
</style></head><body>
<header><a class="wordmark" href="/">WESTELIS</a><nav><a href="/#inventory" class="keep">All watches</a><a href="/drop/">Watch Drop</a><a href="/#contact" class="keep">Contact</a></nav></header>
<main>
<p class="crumb"><a href="/">Home</a> › <a href="/#inventory">Available watches</a> › ${esc(w.title)}</p>
<section>
<img class="hero" id="hero" src="${esc(hero)}" alt="${esc(name)}" fetchpriority="high">
${thumbs}
</section>
<section>
<h1>${esc(w.title)}</h1>
<p class="ref">${esc(w.reference || '')}${w.edition ? ' · ' + esc(w.edition) : ''}</p>
<p class="price">${price ? money(price) : 'Price on request'}</p>
<p class="note">${price ? 'Direct price · Offers considered' : 'Contact for price'}</p>
<p class="desc">${esc(desc)}</p>
<a class="btn primary" href="${esc(sms)}">Text JB about this watch</a>
<a class="btn" href="/?req=${encodeURIComponent(w.id)}#quote">Request details by email</a>
<button class="btn" type="button" id="share">Share this watch</button>
<ul class="trust"><li>✓ Local meetups at a bank or jeweler, with photo ID and bill of sale</li><li>✓ Nationwide insured shipping available</li><li>✓ Independent dealer · Central Florida · By appointment</li></ul>
</section>
</main>
<footer><span>© ${new Date().getFullYear()} WESTELIS · Central Florida</span><span><a href="/drop/">Follow the Watch Drop</a> · <a href="https://g.page/r/CRBXsF5Co8IWEBM/review" target="_blank" rel="noopener">Review us on Google</a> · <a href="tel:${PHONE}">863.332.9829</a></span></footer>
<script>
document.querySelectorAll('.thumbs button').forEach(b=>b.onclick=()=>{document.getElementById('hero').src=b.dataset.src;});
document.getElementById('share').onclick=async e=>{const d={title:${JSON.stringify(name)},url:${JSON.stringify(url)}};
try{if(navigator.share){await navigator.share(d);return;}await navigator.clipboard.writeText(d.url);e.target.textContent='Link copied';}catch(_){}};
</script>
</body></html>
`;
}

function notFound() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Watch no longer available | WESTELIS</title><meta name="robots" content="noindex">
<meta http-equiv="refresh" content="4;url=/#inventory">
<style>body{margin:0;font:16px/1.7 Arial,sans-serif;color:#202527;display:grid;place-items:center;min-height:100vh;text-align:center;padding:24px}
h1{font:34px Georgia,serif;color:#755528;letter-spacing:4px}a{color:#755528}</style></head>
<body><div><h1>WESTELIS</h1><p>That watch has sold or the page has moved.</p><p><a href="/#inventory">See available watches</a> · <a href="/drop/">Follow the Watch Drop</a></p></div></body></html>
`;
}

const watches = (await loadFeed()).filter(w => w && w.id);
const watchDir = path.join(ROOT, 'watch');
fs.rmSync(watchDir, { recursive: true, force: true });
for (const w of watches) {
  const dir = path.join(watchDir, slug(w.id));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), page(w));
}
fs.writeFileSync(path.join(ROOT, '404.html'), notFound());

const urls = [`${SITE}/`, ...watches.map(w => `${SITE}/watch/${slug(w.id)}/`)];
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n') + `\n</urlset>\n`);
fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`Built ${watches.length} watch page(s).`);
