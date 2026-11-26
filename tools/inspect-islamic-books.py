#!/usr/bin/env python3
"""Collect exact category names/flipbook/PDF URLs from public source HTML.

Runs in GitHub Actions because the local sandbox cannot contact the source host.
Respect its advertised 10 second crawl-delay. Only selected bibliographic fields are
retained; no PDF bodies, scripts, contact fields or unrelated recommendations.
"""
import html.parser, json, re, time, urllib.request, urllib.parse

BASE='https://book.tauhiderdak.com'
CATEGORIES=[('bidaya','al-bidaya-wan-nihaya-pdf',14),('ibnkathir','tafsir-ibn-kathir-pdf',21),('zilal','tafsir-fi-zilalil-quran-pdf',22),('usmani','tafsir-usmani-pdf',3),('jalalain','tafsir-jalalain-pdf',7),('maarif','tafsir-maariful-quran-pdf',8),('tawjih','tafsir-tawjihul-quran-pdf',3),('tabari','tafsir-tabari-pdf',10),('mazhari','tafsir-mazhari-pdf',12),('ahmad','musnad-ahmad-pdf',2)]
last=0
def request(url,method='GET'):
    global last
    time.sleep(max(0,10-(time.monotonic()-last)))
    last=time.monotonic()
    req=urllib.request.Request(url,method=method,headers={'User-Agent':'Mozilla/5.0 (compatible; DAWAHX source catalogue)'})
    with urllib.request.urlopen(req, timeout=40) as response:
        if response.geturl().split('/')[2] != 'book.tauhiderdak.com': raise ValueError('Unexpected redirect')
        return (response.read(4_000_000).decode('utf-8','replace') if method=='GET' else ''), {k.lower():v for k,v in response.headers.items()}

class Parser(html.parser.HTMLParser):
    def __init__(self):
        super().__init__();self.link=None;self.text=[];self.links=[];self.script=False;self.buf=[];self.opts=[]
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        if tag=='a': self.link=d.get('href','');self.text=[]
        if tag=='script' and 'real3dflipbook-options' in d.get('class','').split(): self.script=True;self.buf=[]
    def handle_data(self,text):
        if self.link is not None:self.text.append(text)
        if self.script:self.buf.append(text)
    def handle_endtag(self,tag):
        if tag=='a' and self.link is not None:
            name=' '.join(''.join(self.text).split());url=urllib.parse.urljoin(BASE,self.link)
            if url.startswith(BASE+'/flipbook/') and name:self.links.append((name,url))
            self.link=None
        if tag=='script' and self.script:
            try:self.opts.append(json.loads(''.join(self.buf)))
            except json.JSONDecodeError:pass
            self.script=False

def parse(url):
    text,headers=request(url);p=Parser();p.feed(text);return p,headers

def valid_pdf(url):
    u=urllib.parse.urlparse(url)
    return u.scheme=='https' and u.netloc=='book.tauhiderdak.com' and u.path.startswith('/wp-content/uploads/') and u.path.lower().endswith('.pdf')

out={'source':BASE,'categories':[],'errors':[]}
for key,slug,expected in CATEGORIES:
    try:
        p,_=parse(BASE+'/r3d_category/'+slug)
        links=list(dict.fromkeys(p.links))
        if len(links)!=expected:out['errors'].append(f'{key}: expected {expected}, got {len(links)}')
        opts={v.get('name'):v for v in p.opts if isinstance(v,dict) and valid_pdf(v.get('pdfUrl',''))}
        result=[]
        for name,url in links:
            o=opts.get(name)
            if not o:
                detail,_=parse(url)
                opts.update({v.get('name'):v for v in detail.opts if isinstance(v,dict) and valid_pdf(v.get('pdfUrl',''))})
                o=opts.get(name)
            if not o:out['errors'].append(f'{key}: PDF not found for {name}')
            result.append({'name':name,'page':url,'pdf':o.get('pdfUrl','') if o else ''})
        out['categories'].append({'id':key,'category':slug,'expected':expected,'items':result})
        print(key,'links',len(links),'found',sum(bool(x['pdf']) for x in result),flush=True)
    except Exception as e:
        out['errors'].append(f'{key}: {type(e).__name__}: {e}')
    with open('tools/islamic-books-source.json','w') as f:json.dump(out,f,ensure_ascii=False,indent=2)
if out['categories'] and out['categories'][0]['items']:
    try:
        _,headers=request(out['categories'][0]['items'][0]['pdf'],method='HEAD')
        out['sample_pdf_headers']={k:v for k,v in headers.items() if k in ('content-type','content-length','accept-ranges','access-control-allow-origin','content-disposition','x-frame-options','content-security-policy')}
    except Exception as e:out['errors'].append(f'PDF headers: {type(e).__name__}: {e}')
with open('tools/islamic-books-source.json','w') as f:json.dump(out,f,ensure_ascii=False,indent=2)
print('errors:',out['errors'],flush=True)
