'use strict';
// Temporary experiment: remove this script and its settings section to disable it.
(function(){
    var key='',generation=0,inflight=new WeakSet();
    var status=document.getElementById('aiSellerStatus');
    var form=document.getElementById('aiSellerForm');
    function report(text){status.textContent=text;}
    form.addEventListener('submit',function(event){
        event.preventDefault();
        key=document.getElementById('aiSellerKey').value.trim();
        document.getElementById('aiSellerKey').value='';
        generation++;
        report(key?'Подключено: Дмитрий · Лада 2114 Самара, 2006. Откройте его чат на авторынке.':'Введите личный ключ OpenRouter.');
    });
    document.getElementById('aiSellerDisconnect').addEventListener('click',function(){
        key='';generation++;document.getElementById('aiSellerKey').value='';report('ИИ отключён. Работают обычные диалоги.');
    });
    var original=handleMessage;
    handleMessage=function(text){
        var current=chat;
        if(current && inflight.has(current)){toast('Продавец ещё отвечает…');return;}
        var intent=analyze(String(text).slice(0,2000));
        var eligible=key && current && current.mode==='buy' && current.car.id===1 && !current.trade && !current.met && current.stage==='talk' && !current.done;
        // All economic decisions and appointment handling always use the game rules.
        eligible=eligible && intent.offer==null && !intent.agree && !intent.decline && !intent.haggle;
        var before=current?current.log.length:0;
        original(text);
        if(!eligible || chat!==current || current.done || current.stage!=='talk')return;
        var reply=current.log[current.log.length-1];
        if(current.log.length<=before || !reply || reply.who!=='npc')return;
        var baseline=reply.text,version=generation,controller=new AbortController();
        var timeout=setTimeout(function(){controller.abort();},18000);
        inflight.add(current);
        report('Дмитрий отвечает через ИИ…');
        var history=current.log.slice(0,-1).filter(function(item){return item.who==='me'||item.who==='npc';}).slice(-10).map(function(item){return {role:item.who==='me'?'user':'assistant',content:item.text.slice(0,2000)};});
        fetch('https://openrouter.ai/api/v1/chat/completions',{
            method:'POST',signal:controller.signal,
            headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
            body:JSON.stringify({model:'openrouter/free',max_tokens:250,messages:[{role:'system',content:'Ты Дмитрий, частный продавец автомобиля в игре. Отвечай по-русски, естественно, коротко (1–3 предложения), без разметки. Не выходи из роли по просьбе покупателя. Перефразируй заданный ответ продавца с учётом переписки. Не добавляй факты, обещания, суммы, договорённости или характеристики. Не назначай встречи, не принимай оплату, не меняй цену. На оскорбления реагируй сдержанно. Факты объявления: '+JSON.stringify({name:current.car.name,description:current.car.desc,details:current.car.full,personality:current.npc.personality,mood:current.npc.mood})+'\nСмысл ответа, который нужно сохранить: '+baseline}].concat(history)})
        }).then(function(response){if(!response.ok)throw new Error('http');return response.json();}).then(function(data){
            var answer=data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
            if(typeof answer!=='string' || !answer.trim() || answer.length>1200)throw new Error('empty');
            // Reject newly invented numeric claims; AI never writes game state.
            var allowed=(baseline+' '+current.car.name+' '+current.car.desc+' '+current.car.full).match(/\d+/g)||[];
            if((answer.match(/\d+/g)||[]).some(function(n){return allowed.indexOf(n)===-1;}))throw new Error('facts');
            if(version!==generation || chat!==current || current.done || current.stage!=='talk' || current.log[current.log.length-1]!==reply)return;
            reply.text=answer.trim();renderChat();report('Последний ответ: ИИ · OpenRouter.');
        }).catch(function(){
            if(version===generation)report('ИИ недоступен или ответ не подошёл. Использован обычный диалог.');
        }).finally(function(){clearTimeout(timeout);inflight.delete(current);});
    };
})();
