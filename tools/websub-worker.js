/* DAWAH X — YouTube-এর WebSub (PubSubHubbub) পুশ নেওয়ার ছোট Cloudflare Worker।
   ---------------------------------------------------------------------------
   কী করে: ইউটিউব কোনো চ্যানেলে নতুন ভিডিও দিলে সেকেন্ডের মধ্যে এখানে একটি POST আসে;
   Worker সেটি GitHub-এ repository_dispatch («youtube-upload») হিসেবে পাঠায়, আর
   .github/workflows/update-videos.yml তখনই চলে গিয়ে ভিডিওটি সাইটে যোগ করে।

   এটি ছাড়া সাইটের স্বাভাবিক পথ হলো ৫ মিনিটের ক্রন — অর্থাৎ WebSub না থাকলেও
   নতুন ভিডিও কয়েক মিনিটের মধ্যে আসে; WebSub থাকলে প্রায় সাথে সাথে আসে।

   সেটআপ (একবারই লাগে) — ধাপে ধাপে লেখা আছে site-notes.md-এ:
   1) Cloudflare-এ gratis অ্যাকাউন্ট নিয়ে Workers-এ এই ফাইলটি পেস্ট করুন।
   2) Environment variables (Secrets) যোগ করুন:
        VERIFY_TOKEN  = যেকোনো লম্বা এলোমেলো শব্দ (হাব যাচাইয়ের সময় মিলিয়ে দেখা হয়)
        HUB_SECRET    = আরেকটি এলোমেলো শব্দ (পুশের HMAC সই যাচাই; না দিলে সই যাচাই বন্ধ)
        GITHUB_TOKEN  = fine-grained PAT — শুধু এই রিপোজিটরি, শুধু "Contents: read and write"
                        (repository_dispatch-এর জন্য GitHub এই অনুমতিটুকুই চায়, আর কিছু নয়)
        REPO          = Ebrahim-ead/DAWAH-X
        URL           = Worker-এর নিজের ঠিকানা, যেমন https://dawahx-websub.<user>.workers.dev/
   3) Worker-এর ঠিকানাটি (https://<name>.<user>.workers.dev/) একবার /subscribe?topic=<feed> দিয়ে
      হাবের কাছে জমা দিন — বা প্রতিদিন একবার scheduled() নিজেই সব ফিডের সাবস্ক্রিপশন নবায়ন করে।
   4) চ্যানেলের ফিড: https://www.youtube.com/feeds/videos.xml?channel_id=<channelId>

   নিরাপত্তা: টোকেন শুধু Worker-এর secret-এ থাকে, পাতায় বা রিপোতে নয়; সই যাচাই ছাড়া
   অন্য কেউ ওয়ার্কফ্লো চালাতে পারবে না (HUB_SECRET সেট করা থাকলে)।
   নোট: এই ফাইলটি সাইটে আসে না (কোনো পাতা এটি লোড করে না) — শুধু Worker-এ পেস্ট করার জন্য। */
'use strict';

const HUB = 'https://pubsubhubbub.appspot.com/subscribe';
const FEEDS = [
  'UCnYA8VEMUbs64MrJqUn7XHw', // DAWAH X
  'UCc6cxJCSSaLxd4JE_GHxsEA', // Attahreek TV
  'UCtip528n2pKDumGCvftZPIg', // Al-Itisam TV
  'UCsdrsrt-_eB_x3R85GVqwVQ', // Professor Dr. Abubakar Muhammad Zakaria
  'UCMjwytkTZpf2WhR7iDm3jVw', // Salafi Manhaj 2
  'UCClsYw7y1BTTtTT8-EE_GPw'  // Peace TV Bangla
];
const leaseSeconds = 5 * 24 * 60 * 60; // ৫ দিন; scheduled() সময় থাকতে নবায়ন করে

const feedUrl = id => 'https://www.youtube.com/feeds/videos.xml?channel_id=' + id;

/* HMAC-SHA1 যাচাই (হাব X-Hub-Signature: sha1=…) */
async function signatureOk(body, header, secret) {
  if (!secret) return true;                     // সই চেক বন্ধ (না চাইলে)
  if (!header || !header.startsWith('sha1=')) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, body));
  const hex = [...mac].map(b => b.toString(16).padStart(2, '0')).join('');
  return hex === header.slice(5).toLowerCase();
}

/* পুশের Atom থেকে ভিডিওর আইডি ও শিরোনাম */
function readEntries(xml) {
  const out = [];
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
  for (const entry of entries) {
    const id = /<yt:videoId>([\w-]{11})<\/yt:videoId>/.exec(entry);
    if (!id) continue;
    const title = /<title>([\s\S]*?)<\/title>/.exec(entry);
    out.push({ id: id[1], title: title ? decodeXml(title[1]) : '' });
  }
  return out;
}
const decodeXml = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

/* GitHub-কে «এখনই নতুন ভিডিও খোঁজো» বলা */
async function dispatch(env, payload) {
  const res = await fetch('https://api.github.com/repos/' + env.REPO + '/dispatches', {
    method: 'POST',
    headers: {
      authorization: 'Bearer ' + env.GITHUB_TOKEN,
      accept: 'application/vnd.github+json',
      'content-type': 'application/json',
      'user-agent': 'dawahx-websub'
    },
    body: JSON.stringify({ event_type: 'youtube-upload', client_payload: payload })
  });
  return res.status; // 204 = গৃহীত
}

/* হাবের কাছে সাবস্ক্রিপশন (নবায়নও এটিই) */
async function subscribe(env, topic) {
  const body = new URLSearchParams({
    'hub.mode': 'subscribe',
    'hub.topic': topic,
    'hub.callback': new URL('/websub', env.URL).href,
    'hub.verify': 'async',
    'hub.verify_token': env.VERIFY_TOKEN,
    'hub.lease_seconds': String(leaseSeconds)
  });
  if (env.HUB_SECRET) body.set('hub.secret', env.HUB_SECRET);
  const res = await fetch(HUB, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'dawahx-websub' },
    body: body.toString()
  });
  return res.status; // 202/204 = গৃহীত
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    /* স্বাস্থ্য-পরীক্ষা: ব্রাউজারে খুললে দেখা যাবে */
    if (request.method === 'GET' && url.pathname === '/')
      return new Response('DAWAH X WebSub worker চলছে — ' + new Date().toISOString(),
        { headers: { 'content-type': 'text/plain; charset=utf-8' } });

    /* হাবের যাচাই: hub.mode=subscribe&hub.topic=…&hub.challenge=…&hub.verify_token=… */
    if (request.method === 'GET' && url.pathname === '/websub') {
      if (url.searchParams.get('hub.verify_token') !== env.VERIFY_TOKEN)
        return new Response('bad token', { status: 403 });
      return new Response(url.searchParams.get('hub.challenge') || '', { status: 200 });
    }

    /* হাতে একবার সাবস্ক্রিপশন জমা দেওয়া: /subscribe?topic=<feed> */
    if (url.pathname === '/subscribe') {
      const topic = url.searchParams.get('topic');
      const list = topic ? [topic] : FEEDS.map(feedUrl);
      const results = [];
      for (const t of list) results.push({ topic: t, status: await subscribe(env, t) });
      return Response.json({ results });
    }

    /* ইউটিউবের পুশ */
    if (request.method === 'POST' && url.pathname === '/websub') {
      const raw = await request.arrayBuffer();
      const signed = await signatureOk(raw, request.headers.get('x-hub-signature') || '', env.HUB_SECRET);
      if (!signed) return new Response('bad signature', { status: 403 });
      const videos = readEntries(new TextDecoder().decode(raw));
      if (!videos.length) return new Response('ok (একই পুশ, নতুন ভিডিও নেই)', { status: 200 });
      const status = await dispatch(env, { videos: videos.map(v => v.id), titles: videos.map(v => v.title) });
      return new Response(status === 204 ? 'dispatched' : 'dispatch failed: ' + status,
        { status: status === 204 ? 202 : 500 });
    }

    return new Response('not found', { status: 404 });
  },

  /* প্রতিদিন একবার: লিজ শেষ হওয়ার আগেই সব ফিডের সাবস্ক্রিপশন নবায়ন */
  async scheduled(event, env) {
    for (const id of FEEDS) {
      const status = await subscribe(env, feedUrl(id));
      console.log('resubscribe', id, status);
    }
  }
};
