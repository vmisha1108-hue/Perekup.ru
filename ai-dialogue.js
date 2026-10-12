'use strict';

var AI_DIALOGUE = {available:false, checked:false, failed:false, base:''};
try{
    var aiServer = window.PEREKUP_AI && window.PEREKUP_AI.server || '';
    var aiUrl = new URL(aiServer || '.', location.href);
    if(aiUrl.protocol === 'https:' || (aiUrl.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].indexOf(aiUrl.hostname) !== -1)){
        AI_DIALOGUE.base = aiServer ? aiUrl.href.replace(/\/$/, '') : '';
    }
}catch(e){}

function renderAiStatus(){
    var el = document.getElementById('aiStatus');
    if(!el) return;
    el.textContent = !AI_DIALOGUE.checked ? 'Проверяем ИИ…' : !AI_DIALOGUE.available
        ? 'Обычные ответы · ИИ не подключён' : AI_DIALOGUE.failed
        ? 'ИИ временно недоступен · обычный ответ' : 'Ответы ИИ';
}

async function checkAiDialogue(){
    try{
        var response = await fetch(AI_DIALOGUE.base + '/api/ai-status', {signal:AbortSignal.timeout(4000)});
        if(response.ok){ var status = await response.json(); AI_DIALOGUE.available = status.enabled === true; }
    }catch(e){}
    AI_DIALOGUE.checked = true;
    renderAiStatus();
}

function aiCarContext(car){
    return {name:car.name, description:vehicleDesc(car), details:car.full || ''};
}
function aiChatContext(c, history, fallback, intent, before){
    var city = meetingCity(c.mode, c.car.id);
    return {
        role:c.mode === 'buy' ? 'seller' : 'buyer',
        person:{name:c.npc.name, personality:c.npc.personality, mood:c.npc.mood},
        car:aiCarContext(c.car), city:city ? city.name : '',
        trade:c.trade ? {car:aiCarContext(carById(c.trade.carId)), terms:tradeTerms(c.trade, c.price == null ? c.bid : c.price)} : null,
        negotiation:{currentPrice:c.mode === 'buy' ? c.ask : c.bid, agreedPrice:c.price,
            listingPrice:c.mode === 'buy' ? c.referencePrice : c.listingPrice,
            stage:c.stage, previousStage:before, topic:intent.topic,
            priceDiscussion:intent.offer != null || intent.agree || intent.haggle,
            fallback:fallback},
        history:history.filter(function(m){ return m.who === 'me' || m.who === 'npc'; }).slice(-20)
            .map(function(m){ return {role:m.who === 'me' ? 'user' : 'assistant', content:m.text}; })
    };
}

function cancelAiReply(c){
    if(!c || !c.aiPending) return;
    c.aiPending = false;
    if(c.aiController) c.aiController.abort();
    delete c.aiController;
    c.log.forEach(function(m){ delete m.aiWaiting; });
    if(chat === c) saveChat();
}

/* Правила сначала фиксируют результат торга. ИИ формулирует ответ и не меняет
   баланс, цену, этапы встречи или владение машиной. При сбое остаётся обычный ответ. */
async function handleMessage(text){
    if(!chat || chat.done || chat.aiPending || chat.stage !== 'talk') return;
    text = String(text).trim().slice(0,2000);
    if(!text) return;
    var c = chat, start = c.log.length, before = c.stage;
    handleMessageRules(text);
    if(!AI_DIALOGUE.available || c.done || chat !== c) return;
    var message = c.log.slice(start).find(function(m){ return m.who === 'npc'; });
    if(!message) return;
    var history = c.log.slice(0, c.log.indexOf(message));
    var payload = aiChatContext(c, history, message.text, analyze(text), before);
    var controller = new AbortController();
    c.aiController = controller;
    c.aiPending = true;
    message.aiWaiting = true;
    AI_DIALOGUE.failed = false;
    renderChat();
    var timeout = setTimeout(function(){ controller.abort(); }, 22000);
    try{
        var response = await fetch(AI_DIALOGUE.base + '/api/dialogue', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body:JSON.stringify(payload), signal:controller.signal
        });
        if(!response.ok) throw new Error('AI unavailable');
        var data = await response.json();
        if(typeof data.reply !== 'string' || !data.reply.trim() || data.reply.length > 1600) throw new Error('Invalid reply');
        if(chat === c && c.aiController === controller && !c.done){ message.text = data.reply.trim(); message.source = 'ai'; }
    }catch(e){
        if(chat === c && c.aiController === controller) AI_DIALOGUE.failed = true;
    }finally{
        clearTimeout(timeout);
        if(c.aiController === controller){
            c.aiPending = false;
            delete c.aiController;
            delete message.aiWaiting;
            if(chat === c) renderChat();
        }
    }
}

checkAiDialogue();
