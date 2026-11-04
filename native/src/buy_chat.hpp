#pragma once
#include "meeting_schedule.hpp"
#include "chat_store.hpp"
namespace perekup {
inline std::string beginNativeBuyChat(Json& state,const Json& car,const std::function<double()>& random){
 if(state.at("marketRisks").at("seizures").size()>=5)return "game-over";
 if(state.contains("chat")&&state["chat"].is_object()&&state["chat"].value("met",false)&&!state["chat"].value("done",false))return "meeting-active";
 Money id=car.at("id");if(car.value("exchangeOnly",false))return "unavailable";
 for(const auto& x:state.at("garage"))if(x==id)return "owned";
 for(const auto& x:state.at("retiredMarketCars"))if(x==id)return "unavailable";
 for(const auto& x:state.at("pending"))if(x.value("carId",0LL)==id)return "pending";
 auto key="buy:"+std::to_string(id);Json draft=state;rememberNativeChat(draft);
 if(draft["chatStore"].contains(key)){auto saved=draft["chatStore"][key];if(saved.contains("car")&&saved.value("closedReason","")=="lowball"){draft["chat"]=saved;state.swap(draft);return "restored";}if(saved.contains("car")&&!saved.value("done",false)&&(saved["pid"].is_null()||saved["pid"]=="")){draft["chat"]=saved;state.swap(draft);return "restored";}}
 auto npc=car.at("seller");auto p=npc.value("personality","neutral");double mood=p=="kind"?72:p=="evil"?30:50;npc["mood"]=std::clamp(mood+std::floor(random()*17)-8,5.,95.);npc["greeted"]=false;
 draft["chat"]={{"mode","buy"},{"car",car},{"npc",npc},{"ask",car.at("price")},{"referencePrice",car.at("price")},{"discountBudget",negotiationDiscount(car.at("price"),random)},{"log",Json::array()},{"last",""},{"done",false},{"stage","talk"},{"price",nullptr},{"event",nullptr},{"meet",nullptr},{"note",nullptr},{"met",false},{"busyUsed",false},{"busyTimes",Json::array()},{"pid",nullptr}};
 rememberNativeChat(draft);state.swap(draft);return "opened";
}
}
