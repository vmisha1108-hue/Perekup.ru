const installed=new WeakSet();
// Existing scenarios choose the real "continue" button at every navigation.
function installEntryContinue(page){
    if(installed.has(page))return;installed.add(page);
    for(const method of ['goto','reload']){
        const navigate=page[method].bind(page);
        page[method]=async(...args)=>{const response=await navigate(...args);const button=page.locator('#entryContinue');if(await button.isVisible())await button.click();await completeIdentity(page);return response;};
    }
}
async function completeIdentity(page,nickname='Иванов Алексей Сергеевич'){
    if(!await page.locator('#identityOverlay').isVisible())return;
    await page.locator('#identityNickname').fill(nickname);
    const box=await page.locator('#identityCanvas').boundingBox();
    await page.mouse.move(box.x+box.width*.15,box.y+box.height*.55);await page.mouse.down();
    await page.mouse.move(box.x+box.width*.35,box.y+box.height*.2,{steps:8});await page.mouse.move(box.x+box.width*.65,box.y+box.height*.7,{steps:8});await page.mouse.up();
    await page.locator('#identitySave').click();
}
module.exports={installEntryContinue,completeIdentity};
