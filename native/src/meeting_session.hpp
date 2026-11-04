#pragma once
#include "buy_chat.hpp"
namespace perekup {
// Mutate a staged snapshot; caller must durably commit before showing success.
inline std::string enterNativeMeeting(Json& state,const std::string& id,const std::function<double()>& random){
 if(state.at("marketRisks").at("seizures").size()>=5)return "game-over";
 if(!state.at("transport").at("trip").is_null())return "travelling";
 auto draft=state;Json* pending=nullptr;for(auto& item:draft["pending"])if(item.value("id","")==id&&item.value("type","")=="meet"){pending=&item;break;}if(!pending)return "missing";
 auto mode=pending->at("mode").get<std::string>();
 auto key=nativeChatKey(mode,pending->at("carId"),id);
 // Read older snapshots without mixing conversations from different buyers.
 if(!draft["chatStore"].contains(key))key=nativeChatKey(mode,pending->at("carId"));
 if(!draft["chatStore"].contains(key))return "missing-chat";
 if(draft.contains("chat")&&draft["chat"].is_object()&&draft["chat"].value("met",false)&&!draft["chat"].value("done",false)&&draft["chat"].value("pid","")!=id)return "meeting-active";
 auto chat=draft["chatStore"][key];if(!chat["pid"].is_string()||chat["pid"]!=id||chat.value("done",false))return "inactive";
 if(chat.value("met",false)){draft["chat"]=chat;state.swap(draft);return "restored";}
 if(num(draft,"gameMs")<num(*pending,"when"))return "early";
 auto city=chat.at("car").value("cityId","");
 if(mode=="sell"){
  auto carKey=std::to_string(pending->at("carId").get<Money>());
  const auto& vehicles=draft.at("transport").at("vehicles");
  if(!vehicles.contains(carKey))return "car-unavailable";
  const auto& vehicle=vehicles.at(carKey);
  if(vehicle.value("place","")=="road"||vehicle.value("place","")=="carrier")return "car-unavailable";
  city=vehicle.at("cityId").get<std::string>();
 }
 if(draft.at("transport").at("cityId")!=city)return "wrong-city";
 Meeting meeting(random);if(!meeting.arrive(chat,*pending,num(draft,"gameMs"),true))return "inactive";
 draft["chat"]=chat;rememberNativeChat(draft);state.swap(draft);return "entered";
}
inline bool tickNativeMeeting(Json& state,const std::function<double()>& random,const std::function<void(Json&,Money)>& inspect){
 if(!state.contains("chat")||!state["chat"].is_object())return false;
 auto draft=state;auto& chat=draft["chat"];if(!chat.value("met",false)||chat.value("done",false))return false;
 auto id=chat.at("pid").get<std::string>();for(auto& pending:draft["pending"]){if(pending.value("id","")!=id)continue;Meeting meeting(random);bool changed=meeting.tick(chat,pending,num(draft,"gameMs"),[&]{if(!inspect)throw std::logic_error("Meeting inspection is not connected");inspect(draft,chat.at("car").at("id"));});if(!changed)return false;rememberNativeChat(draft);state.swap(draft);return true;}return false;
}
inline bool refuseNativeMeetingOffer(Json& state,const std::function<double()>& random){
 if(!state.contains("chat")||!state["chat"].is_object())return false;
 auto draft=state;auto& chat=draft["chat"];if(chat.value("done",false)||chat.value("stage","")!="event"||!chat.contains("event")||!chat["event"].is_object())return false;
 Meeting meeting(random);bool continues=meeting.refuse(chat);
 if(continues)chat["event"]=meetingConfirmation(chat);
 else if(!chat.contains("meetingResult")){chat["meetingOutcome"]="cancelled";chat["meetingResult"]="Не договорились. Деньги и автомобиль остались у владельцев.";}
 for(auto& p:draft["pending"])if(p.value("id","")==chat.at("pid")){p["flow"]["stage"]=chat["stage"];p["flow"]["event"]=chat["event"];}
 rememberNativeChat(draft);state.swap(draft);return true;
}
inline bool closeNativeBuyMeeting(Json& state,bool cancel){
 if(!state.contains("chat")||!state["chat"].is_object())return false;
 auto draft=state;auto& chat=draft["chat"];if(chat.value("mode","")!="buy"||!chat.contains("pid")||!chat["pid"].is_string()||chat["pid"]=="")return false;
 if(!chat.value("done",false)){if(!cancel)return false;Meeting::cancel(chat);}
 auto id=chat["pid"].get<std::string>();auto& pending=draft["pending"];pending.erase(std::remove_if(pending.begin(),pending.end(),[&](const Json& p){return p.value("id","")==id;}),pending.end());
 auto key="buy:"+std::to_string(chat.at("car").at("id").get<Money>());draft["chatStore"].erase(key);chat["pid"]=nullptr;chat["met"]=false;state.swap(draft);return true;
}

inline bool closeNativeSaleMeeting(Json& state,bool cancel,const std::function<double(const Json&)>& buyerDelay){
 if(!state.contains("chat")||!state["chat"].is_object())return false;
 Json draft=state;auto& chat=draft["chat"];
 if(chat.value("mode","")!="sell"||!chat.contains("pid")||!chat["pid"].is_string()||chat["pid"]=="")return false;
 auto id=chat["pid"].get<std::string>();
 auto& pending=draft["pending"];auto found=std::find_if(pending.begin(),pending.end(),[&](const Json& p){return p.value("id","")==id&&p.value("type","")=="meet";});
 if(found==pending.end())return false;
 if(!chat.value("done",false)){if(!cancel)return false;Meeting::cancel(chat);}
 pending.erase(found);
 for(auto it=draft["chatStore"].begin();it!=draft["chatStore"].end();)if(it.value().value("pid","")==id)it=draft["chatStore"].erase(it);else ++it;
 auto key=std::to_string(chat.at("car").at("id").get<Money>());
 if(draft["listings"].contains(key)){
  double delay=buyerDelay(draft["listings"][key]);
  if(!std::isfinite(delay)||delay<60000)throw std::invalid_argument("Invalid buyer delay");
  draft["listings"][key]["nextBuyerAt"]=num(draft,"gameMs")+delay;
 }
 chat["pid"]=nullptr;chat["met"]=false;state.swap(draft);return true;
}

}
