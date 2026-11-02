const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const assert=require('node:assert/strict');const fs=require('fs');const path=require('path');const {pathToFileURL}=require('url');
(async()=>{
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
const example=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/study-pack.json'),'utf8')),pack={...example,checklist:example.checklist.slice(0,2),mcqs:[example.mcqs[0]],status:'draft'};
let requests=[],mode='ok';await page.route('https://nebula-study.pages.dev/api/study',async route=>{requests.push(route.request().postDataJSON());if(mode==='auth')return route.fulfill({status:401,json:{error:'Wrong access code.'}});if(mode==='fail')return route.fulfill({status:502,json:{error:'Research unavailable'}});if(mode==='wait'){await new Promise(r=>setTimeout(r,1000));return route.fulfill({json:{pack}}).catch(()=>{});}return route.fulfill({json:{pack}});});
await page.goto(pathToFileURL(path.join(__dirname,'../dist/fnph-raid-offline.html')).href);await page.waitForTimeout(500);
await page.locator('#studyQuery').fill(example.question);await page.locator('#studyGenerate').click();assert.match(await page.locator('#studyStatus').innerText(),/access code/);assert.equal(requests.length,0);
await page.locator('#studyCode').fill('test-code');await page.locator('#studyGenerate').click();await page.waitForFunction(()=>document.querySelector('#studyStatus').textContent.startsWith('Session ready'));
assert.deepEqual(requests[0],{question:example.question,research:true,mode:'osce'});assert.equal(await page.locator('#studyNotes').getAttribute('open'),'');assert.equal(await page.locator('#studyAnswer a').count(),2);
assert(!(await page.evaluate(()=>JSON.stringify({...localStorage}))).includes('test-code'));
mode='auth';await page.locator('#studyGenerate').click();await page.waitForFunction(()=>document.querySelector('#studyCodeError').textContent.startsWith('Wrong access code.'));assert.equal(await page.locator('#studyCodeError').isVisible(),true);assert.equal(await page.locator('#studyCode').getAttribute('aria-invalid'),'true');assert.equal(await page.evaluate(()=>document.activeElement.id),'studyCode');assert.equal(await page.locator('#studyPlay').isVisible(),true);await page.locator('#studyCode').fill('test-code');assert.equal(await page.locator('#studyCodeError').isVisible(),false);
// All provider responses in this check are simulated; no API key is used.
mode='fail';await page.locator('#studyQuery').fill('Another school question requiring a completely different management discussion.');await page.locator('#studyGenerate').click();await page.waitForFunction(()=>document.querySelector('#studyStatus').textContent==='Research unavailable');assert.equal(requests.at(-1).question,'Another school question requiring a completely different management discussion.');assert.equal(await page.locator('#studyPlay').isVisible(),true);
mode='wait';await page.locator('#studyGenerate').click();await page.locator('#studyCancel').click();await page.waitForFunction(()=>document.querySelector('#studyStatus').textContent.startsWith('Generation cancelled'));assert.equal(await page.locator('#studyGenerate').isEnabled(),true);
await page.reload();await page.waitForTimeout(300);assert.match(await page.locator('#studyQuery').inputValue(),/Another school/);assert.equal(await page.locator('#studyCode').inputValue(),'');assert.equal(await page.locator('#studyPlay').isVisible(),true);
await page.locator('#studyPlay').click();await page.evaluate(()=>{$.hero.x=1704;$.hero.y=904;$.raid.update();});await page.locator('#cardBtn').click();
let answers=0;
for(let i=0;i<20;i++){
 if(await page.evaluate(p=>$.raid.studyProgress(p).done===2,pack))break;
 await page.waitForFunction(()=>$.raid.phase==='fight'&&$.carriers.some(c=>c.alive),{},{timeout:10000});
 await page.evaluate(()=>{const R=$.raid;R.carrierDown($.carriers.find(c=>c.alive&&R.wave.correct.includes(c.text)));});answers++;
 await page.waitForFunction(()=>$.raid.phase==='fight'||!document.querySelector('#cardWrap').hidden,{},{timeout:10000});
 if(await page.locator('#cardWrap').isVisible())await page.locator('#cardBtn').click();
}
assert.equal(await page.evaluate(p=>$.raid.studyProgress(p).done,pack),2);assert(answers>=9);assert.deepEqual(errors,[]);
console.log('PASS single flow: arbitrary pasted question, automatic research request, sourced teaching, playable session, repeated mastery, saved offline session, cancel/error recovery, access-code privacy; '+answers+' correct gameplay actions');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

