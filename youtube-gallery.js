(()=>{
  const grid=document.getElementById('video-grid');
  const status=document.getElementById('video-gallery-status');
  const search=document.getElementById('video-search');
  const prev=document.getElementById('video-prev');
  const next=document.getElementById('video-next');
  const pageInput=document.getElementById('video-page-number');
  const pageGo=document.getElementById('video-page-go');
  const pageLabel=document.getElementById('video-page-label');
  if(!grid||!status)return;

  const pageSize=20;
  const scriptUrl=document.currentScript?.src||location.href;
  const numberFormat=new Intl.NumberFormat('en-US');
  const dateFormat=new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'Asia/Dhaka'});
  const NEW_DAYS=14; /* এই দিনসংখ্যার ভেতরের ভিডিওতে "নতুন" ব্যাজ */
  let videos=[];
  let page=1;

  /* ===== বিষয় ও চ্যানেলের বোতাম (ফতোয়ার পাতার বিভাগ-বোতামের মতো) =====
     ভিডিওর তালিকায় (youtube-videos.json) কোনো বিভাগ নেই, তাই বিষয় ঠিক হয় শিরোনামের শব্দ মিলিয়ে।
     নিচের তালিকা: [বোতামের নাম, শব্দগুলো]। শব্দের শেষে * = শব্দটি এভাবে শুরু হলেই চলবে; * না থাকলে শব্দটি হুবহু বা
     সাধারণ বিভক্তিসহ (ের, র, ে, তে, কে…) মিলতে হবে। একটি ভিডিও একাধিক বিষয়ে পড়তে পারে; কোনো শব্দ না মিললে শুধু "সব"-এ থাকে।
     বক্তার নামের অংশ (ইউসুফ, ইব্রাহীম, মুফতি, জাকির…) শব্দ হিসেবে দেবেন না — তাতে তাঁর সব ভিডিও ভুল বিষয়ে পড়ে। */
  const VIDEO_TOPICS=[
   ['আক্বীদা','আকীদা* আকিদা* আক্বীদা* আক্বিদা* তাওহীদ* তাওহিদ* তাওহীদ* শিরক* শির্ক* ঈমান* ইমান ইমানদার* কুফর* কুফরী কাফের* সিফাত* তাকদীর* তাকদির* ভাগ্য বিদআত* বিদ\'আত* বেদআত* বিদাত* তহাবিয়্যাহ তাহাবিয়্যাহ ওয়াসিতিয়া* তাওয়াসসুল উসিলা অসিলা মাজার* পীর* তাবিজ* التوحيد العقيدة aqeedah aqidah ইবাদাত* ইবাদত* মানত* জাদু* যাদু* জ্বিন* জিন জিনের tawheed tawhid shirk'],
   ['ছালাত','সালাত* সলাত* স্বলাত* ছালাত* নামাজ* নামায* ওযু* অযু* ওজু* উযু* তায়াম্মুম* গোসল* পবিত্রতা* তাহাজ্জুদ* তারাবী* তারাবি* বিতর* বিতির* সিজদা* সেজদা* রাকাত* রাকআত* আযান* আজান* ইকামত* ইমামতি* মুক্তাদি* মুসল্লি* কসর* কিবলা* জামাআতে কাতার* সুতরা* মাসেহ* হায়েয* হায়েজ* নিফাস* salah salat namaz prayer taraweeh taraaweeh wudu'],
   ['ছিয়াম','রোজা* রোযা* সিয়াম* ছিয়াম* সাওম* রমাদান* রমজান* রমযান* রামাদান* রামাযান* রমাযান* ইফতার* সাহরী* সাহরি* সেহরি* সেহরী* ইতিকাফ* এতেকাফ* ফিতরা* তারাবী* তারাবি* কদর লাইলাতুল শাওয়াল* আশুরা* ramadan ramadhan fasting taraweeh taraaweeh'],
   ['যাকাত ও দান','যাকাত* জাকাত* সদকা* সাদাকা* সাদাক্বা* ছাদাক্বা* সদাকা* দান দানকারী দান-সদকা দান-সাদাকা ফিতরা* উশর* ওশর* ওয়াকফ* zakat zakah sadaqah charity'],
   ['হজ্জ ও কুরবানী','হজ হজ্জ* হজ্ব* হাজী* হাজি উমরা* ওমরা* ওমরাহ* ইহরাম* তাওয়াফ* আরাফা* মিনা মুযদালিফা* যিলহজ্জ* জিলহজ* যিলহজ* কুরবানী* কুরবানি* কোরবানি* কোরবানী* ঈদ ঈদুল* আকিকা* আকীকা* আক্বীক্বা* hajj umrah eid qurbani'],
   ['পরিবার','বিয়ে* বিবাহ* তালাক* স্ত্রী* স্বামী* সন্তান* পিতা পিতা-মাতা* পিতামাতা* মাতা-পিতা* বাবা বাবা-মা* মা-বাবা* পরিবার* পারিবারিক দাম্পত্য* মোহর* দেনমোহর* মোহরানা* নারী* মহিলা* পর্দা* হিজাব* নিকাব* ইদ্দত* সংসার* শ্বশুর* শাশুড়ি* বউ পাত্র* পাত্রী* মাহরাম* প্যারেন্টিং marriage family women hijab'],
   ['লেনদেন','সুদ সুদী সুদি সুদভিত্তিক ঘুষ* ব্যবসা* ব্যাংক* ব্যাংকিং ঋণ* লোন* টাকা* চাকরি* চাকুরি* চাকুরী* চাকরী* বেতন* ইনকাম* উপার্জন* অর্থনীতি* বীমা* ইন্স্যুরেন্স* ইন্সুরেন্স* শেয়ারবাজার* কিস্তি* লেনদেন* ক্রয়* বিক্রয়* বিক্রি* বেচাকেনা* উত্তরাধিকার* মিরাস* মীরাস* ওয়ারিশ* সম্পত্তি* সম্পদ* রিযিক* রিজিক* মুদারাবা* ক্রিপ্টো* বিটকয়েন* ফ্রিল্যান্স* economics banking riba'],
   ['কুরআন','কুরআন* কোরআন* ক্বুরআন* তাফসীর* তাফসির* সূরা* সুরা সুরাহ সূরাহ আয়াত* তিলাওয়াত* তেলাওয়াত* হিফজ* হিফয* হাফেজ* হাফেয* তাজবীদ* তাজবিদ* উলুমুল কুরআনুল quran qur\'an tafsir tafseer surah القرآن'],
   ['হাদীছ','হাদীস* হাদিস* হাদীছ* বুখারী* বুখারি* মিশকাত* তিরমিযী* তিরমিজি* নাসাঈ* সুন্নাহ* সুন্নাত* সুন্নত* রিয়াযুস রিয়াদুস বুলুগুল সিহাহ* মুহাদ্দিস* hadith hadeeth sunnah bukhari البخاري السنة'],
   ['সীরাত ও ইতিহাস','নবী* রাসূল* রাসুল* সাহাবী* সাহাবি* সাহাবা* সাহাবায়ে সীরাত* সিরাত* ইতিহাস* ইতিবৃত্ত* জীবনী* খলিফা* খলীফা* খিলাফত* হিজরত* বদর* উহুদ* মিরাজ* মেরাজ* prophet seerah sahaba history'],
   ['আখিরাত','মৃত্যু* মৃত মারা কবর* জানাযা* জানাজা* দাফন* কাফন* জান্নাত* জাহান্নাম* কিয়ামত* কেয়ামত* ক্বিয়ামত* আখিরাত* আখেরাত* পরকাল* হাশর* দাজ্জাল* ইয়াজুজ* শাফায়াত* পুলসিরাত* বারযাখ* মীযান* ঈসালে ইসালে death jannah hereafter'],
   ['দোয়া ও আত্মশুদ্ধি','দোয়া* দুআ* দু\'আ* দু‘আ* যিকর* যিকির* জিকির* ইস্তিগফার* ইস্তেগফার* দরুদ* দরূদ* রুকইয়া* রুকিয়া* ঝাড়ফুঁক* তাওবা* তওবা* গুনাহ* পাপ* আত্মশুদ্ধি* তাকওয়া* তাক্বওয়া* অন্তর সবর* ধৈর্য* শোকর* আখলাক* চরিত্র* আদব* হিংসা* অহংকার* গীবত* গিবত* রিয়া ইখলাস* dua dhikr zikr tawbah'],
   ['দাওয়াত ও ধর্মতত্ত্ব','দাওয়াত* দাওয়াহ* দাঈ* নাস্তিক* নাস্তিকতা* সংশয়* স্রষ্টা* সৃষ্টিকর্তা* খ্রিস্টান* খৃষ্টান* খ্রিষ্টান* হিন্দু* বৌদ্ধ* ইহুদি* ইহুদী* বাইবেল* বেদ ধর্মগ্রন্থ* তুলনামূলক অমুসলিম* বিজ্ঞান* বিবর্তন* কাদিয়ানী* কাদিয়ানি* শিয়া* dawah christianity hinduism atheism atheist bible comparative religion science'],
   ['মানহাজ','মানহাজ* মানহায* সালাফ* সালাফী* সালাফি* খারেজী* খারেজি* খাওয়ারিজ* মাযহাব* মাজহাব* হানাফী* হানাফি* মুরজিয়া* তাবলীগ* তাবলিগ* জামায়াত* ইখওয়ান* সুফি* সূফী* সুফী* তাসাউফ* তাকলীদ* তাকলিদ* ফিরকা* ফেরকা* আহলে আহলুস মাদখালী* দেওবন্দ* বেরেলভী* ব্রেলভী* manhaj salafi'],
   ['রাজনীতি','রাজনীতি* রাজনৈতিক গণতন্ত্র* গণতান্ত্রিক ভোট* গণভোট* নির্বাচন* ফিলিস্তিন* গাজা* যুদ্ধ* জিহাদ* জেহাদ* শাসন* শাসক* রাষ্ট্র* সরকার* খিলাফত* খেলাফত* আন্দোলন* হরতাল* বিদ্রোহ* ঐক্য* উম্মাহ* সেক্যুলার* ধর্মনিরপেক্ষ* সংবিধান* আইন* politics'],
   ['ইলম','ইলম* ইল্‌ম* জ্ঞান জ্ঞানার্জন* আলেম* আলিম* উলামা* ওলামা* মাদরাসা* মাদ্রাসা* শিক্ষা* শিক্ষক* ছাত্র* ছাত্রী* তালিবুল* পড়াশোনা* লেখাপড়া* কোর্স* ফতোয়া* ফাতাওয়া* ফিকহ* ফিকহুল উসুল* উসূল* knowledge education students'],
   ['প্রশ্নোত্তর','প্রশ্ন প্রশ্নঃ প্রশ্নোত্তর* সওয়াল* জিজ্ঞাসা* প্রশ্ন-উত্তর* q&a question* answers'],
   ['দারস','দারস* দরস* দারসুল* dars'],
   ['জুমুআর খুৎবা','খুৎবা* খুতবা* খুতবাহ* khutbah khutba'],
  ];
  /* চ্যানেলের বোতাম: youtube-videos.json-এর channelTitle → ছোট নাম (তালিকায় না থাকা চ্যানেল নিজের নামেই দেখায়) */
  const VIDEO_CHANNELS=[
    ['DAWAH X','DAWAH X'],
    ['Professor Dr. Abubakar Muhammad Zakaria','ড. আবু বকর যাকারিয়া'],
    ['Salafi Manhaj 2 · সালাফী মানহাজ','সালাফী মানহাজ 2'],
    ['Peace TV Bangla · PeaceTVprogram','Peace TV Bangla'],
    ['Attahreek TV','আত-তারীক টিভি'],
    ['Al-Itisam TV','আল-ইতিসাম টিভি'],
  ];
  const VT_SUFFIX='(?:ের|র|ে|য়|তে|কে|টি|টা|ও|ই|য়ে|য়ের|দের|গুলো|সমূহ|টাই|টিও)?';
  const vtEsc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  /* শিরোনামকে মেলানোর উপযোগী করা: যতিচিহ্ন → ফাঁকা (হাইফেন ও ঊর্ধ্বকমা শব্দের ভেতরে থাকে), ছোট হাতের অক্ষর */
  const vtFold=t=>' '+String(t||'').normalize('NFC').toLowerCase().replace(/[\u200c\u200d]/g,'').replace(/[।,!?|()\[\]{}:;"“”…┇•·\/\\#*~=+<>—–_.]+/g,' ').replace(/\s+/g,' ').trim()+' ';
  const vtRules=VIDEO_TOPICS.map(([label,words])=>{
    const alts=words.split(/\s+/).filter(Boolean).map(w=>w.endsWith('*')?vtEsc(w.slice(0,-1).toLowerCase())+'[^ ]*':vtEsc(w.toLowerCase())+VT_SUFFIX);
    return {label,re:new RegExp(' (?:'+alts.join('|')+')(?= )','u')};
  });
  const topicsOf=new WeakMap();
  let topicsPresent=null;   /* একবারেই সব ভিডিওর বিষয় গুনে রাখি (হাজারো ভিডিওতে ২২টি রেগেক্স বারবার চালানো নয়) */
  const videoTopics=video=>{
    let list=topicsOf.get(video);
    if(!list){const t=vtFold(video.title);list=vtRules.filter(rule=>rule.re.test(t)).map(rule=>rule.label);topicsOf.set(video,list);}
    return list;
  };
  let topic='';   // '' = সব বিষয়
  let channel=''; // '' = সব চ্যানেল (মান: channelTitle)
  const channelName=title=>(VIDEO_CHANNELS.find(row=>row[0]===title)||[0,title])[1];

  /* বোতামের সারি: পাতায় #video-filters না থাকলে সার্চ-বক্সের ঠিক পরে তৈরি হয় */
  const gallery=document.getElementById('video-gallery');
  let filters=document.getElementById('video-filters');
  if(!filters&&gallery){
    filters=document.createElement('div');filters.id='video-filters';filters.className='video-filters';
    const controls=gallery.querySelector('.video-gallery-controls');
    if(controls)controls.after(filters);else grid.before(filters);
  }
  function chip(label,value,current){
    const b=document.createElement('button');
    b.type='button';b.className='chip'+(value===current?' on':'');b.dataset.value=value;b.textContent=label;
    b.setAttribute('aria-pressed',String(value===current));
    return b;
  }
  function chipRow(kind,name,items,current){
    const row=document.createElement('div');row.className='video-filter-row';
    const title=document.createElement('span');title.className='video-filter-name';title.id='video-filter-'+kind;title.textContent=name;
    const box=document.createElement('div');box.className='qchips video-chips';box.dataset.kind=kind;box.setAttribute('role','group');box.setAttribute('aria-labelledby',title.id);
    box.append(chip('সব','',current),...items.map(item=>chip(item[1],item[0],current)));
    row.append(title,box);
    return row;
  }
  /* তালিকা লোড হওয়ার আগে সব বোতাম দেখায় (পাতা যেন লাফ না দেয়); লোডের পরে যে বিষয়/চ্যানেলে একটিও ভিডিও নেই সেটি বাদ পড়ে */
  function drawFilters(){
    if(!filters)return;
    const loaded=videos.length>0;
    let topicItems;
    if(!loaded){
      topicItems=VIDEO_TOPICS.map(row=>[row[0],row[0]]);
    }else{
      if(!topicsPresent){
        topicsPresent=new Set();
        for(const video of videos)for(const label of videoTopics(video))topicsPresent.add(label);
      }
      topicItems=VIDEO_TOPICS.map(row=>row[0]).filter(label=>topicsPresent.has(label)).map(label=>[label,label]);
    }
    const names=loaded?[...new Set(videos.map(video=>video.channelTitle).filter(Boolean))]:VIDEO_CHANNELS.map(row=>row[0]);
    const order=title=>{const i=VIDEO_CHANNELS.findIndex(row=>row[0]===title);return i<0?VIDEO_CHANNELS.length:i;};
    const channelItems=names.sort((a,b)=>order(a)-order(b)).map(title=>[title,channelName(title)]);
    if(loaded){if(topic&&!topicItems.some(item=>item[0]===topic))topic='';if(channel&&!names.includes(channel))channel='';}
    const note=document.createElement('p');note.className='video-filter-note';
    note.textContent='বিষয়গুলো ভিডিওর শিরোনামের শব্দ দেখে সাজানো; যে ভিডিওর শিরোনামে বিষয়ের শব্দ নেই সেটি শুধু «সব»-এ থাকে।';
    const rows=[chipRow('topic','বিষয়',topicItems,topic)];
    if(channelItems.length>1)rows.push(chipRow('channel','চ্যানেল',channelItems,channel));
    filters.replaceChildren(...rows,note);
  }
  filters?.addEventListener('click',event=>{
    const b=event.target.closest('button.chip');if(!b)return;
    const kind=b.closest('[data-kind]')?.dataset.kind,value=b.dataset.value||'';
    if(kind==='topic')topic=value;else if(kind==='channel')channel=value;else return;
    b.parentElement.querySelectorAll('button.chip').forEach(other=>{const on=other===b;other.classList.toggle('on',on);other.setAttribute('aria-pressed',String(on));});
    page=1;
    if(videos.length)render(); // তালিকা লোডের আগে চাপলে বাছাইটি মনে থাকে, লোড হলে খাটে
  });
  drawFilters();

  const baseUrl=new URL('.',scriptUrl);
  const remoteThumb=(id,size='hqdefault')=>`https://i.ytimg.com/vi/${encodeURIComponent(id)}/${size}.jpg`;
  function thumbUrl(video){
    const value=String(video.thumbnail||'');
    if(!value)return remoteThumb(video.id);
    if(/^https:\/\//i.test(value))return value;
    // Local thumbnail files (video-thumb-<id>.jpg) are stored with lowercase names.
    return new URL(value.toLowerCase(),baseUrl).href;
  }
  const normalize=value=>String(value||'').normalize('NFC').toLocaleLowerCase().replace(/[০-৯]/g,d=>String('০১২৩৪৫৬৭৮৯'.indexOf(d))).replace(/\s+/g,' ').trim();
  const searchText=new WeakMap();
  function matchingVideos(){
    const terms=normalize(search?.value).split(' ').filter(Boolean);
    let list=videos;
    if(channel)list=list.filter(video=>video.channelTitle===channel);
    if(topic)list=list.filter(video=>videoTopics(video).includes(topic));
    if(!terms.length)return list;
    return list.filter(video=>{
      let text=searchText.get(video);
      if(text===undefined){text=normalize(`${video.title} ${video.channelTitle||''}`);searchText.set(video,text);}
      return terms.every(term=>text.includes(term));
    });
  }

  function makeCard(video){
    const article=document.createElement('article');
    article.className='video-card';
    article.setAttribute('data-reveal','');

    const button=document.createElement('button');
    button.type='button';
    button.className='video-preview';
    button.dataset.videoId=video.id;
    button.dataset.videoTitle=video.title;
    button.setAttribute('aria-label',video.title+' — ভিডিওটি এই পেজে চালান');

    const image=document.createElement('img');
    image.loading='lazy';
    image.decoding='async';
    image.alt=video.title+' — ভিডিও thumbnail';
    image.addEventListener('error',()=>{
      if(image.dataset.fallback)return;
      image.dataset.fallback='1';
      image.src=remoteThumb(video.id,'mqdefault');
    });
    image.addEventListener('load',()=>image.classList.add('is-loaded'));
    image.addEventListener('error',()=>image.classList.add('is-loaded'));
    image.src=thumbUrl(video);
    if(image.complete&&image.naturalWidth)image.classList.add('is-loaded');
    button.append(image);

    const info=document.createElement('div');
    info.className='video-info';
    const channel=document.createElement('span');
    channel.className='video-channel-label';
    channel.textContent=video.channelTitle||'YouTube';
    const heading=document.createElement('h2');
    heading.textContent=video.title;
    const note=document.createElement('span');
    note.className='video-inline-note';
    note.textContent='ভিডিওটি এই পেজেই চলবে';
    info.append(channel,heading);
    if(video.publishedAt){
      const time=document.createElement('time');
      time.dateTime=video.publishedAt;
      const date=new Date(video.publishedAt);
      if(!Number.isNaN(date.getTime()))time.textContent=dateFormat.format(date);
      info.append(time);
    }
    info.append(note);
    /* ২১ দিনের ভেতরের আপলোডে "নতুন" ব্যাজ — তালিকা নিজে থেকেই আপডেট হয় বলে পাঠক নতুন ভিডিও চিনতে পারেন */
    if(video.publishedAt){
      const age=Date.now()-Date.parse(video.publishedAt);
      if(age>-86400000&&age<NEW_DAYS*86400000){
        const badge=document.createElement('span');
        badge.className='video-new';
        badge.textContent='নতুন';
        button.append(badge);
      }
    }
    article.append(button,info);
    return article;
  }

  function render(){
    const query=normalize(search?.value);
    const matches=matchingVideos();
    const pages=Math.max(1,Math.ceil(matches.length/pageSize));
    page=Math.min(Math.max(1,page),pages);
    const start=(page-1)*pageSize;
    const pageVideos=matches.slice(start,start+pageSize);
    grid.replaceChildren(...pageVideos.map(makeCard));
    grid.dataset.count=String(pageVideos.length);
    /* ছবি লোড হওয়ার সময় শিমার, তারপর ফেড-ইন (CSS-এ এই চিহ্ন দেখে নিয়ম চালু হয়) */
    grid.dataset.fade='1';

    const picked=(topic?' · বিষয়: '+topic:'')+(channel?' · চ্যানেল: '+channelName(channel):'');
    if(!matches.length){
      status.textContent=(topic||channel)?(query?'এই বাছাইয়ে এই নামে কোনো ভিডিও পাওয়া যায়নি':'এই বাছাইয়ে কোনো ভিডিও নেই')+picked+' — অন্য বিষয় বা «সব» বেছে দেখুন।':'এই নামে কোনো ভিডিও পাওয়া যায়নি।';
    }else{
      status.textContent=`মোট ${numberFormat.format(matches.length)}টি ভিডিও · পৃষ্ঠা ${numberFormat.format(page)} / ${numberFormat.format(pages)} · এক পৃষ্ঠায় ${pageSize}টি`+picked+(query?' · খোঁজার ফলাফল':(topic||channel)?'':' · নতুন ভিডিও স্বয়ংক্রিয়ভাবে যোগ হয়');
    }
    if(pageLabel)pageLabel.textContent=`পৃষ্ঠা ${numberFormat.format(page)} / ${numberFormat.format(pages)}`;
    if(pageInput){pageInput.max=String(pages);pageInput.value=String(page);pageInput.disabled=pages<=1;}
    if(prev)prev.disabled=page<=1;
    if(next)next.disabled=page>=pages;
    if(pageGo)pageGo.disabled=pages<=1;
  }

  function goToPage(value,scroll=false){
    const target=Number.parseInt(value,10);
    if(!Number.isFinite(target)){if(pageInput)pageInput.value=String(page);return;}
    page=target; // render() clamps to the valid range
    render();
    if(scroll)document.getElementById('video-gallery')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  let searchTimer;
  search?.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{page=1;render();},140);});
  prev?.addEventListener('click',()=>goToPage(page-1,true));
  next?.addEventListener('click',()=>goToPage(page+1,true));
  pageGo?.addEventListener('click',()=>goToPage(pageInput?.value,true));
  pageInput?.addEventListener('keydown',event=>{if(event.key==='Enter')goToPage(pageInput.value,true);});

  const catalogUrl=new URL('youtube-videos.json',baseUrl);
  fetch(catalogUrl.href,{cache:'no-cache'})
    .then(response=>{if(!response.ok)throw new Error(`Catalogue request failed (${response.status})`);return response.json();})
    .then(data=>{
      if(!Array.isArray(data)||!data.length)throw new Error('Catalogue is empty or malformed');
      videos=data.filter(video=>video&&/^[\w-]{11}$/.test(video.id||'')&&typeof video.title==='string');
      if(!videos.length)throw new Error('No valid video records');
      page=1;
      drawFilters();
      render();
    })
    .catch(error=>{
      console.warn('Static YouTube catalogue could not be loaded:',error);
      status.textContent='ভিডিও তালিকা লোড হয়নি; আপাতত সংরক্ষিত প্রথম ২০টি ভিডিও দেখানো হচ্ছে।';
      if(prev)prev.disabled=true;if(next)next.disabled=true;if(pageGo)pageGo.disabled=true;if(pageInput)pageInput.disabled=true;
      if(filters)filters.hidden=true; // তালিকা ছাড়া বাছাই করা যায় না
    });
})();
