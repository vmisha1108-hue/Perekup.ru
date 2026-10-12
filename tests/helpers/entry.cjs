const installed=new WeakSet();
// Existing scenarios choose the real "continue" button at every navigation.
function installEntryContinue(page){
    if(installed.has(page))return;installed.add(page);
    for(const method of ['goto','reload']){
        const navigate=page[method].bind(page);
        page[method]=async(...args)=>{const response=await navigate(...args);const button=page.locator('#entryContinue');if(await button.isVisible())await button.click();return response;};
    }
}
module.exports={installEntryContinue};
