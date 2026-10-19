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
    const overlay=page.locator('#identityOverlay');
    // A fading-out dialog can still be visible after its logical state closed.
    if(!await page.locator('#identityOverlay.open').count()){await overlay.waitFor({state:'hidden'});return;}
    await page.locator('#identityNickname').fill(nickname);
    const box=await page.locator('#identityCanvas').boundingBox();
    await page.mouse.move(box.x+box.width*.15,box.y+box.height*.55);await page.mouse.down();
    await page.mouse.move(box.x+box.width*.35,box.y+box.height*.2,{steps:8});await page.mouse.move(box.x+box.width*.65,box.y+box.height*.7,{steps:8});await page.mouse.up();
    await page.locator('#identitySave').click();
    await overlay.waitFor({state:'hidden'});
}
// Catalogue regression scenarios exercise the secondary controls explicitly.
function installExpandedFilters(page){
    for(const method of ['goto','reload']){
        const navigate=page[method].bind(page);
        page[method]=async(...args)=>{const response=await navigate(...args);await page.evaluate(()=>{const fields=document.getElementById('marketAdvanced');if(fields){fields.hidden=false;document.getElementById('filterToggle').setAttribute('aria-expanded','true');}});return response;};
    }
}
module.exports={installEntryContinue,completeIdentity,installExpandedFilters};
