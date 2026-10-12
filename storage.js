'use strict';

// Повреждённый раздел сохранения не должен мешать загрузке остальных разделов.
function isRecord(value){return value!==null && typeof value==='object' && !Array.isArray(value);}
function readSaved(key,fallback){
    try{
        var raw=localStorage.getItem(key);
        if(raw===null)return fallback;
        var value=JSON.parse(raw);
        if(Array.isArray(fallback))return Array.isArray(value)?value:fallback;
        if(isRecord(fallback))return isRecord(value)?value:fallback;
        return value;
    }catch(e){return fallback;}
}
// Не перезаписываем неизменённые данные; сверяемся с хранилищем, чтобы учитывать сброс.
function writeSaved(key,value){
    var serialized=JSON.stringify(value);
    if(localStorage.getItem(key)!==serialized)localStorage.setItem(key,serialized);
}
function savedInteger(key,fallback,min,max){
    var raw=localStorage.getItem(key),value=raw===null || raw.trim()===''?NaN:Number(raw);
    return Number.isSafeInteger(value) && value>=min && (max==null || value<=max)?value:fallback;
}
function validNpc(npc){
    return isRecord(npc) && typeof npc.name==='string' && typeof npc.avatar==='string' &&
        ['kind','neutral','evil'].indexOf(npc.personality)!==-1 && Number.isFinite(npc.mood);
}
function validChatSave(value){
    return isRecord(value) && ['buy','sell'].indexOf(value.mode)!==-1 && carById(value.carId) && validNpc(value.npc) && Array.isArray(value.log);
}
