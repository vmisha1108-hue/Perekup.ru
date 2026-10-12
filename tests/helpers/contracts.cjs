// Complete the actual contract UI when a purchase/sale reaches its document stage.
async function signContract(page){
    if(await page.evaluate(()=>chat && !chat.done && chat.stage==='contract')){
        await page.locator('#contractAutofill').click();
        await page.locator('#contractConfirm').check();
        await page.locator('#contractSign').click();
    }
}
module.exports={signContract};
