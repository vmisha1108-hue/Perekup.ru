const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const settings=fs.readFileSync('settings.js','utf8');
const source=settings.slice(0,settings.indexOf('appearance=normalizeAppearance(appearance);'));
for(const os of ['windows','macos','linux','__proto__',null]){
 const original={os,themes:{[os]:'dark'},wallpapers:{[os]:'../../bad'}};
 const c=vm.createContext({readSaved:()=>original});vm.runInContext(source,c);
 const migrated=c.normalizeAppearance(original);assert.equal(migrated.os,'perekup');assert.equal(migrated.version,2);assert.equal(migrated.themes.perekup,'light');assert.equal(migrated.wallpapers.perekup,'embankment');assert.equal(original.os,os);
 assert.equal(c.normalizeAppearance(null).os,'perekup');
 const saved=c.normalizeAppearance({os:'perekup',themes:{perekup:'dark'},wallpapers:{perekup:'aurora'}});assert.equal(saved.themes.perekup,'dark');assert.equal(saved.wallpapers.perekup,'aurora');
}
const html=fs.readFileSync('index.html','utf8');assert.ok(!html.includes('name="settingsOS"'));assert.ok(html.includes('perekup-os.css'));assert.ok(html.includes('perekup-os.js'));assert.ok(fs.statSync('wallpapers/embankment.webp').size>10000);
console.log('PASS single OS migration, malformed saves, persisted themes/wallpapers and removed OS selector');
