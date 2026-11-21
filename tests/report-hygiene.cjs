'use strict';
/* Runtime data and importer workflows stay; only transient run reports move to artifacts. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const ignore=read('.gitignore');
const inGit=spawnSync('git',['rev-parse','--is-inside-work-tree'],{cwd:root,encoding:'utf8'}).status===0;
const cases=[
 ['backfill-videos.yml','video-backfill-reports',['backfill-report.txt','probe-report.txt']],
 ['import-ikhlasbd.yml','ikhlasbd-import-report',['ik-report.txt']],
 ['ik-probe.yml','ikhlasbd-probe-report',['ik-probe-report.txt']]
];
for(const [workflow,artifact,reports] of cases){
 const source=read('.github/workflows/'+workflow);
 assert(source.includes("if: github.event_name != 'push' || !contains(github.event.head_commit.message, '[skip-data-jobs]')"));
 assert.match(source,/if: always\(\)\s+uses: actions\/upload-artifact@v4/);
 assert(source.includes('name: '+artifact));assert(source.includes('retention-days: 30'));
 for(const report of reports){
  assert(source.includes('tools/'+report));assert(ignore.split(/\r?\n/).includes('/tools/'+report));
  assert(!source.split(/\r?\n/).some(line=>/\bgit add\b/.test(line)&&line.includes(report)),`${report} must not be staged`);
  if(inGit){const tracked=spawnSync('git',['ls-files','--error-unmatch','--','tools/'+report],{cwd:root,encoding:'utf8'});assert.equal(tracked.status,1,`${report} must not be tracked`)}
 }
}
for(const file of ['tools/video-audit-state.json','tools/video-blocklist.json','tools/new-text-import-report.json','tools/ik-ids.json'])assert(fs.existsSync(path.join(root,file)),`${file} is retained data`);
console.log('report hygiene: artifacts replace transient reports; persistent data retained');
