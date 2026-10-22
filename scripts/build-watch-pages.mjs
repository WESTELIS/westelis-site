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
const GA = `<script async src="https://www.googletagmanager.com/gtag/js?id=G-QP4K1JHJ9P"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-QP4K1JHJ9P');
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a,button');if(!a)return;var h=a.getAttribute('href')||'',ev=null;
if(h.indexOf('sms:')===0)ev='text_jb';else if(h.indexOf('tel:')===0)ev='call_jb';else if(/\\/drop\\/?$|whatsapp\\.com\\/channel/.test(h))ev='watch_drop_click';
else if(/g\\.page\\/r\\//.test(h))ev='review_click';else if(/instagram\\.com/.test(h))ev='instagram_click';else if(/facebook\\.com/.test(h))ev='facebook_click';
else if(a.classList.contains('share-btn')||a.id==='share')ev='share_watch';else if(/[?&]req=/.test(h))ev='request_details_click';else if(/\\/watch\\//.test(h))ev='open_watch_page';
if(ev)gtag('event',ev,{link_text:(a.textContent||'').trim().slice(0,60),page_path:location.pathname});},true);</script>
`;


// Desktop fallback for "Text JB" links: phones open Messages; computers get a QR code + copy panel.
const SMS_DESKTOP = `<script src="/assets/sms-panel.js" defer></script>`;

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

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">${GA}<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(name)} | WESTELIS</title>
<meta name="description" content="${esc(metaDesc)}">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#071d33">
<link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" type="image/png" sizes="96x96" href="/assets/favicon-96.png"><link rel="icon" type="image/png" sizes="48x48" href="/assets/favicon-48.png"><link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png"><link rel="manifest" href="/site.webmanifest">
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
<a class="btn primary" href="${esc(sms)}" data-alt="/?req=${encodeURIComponent(w.id)}#quote">Text JB about this watch</a>
<a class="btn" href="/?req=${encodeURIComponent(w.id)}#quote">Request details by email</a>
<button class="btn" type="button" id="share">Share this watch</button>
<ul class="trust"><li>✓ Local meetups at a bank or jeweler, with photo ID and bill of sale</li><li>✓ Nationwide insured shipping available</li><li>✓ Independent dealer · Central Florida · By appointment</li></ul>
</section>
</main>
<footer><span>© ${new Date().getFullYear()} WESTELIS · Central Florida</span><span><a href="/drop/">Follow the Watch Drop</a> · <a href="https://g.page/r/CRBXsF5Co8IWEBM/review" target="_blank" rel="noopener">Review us on Google</a> · <a href="tel:${PHONE}">863.332.9829</a></span></footer>
${SMS_DESKTOP}
<script>
document.querySelectorAll('.thumbs button').forEach(b=>b.onclick=()=>{document.getElementById('hero').src=b.dataset.src;});
document.getElementById('share').onclick=async e=>{const d={title:${JSON.stringify(name)},url:${JSON.stringify(url)}};
try{if(navigator.share){await navigator.share(d);return;}await navigator.clipboard.writeText(d.url);e.target.textContent='Link copied';}catch(_){}};
</script>
</body></html>
`;
}

function notFound() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">${GA}<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Watch no longer available | WESTELIS</title><meta name="robots" content="noindex"><link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" type="image/png" sizes="96x96" href="/assets/favicon-96.png"><link rel="icon" type="image/png" sizes="48x48" href="/assets/favicon-48.png"><link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png"><link rel="manifest" href="/site.webmanifest">
<meta http-equiv="refresh" content="4;url=/#inventory">
<style>body{margin:0;font:16px/1.7 Arial,sans-serif;color:#202527;display:grid;place-items:center;min-height:100vh;text-align:center;padding:24px}
h1{font:34px Georgia,serif;color:#755528;letter-spacing:4px}a{color:#755528}</style></head>
<body><div><h1>WESTELIS</h1><p>That watch has sold or the page has moved.</p><p><a href="/#inventory">See available watches</a> · <a href="/drop/">Follow the Watch Drop</a></p></div></body></html>
`;
}


// ---------------------------------------------------------------------------
// Sell page (/sell/): static, indexable, with "purchased from people like you"
// pulled from Deal Tracker rows ticked "Show on Sell Page".
// ---------------------------------------------------------------------------
const BRAND_FIX = { 'tag heuer': 'TAG Heuer', 'glashutte': 'Glashütte Original', 'ulysses nardine': 'Ulysse Nardin', 'ulysse nardin': 'Ulysse Nardin' };
function tidyTitle(t) {
  let s = String(t || '').replace(/\s+/g, ' ').trim();
  for (const [k, v] of Object.entries(BRAND_FIX)) if (s.toLowerCase().startsWith(k)) s = v + s.slice(k.length);
  return s;
}

async function loadBought() {
  try {
    if (process.env.BOUGHT_FILE) return JSON.parse(fs.readFileSync(process.env.BOUGHT_FILE, 'utf8'));
    if (process.env.FEED_FILE) return [];
    const res = await fetch(FEED_URL + '?type=bought&t=' + Date.now(), { redirect: 'follow' });
    const d = await res.json();
    return Array.isArray(d) ? d.filter(x => x && !x.id && x.title) : [];  // old feed version returns inventory (has id): ignore
  } catch (e) { console.log('Bought list unavailable: ' + e.message); return []; }
}

function sellPage(bought) {
  const url = `${SITE}/sell/`;
  const sms = `sms:${PHONE}?&body=${encodeURIComponent("Hi JB, I'd like to sell my watch. Brand / model / reference: ")}`;
  const faqs = [
    ['What do you need to make an offer?', 'The brand, full reference number, the year if you know it, and clear photos of the dial, case, caseback, bracelet or strap, and anything included such as the box, papers or service records.'],
    ['Do I need the box and papers?', 'No. Watches without box and papers are still bought, but complete sets are usually worth more, so mention everything you have.'],
    ['What affects the price?', 'The specific reference and current market demand, condition, whether the box and papers are included, service history, and whether all parts are original. Aftermarket parts or polishing can lower the value.'],
    ['How does the sale happen?', 'In Central Florida we meet at a bank or jeweler, with photo identification and a signed bill of sale. Anywhere else in the US, you receive a prepaid, insured FedEx shipping label, send the watch in for inspection, and are paid once it passes inspection.'],
    ['Can I trade my watch toward another one?', 'Yes. Trade-ins toward a watch in our inventory are welcome. Tell us which watch you are interested in.'],
  ];
  const ld = [
    { '@context': 'https://schema.org', '@type': 'Service', name: 'Sell your luxury watch', serviceType: 'Pre-owned luxury watch buying',
      provider: { '@type': 'Store', name: 'WESTELIS', url: SITE + '/', telephone: '+1-863-332-9829' }, areaServed: 'Central Florida', url },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];
  const brands = ['Rolex', 'Tudor', 'Omega', 'Breitling', 'IWC', 'Cartier', 'Panerai', 'TAG Heuer', 'Glashütte Original', 'Ulysse Nardin'];

  const cards = bought.map(b => {
    const title = tidyTitle(b.title);
    const img = b.photo
      ? `<img src="${esc(size(b.photo, 600))}" alt="${esc(title + ' bought by WESTELIS')}" loading="lazy">`
      : `<div class="ph"><img src="/assets/icon-512.png" alt="WESTELIS" loading="lazy"></div>`;
    return `<figure class="bought">${img}<figcaption><strong>${esc(title)}</strong>${b.reference ? `<span>${esc(String(b.reference).toUpperCase())}</span>` : ''}${b.month ? `<em>Purchased ${esc(b.month)}</em>` : ''}</figcaption></figure>`;
  }).join('');

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">${GA}<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sell Your Watch in Central Florida | Rolex, Tudor, Omega, Breitling | WESTELIS</title>
<meta name="description" content="Sell your luxury watch to WESTELIS, an independent watch buyer in Central Florida. Rolex, Tudor, Omega, Breitling, IWC, Cartier, Panerai and more. Send photos, get an offer, sell locally or by insured FedEx.">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#071d33">
<link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" type="image/png" sizes="96x96" href="/assets/favicon-96.png"><link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<meta property="og:type" content="website"><meta property="og:site_name" content="WESTELIS"><meta property="og:url" content="${url}">
<meta property="og:title" content="Sell your watch to WESTELIS"><meta property="og:description" content="Send a few photos and the reference. Get a straight offer from an independent Central Florida buyer.">
<meta property="og:image" content="${SITE}/assets/og-card.jpg"><meta name="twitter:card" content="summary_large_image">
${ld.map(o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('\n')}
<style>
:root{--ink:#202527;--muted:#596063;--gold:#755528;--line:#d9d8d2;--soft:#f7f6f2}
*{box-sizing:border-box}body{margin:0;background:#fff;color:var(--ink);font:16px/1.7 Arial,Helvetica,sans-serif}a{color:inherit}
header{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:18px 6%;border-bottom:1px solid var(--line)}
.wordmark{font:28px Georgia,serif;letter-spacing:5px;color:var(--gold);text-decoration:none}nav{display:flex;gap:22px;font-size:14px}nav a{text-decoration:none}
section{padding:56px 6%}.wrap{max-width:1100px;margin:0 auto}
.hero{background:var(--soft);border-bottom:1px solid var(--line)}
.eyebrow{font-size:12px;letter-spacing:2px;color:var(--gold);margin:0 0 10px}
h1{font:clamp(34px,5vw,58px)/1.1 Georgia,serif;margin:0 0 16px}h2{font:clamp(26px,3.4vw,38px)/1.2 Georgia,serif;margin:0 0 18px}
.lead{font-size:18px;color:var(--muted);max-width:640px}
.ctas{display:flex;flex-wrap:wrap;gap:12px;margin-top:26px}
.btn{display:inline-block;text-align:center;padding:15px 24px;text-decoration:none;font-size:15px;border:1px solid #9b9e97;background:none;color:var(--ink);cursor:pointer;font-family:inherit}
.btn.primary{background:#24292b;color:#fff;border-color:#24292b}.btn:hover{border-color:var(--gold)}
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;counter-reset:s}
.steps article{border-top:3px solid #ae915d;padding:18px 0 0}.steps h3{font:22px Georgia,serif;margin:0 0 8px}.steps p{color:var(--muted);margin:0}
.brands{display:flex;flex-wrap:wrap;gap:10px;list-style:none;padding:0;margin:0 0 12px}.brands li{border:1px solid var(--line);padding:8px 14px;font-size:14px}
.note{color:var(--muted);font-size:15px}
.bought-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:20px}
.bought{margin:0;border:1px solid var(--line);background:var(--soft)}.bought img,.bought .ph{width:100%;aspect-ratio:1/1;object-fit:cover;display:block;background:#eeeee8}
.bought .ph{display:grid;place-items:center;background:#071d33}.bought .ph img{width:46%;height:auto;aspect-ratio:auto;background:none}
.bought figcaption{padding:12px 14px;font-size:14px;line-height:1.5}.bought strong{display:block;font-size:15px}.bought span{display:block;color:var(--muted)}.bought em{display:block;color:var(--gold);font-style:normal;font-size:13px;margin-top:4px}
details{border-top:1px solid var(--line);padding:14px 0}details:last-child{border-bottom:1px solid var(--line)}summary{cursor:pointer;font-weight:bold}details p{color:var(--muted);margin:10px 0 0}
form{max-width:640px}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:0 18px}label{display:block;font-size:14px;margin-bottom:16px}
input,textarea{display:block;width:100%;padding:12px;border:1px solid #aeb1ab;font:16px Arial,sans-serif;margin-top:6px;border-radius:0}input:focus,textarea:focus{outline:2px solid #ae915d}
.honeypot{position:absolute;left:-9999px}#status{font-size:15px}
footer{border-top:1px solid var(--line);padding:26px 6%;font-size:14px;color:var(--muted);display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px}footer a{text-decoration:none}
@media(max-width:800px){.steps{grid-template-columns:1fr}.grid2{grid-template-columns:1fr}nav a:not(.keep){display:none}.wordmark{font-size:22px}section{padding:44px 6%}}
</style></head><body>
<header><a class="wordmark" href="/">WESTELIS</a><nav><a href="/#inventory" class="keep">Watches for sale</a><a href="/drop/">Watch Drop</a><a href="#offer" class="keep">Get an offer</a></nav></header>
<main>
<section class="hero"><div class="wrap">
<p class="eyebrow">SELL YOUR WATCH</p>
<h1>Sell your watch to WESTELIS.</h1>
<p class="lead">An independent watch buyer in Central Florida. Send the reference and a few photos, and JB will reply personally with an offer or any questions. No auctions, no listing fees, no waiting on buyers.</p>
<div class="ctas"><a class="btn primary" href="${esc(sms)}" data-alt="#offer">Text photos to JB</a><a class="btn" href="#offer">Request an offer online</a></div>
</div></section>

<section><div class="wrap">
<p class="eyebrow">HOW IT WORKS</p><h2>Three steps.</h2>
<div class="steps">
<article><h3>1. Send the details</h3><p>Brand, full reference, condition, and photos of the dial, case, caseback and bracelet. Mention any box, papers or service records.</p></article>
<article><h3>2. Get an offer</h3><p>Your watch is reviewed against current market prices, and you get a straight offer or any questions that need answering first.</p></article>
<article><h3>3. Complete the sale</h3><p><strong>Local:</strong> meet at a bank or jeweler with photo ID and a signed bill of sale.<br><strong>Not local:</strong> you get a prepaid, insured FedEx label. Payment is sent once the watch arrives and passes inspection.</p></article>
</div></div></section>

${cards ? `<section style="background:#fbfaf7;border-top:1px solid var(--line);border-bottom:1px solid var(--line)"><div class="wrap">
<p class="eyebrow">RECENT PURCHASES</p><h2>Watches purchased from people just like you.</h2>
<p class="note" style="margin-top:-6px">Real watches bought from private owners and trade-ins.</p>
<div class="bought-grid">${cards}</div></div></section>` : ''}

<section><div class="wrap">
<p class="eyebrow">WHAT WE BUY</p><h2>Brands we buy.</h2>
<ul class="brands">${brands.map(b => `<li>${esc(b)}</li>`).join('')}</ul>
<p class="note">And other quality Swiss and German watches. With or without box and papers. Trade-ins toward a watch in our inventory are welcome.</p>
</div></section>

<section id="offer" style="background:var(--soft);border-top:1px solid var(--line)"><div class="wrap">
<p class="eyebrow">REQUEST AN OFFER</p><h2>Tell us about your watch.</h2>
<p class="note">Fastest: <a href="${esc(sms)}" data-alt="#offer" style="color:var(--gold)">text photos to 863.332.9829</a>. Or send the details here and we'll ask for photos.</p>
<form id="sell-form">
<div class="grid2"><label>Name<input name="name" autocomplete="name" maxlength="100" required></label><label>Phone (optional)<input name="phone" type="tel" autocomplete="tel" maxlength="60"></label></div>
<label>Email<input name="email" type="email" autocomplete="email" maxlength="200" required></label>
<label>Watch: brand, model and reference<input name="reference" maxlength="160" placeholder="e.g. Rolex Submariner 116610LN" required></label>
<label>Details<textarea name="message" rows="5" maxlength="5000" required placeholder="Year, condition, box and papers, service history, and your asking price if you have one."></textarea></label>
<label class="honeypot" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>
<button class="btn primary" type="submit">Request an offer</button>
<p id="status" role="status"></p>
</form>
</div></section>

<section><div class="wrap" style="max-width:820px">
<p class="eyebrow">QUESTIONS</p><h2>Before you sell.</h2>
${faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}
</div></section>
</main>
<footer><span>© ${new Date().getFullYear()} WESTELIS · Central Florida · By appointment</span><span><a href="/">Home</a> · <a href="/drop/">Watch Drop</a> · <a href="https://g.page/r/CRBXsF5Co8IWEBM/review" target="_blank" rel="noopener">Review us on Google</a> · <a href="tel:${PHONE}">863.332.9829</a></span></footer>
${SMS_DESKTOP}
<script>
document.getElementById('sell-form').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,b=f.querySelector('button'),st=document.getElementById('status');
const d=Object.fromEntries(new FormData(f));if(d.website)return;d.kind='sell';b.disabled=true;st.textContent='Sending…';
try{await fetch(${JSON.stringify(FEED_URL)},{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(d)});
f.reset();st.textContent='Received. JB will reply using the details you provided. To speed things up, text photos to 863.332.9829.';
if(window.gtag)gtag('event','generate_lead',{form:'sell',request_type:'sell'});}catch(err){st.textContent='Could not send. Please text or call 863.332.9829.';}finally{b.disabled=false;}};
</script>
</body></html>
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
const bought = await loadBought();
fs.mkdirSync(path.join(ROOT, 'sell'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'sell', 'index.html'), sellPage(bought));

const urls = [`${SITE}/`, `${SITE}/sell/`, ...watches.map(w => `${SITE}/watch/${slug(w.id)}/`)];
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n') + `\n</urlset>\n`);
fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`Built ${watches.length} watch page(s) and the sell page (${bought.length} purchases).`);
