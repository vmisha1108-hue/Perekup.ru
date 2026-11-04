#pragma once
#include "travel.hpp"
namespace perekup {
inline Money negotiationDiscount(Money price,const std::function<double()>& random){if(price<=1||price>safeInteger)return 0;double chance=random();Money amount=chance<.03?50000:chance<.15?30000:Money(10000+std::floor(random()*3)*5000);return std::max<Money>(0,std::min({amount,price-1,Money(std::floor(price*.15/500)*500)}));}
inline std::string meetingMoney(Money value){return groupedRussian(value)+" ₽";}
inline Json meetingPriceEvent(const Json& chat,const std::function<double()>& random){
 if(random()>.65)return nullptr;Money price=chat.at("price");static constexpr Money amounts[]={500,1000,1500,2000,3000};Money fuel=amounts[std::min(4,int(std::floor(random()*5)))];auto p=chat.at("npc").value("personality","neutral");bool buy=chat.at("mode")=="buy";
 if(!buy&&price<=1)return nullptr;Money amount=buy?fuel:negotiationDiscount(price,random);if(!amount)return nullptr;auto m=meetingMoney(amount);std::string line;
 if(buy)line=p=="kind"?"Ехал к вам через весь город… Подкинете "+m+" на бензин? 🙂":p=="evil"?"Ехал полгорода. "+m+" на бензин, и забирайте.":"Бензин сейчас недешёвый. Добавьте "+m+" за дорогу.";
 else line=p=="kind"?"Вижу небольшие царапины… Скинете "+m+"? 🙂":p=="evil"?"Тут и там косяки. Минус "+m+", иначе уезжаю.":"Есть замечания по кузову. Скиньте "+m+".";
 return {{"sign",buy?1:-1},{"amount",amount},{"line",line},{"prompt",std::string(buy?"Продавец просит добавить на бензин: +":"Покупатель нашёл недостатки и просит скинуть: −")+m},{"yesLabel",std::string(buy?"✅ Согласиться (+":"✅ Согласиться (−")+m+")"}};
}
inline bool meetingHasTrade(const Json& chat){return chat.contains("trade")&&chat["trade"].is_object();}
inline Json meetingConfirmation(const Json& chat){Money price=chat.at("price");if(meetingHasTrade(chat)){Money value=chat["trade"].at("value"),diff=price-value;auto terms="Оценка машины покупателя: "+meetingMoney(value)+". "+(diff>0?"Покупатель доплатит "+meetingMoney(diff):diff<0?"Ваша доплата: "+meetingMoney(-diff):"Обмен без доплаты");return {{"sign",0},{"amount",0},{"confirmation",true},{"prompt","Обе машины осмотрены. "+terms},{"yesLabel","Подтвердить обмен"}};}
 bool sell=chat.at("mode")=="sell";return {{"sign",0},{"amount",0},{"confirmation",true},{"prompt",std::string(sell?"Клиент готов купить автомобиль":"Осмотр завершён, автомобиль соответствует описанию")+" по согласованной цене: "+meetingMoney(price)+"."},{"yesLabel",std::string(sell?"Продать за ":"Купить за ")+meetingMoney(price)}};
}
// Operates on a caller-owned draft. Economic mutation happens only through the
// separate deal/contract commit after requestCompletion returns true.
class Meeting {
public:
 std::function<double()> random;
 explicit Meeting(std::function<double()> rng):random(std::move(rng)){}
 bool arrive(Json& chat,Json& pending,double now,bool here){if(chat.value("done",false)||chat.value("stage","")!="go"||!here||now<num(pending,"when"))return false;chat["met"]=true;
 if(!pending.contains("flow")||pending["flow"].is_null()){double arrival=now+300000+std::floor(random()*600001);pending["flow"]={{"stage","waiting"},{"startedAt",now},{"arrivalAt",arrival},{"inspectionUntil",arrival+300000+std::floor(random()*300001)},{"event",nullptr}};}
 chat["stage"]=pending["flow"]["stage"];chat["event"]=pending["flow"]["event"];return true;}
 bool tick(Json& chat,Json& pending,double now,const std::function<void()>& inspect){if(chat.value("done",false)||!chat.value("met",false)||!pending.contains("flow"))return false;auto& flow=pending["flow"];bool changed=false;
 if(flow["stage"]=="waiting"&&now>=num(flow,"arrivalAt")){pending["attendanceChecked"]=true;if(pending.value("noShow",false)){chat["event"]=nullptr;chat["done"]=true;chat["stage"]="done";chat["meetingOutcome"]="no-show";chat["meetingEndStage"]="waiting";chat["meetingResult"]=chat["mode"]=="sell"?"Клиент не приехал. Автомобиль остаётся в гараже, деньги не изменились. Объявление снова принимает отклики.":"Продавец не приехал. Деньги остались на счёте, покупка отменена. Можно выбрать другое объявление.";return true;}flow["stage"]="inspection";chat["stage"]="inspection";changed=true;}
 if(flow["stage"]=="inspection"&&now>=num(flow,"inspectionUntil")){if(chat["mode"]=="buy"&&!meetingHasTrade(chat))inspect();auto event=meetingPriceEvent(chat,random);if(event.is_null())event=meetingConfirmation(chat);flow["event"]=event;flow["stage"]="event";chat["stage"]="event";chat["event"]=event;changed=true;}return changed;}
 bool agree(Json& chat,const std::function<bool(Money)>& afford){if(chat.value("done",false)||chat.value("stage","")!="event"||!chat.contains("event")||chat["event"].is_null())return false;auto e=chat["event"];Money price=chat.at("price"),delta=e.at("sign").get<Money>()*e.at("amount").get<Money>();if(delta>safeInteger-price||price+delta<1)return false;price+=delta;if((num(e,"sign")>0&&!afford(price))||(meetingHasTrade(chat)&&price<num(chat["trade"],"value")&&!afford(Money(num(chat["trade"],"value"))-price)))return false;chat["price"]=price;chat["event"]=nullptr;return true;}
 bool refuse(Json& chat){if(chat.value("done",false)||chat.value("stage","")!="event")return false;bool confirmation=chat.contains("event")&&chat["event"].is_object()&&chat["event"].value("confirmation",false);chat["event"]=nullptr;if(confirmation){cancel(chat);return false;}auto p=chat.at("npc").value("personality","neutral");double leave=(p=="kind"?.10:p=="evil"?.55:.30)+(num(chat["npc"],"mood")<30?.10:0);if(random()<leave){chat["done"]=true;chat["stage"]="done";return false;}return true;}
 static void cancel(Json& chat){chat["event"]=nullptr;chat["done"]=true;chat["stage"]="done";chat["meetingOutcome"]="cancelled";chat["meetingResult"]="Вы отказались от сделки. Деньги и автомобиль остались у владельцев.";}
};
}
