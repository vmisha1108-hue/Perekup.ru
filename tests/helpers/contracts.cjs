// Complete the actual contract UI when a purchase/sale reaches its document stage.
async function signContract(page){
    if(await page.evaluate(()=>chat && !chat.done && chat.stage==='contract')){
        await page.locator('#contractAutofill').click();
        await page.locator('#contractConfirm').check();
        await page.locator('#contractSign').click();
    }
}
// Old deal scenarios now wait until the next selectable half-hour appointment.
async function reachMeetingTime(page){
    await page.evaluate(()=>{if(chat && chat.stage==='go' && chat.meet && gameMs<chat.meet.whenMs){gameMs=chat.meet.whenMs;lastRealMs=Date.now();tickPending();renderChat();}});
}
module.exports={signContract,reachMeetingTime};
