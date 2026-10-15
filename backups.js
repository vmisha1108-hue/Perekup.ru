'use strict';

var pendingBackup=null;
var BACKUP_KEYS=['balance','garage','deals','garageLvl','notes','pending','purchasePrices','listings','retiredMarketCars','gameMs','bank','transport','commerce','career','contracts','chats','playerIdentity','appearance','musicSettings','helpPromptSeen','startingBalanceVersion','sellerSessionMoods','marketLocation','iconPos','iconLayoutVersion'];
function backupAllowed(key){return BACKUP_KEYS.indexOf(key)!==-1 || /^window_(market|shop|calc|calendar|clock|bank|travel|documents|garage|help|settings|import|dealer|business|chat)$/.test(key);}
function gameBackup(){
    save();saveContracts();persistChats();
    var data={};Object.keys(localStorage).forEach(function(key){if(backupAllowed(key))data[key]=localStorage.getItem(key);});
    return {format:'perekup-save',version:1,createdAt:new Date().toISOString(),data:data};
}
function validateGameBackup(value){
    if(!isRecord(value) || value.format!=='perekup-save' || value.version!==1 || !isRecord(value.data))throw new Error('Это не файл сохранения Perekup.ru поддерживаемой версии.');
    var data=value.data,decoded={};
    Object.keys(data).forEach(function(key){if(!backupAllowed(key) || typeof data[key]!=='string')throw new Error('Недопустимый раздел сохранения.');try{decoded[key]=JSON.parse(data[key]);}catch(e){if(['helpPromptSeen','startingBalanceVersion','iconLayoutVersion'].indexOf(key)===-1)throw new Error('Повреждён раздел '+key+'.');}});
    if(!Number.isSafeInteger(decoded.balance) || decoded.balance<0 || !Array.isArray(decoded.garage) || decoded.garage.some(function(id){return !Number.isSafeInteger(id) || !carById(id);}) || new Set(decoded.garage).size!==decoded.garage.length)throw new Error('Повреждены баланс или список автомобилей.');
    if(!isRecord(decoded.playerIdentity) || decoded.playerIdentity.version!==1 || !validNickname(decoded.playerIdentity.nickname) || !validSignature(decoded.playerIdentity.signature))throw new Error('В копии нет корректного ника и подписи.');
    if(!Number.isSafeInteger(decoded.gameMs) || decoded.gameMs<0 || decoded.gameMs>4102444800000)throw new Error('Некорректная игровая дата.');
    ['bank','transport','commerce','career','contracts','chats','purchasePrices','listings','notes'].forEach(function(key){if(key in decoded && !isRecord(decoded[key]))throw new Error('Повреждён раздел '+key+'.');});
    ['pending','retiredMarketCars'].forEach(function(key){if(key in decoded && !Array.isArray(decoded[key]))throw new Error('Повреждён раздел '+key+'.');});
    return value;
}
function restoreGameBackup(value){
    validateGameBackup(value);var before={};Object.keys(localStorage).forEach(function(key){if(backupAllowed(key))before[key]=localStorage.getItem(key);});
    try{
        Object.keys(before).forEach(function(key){localStorage.removeItem(key);});
        Object.keys(value.data).forEach(function(key){localStorage.setItem(key,value.data[key]);});
    }catch(e){Object.keys(value.data).forEach(function(key){if(backupAllowed(key))localStorage.removeItem(key);});Object.keys(before).forEach(function(key){localStorage.setItem(key,before[key]);});throw new Error('Не удалось записать копию. Прежний прогресс восстановлен.');}
    return true;
}
function initBackups(){
    $('backupExport').addEventListener('click',function(){
        var blob=new Blob([JSON.stringify(gameBackup(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='perekup-save-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(link);link.click();link.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);$('backupStatus').textContent='Копия подготовлена для скачивания. Храните её вместе с игровыми документами.';
    });
    $('backupFile').addEventListener('change',async function(){
        pendingBackup=null;$('backupRestore').hidden=true;var file=this.files[0];if(!file)return;
        try{if(file.size>5*1024*1024)throw new Error('Файл слишком большой: максимум 5 МБ.');var backup=validateGameBackup(JSON.parse(await file.text())),data=backup.data;pendingBackup=backup;$('backupStatus').textContent='Готово к восстановлению: '+JSON.parse(data.playerIdentity).nickname+', баланс '+money(JSON.parse(data.balance))+', машин '+JSON.parse(data.garage).length+'. Текущий прогресс будет заменён.';$('backupRestore').hidden=false;}
        catch(e){$('backupStatus').textContent=e.message || 'Не удалось прочитать файл.';}
    });
    $('backupRestore').addEventListener('click',function(){if(!pendingBackup || !confirm('Заменить текущий прогресс выбранной копией? Сначала скачайте текущую копию, если хотите её сохранить.'))return;try{restoreGameBackup(pendingBackup);location.reload();}catch(e){$('backupStatus').textContent=e.message;}});
}
