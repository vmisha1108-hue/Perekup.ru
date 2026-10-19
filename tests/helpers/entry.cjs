const installed=new WeakSet();
// Existing scenarios choose the real "continue" button at every navigation.
function installEntryContinue(page){
    if(installed.has(page))return;installed.add(page);
    for(const method of ['goto','reload']){
        const navigate=page[method].bind(page);
        page[method]=async(...args)=>{const response=await navigate(...args);const button=page.locator('#entryContinue');if(await button.isVisible()){await button.click();await page.locator('#entryResetOverlay').waitFor({state:'hidden'});}await completeIdentity(page);return response;};
    }
}
async function completeIdentity(page,nickname='Иванов Алексей Сергеевич'){
    if(await page.locator('#welcomeOverlay.open').count()){await page.locator('#welcomeHelp').click();await page.locator('#identityOverlay.open').waitFor({state:'visible'});}
    const overlay=page.locator('#identityOverlay');
    if(await page.locator('#identityOverlay.open').count()){
        await page.locator('#identityNickname').fill(nickname);
        await page.locator('#identitySignature').fill('TEST');
        await page.locator('#identitySave').click();
    }
    await overlay.waitFor({state:'hidden'});
    if(await page.locator('#tutorialOverlay').isVisible())await page.locator('#tutorialSkip').click();
}
// Catalogue regression scenarios exercise the secondary controls explicitly.
function installExpandedFilters(page){
    for(const method of ['goto','reload']){
        const navigate=page[method].bind(page);
        page[method]=async(...args)=>{const response=await navigate(...args);await page.evaluate(()=>{const fields=document.getElementById('marketAdvanced');if(fields){fields.hidden=false;document.getElementById('filterToggle').setAttribute('aria-expanded','true');}});return response;};
    }
}
module.exports={installEntryContinue,completeIdentity,installExpandedFilters};
