#pragma once
#include "negotiation.hpp"
namespace perekup {
// Schedule into a staged game snapshot; UI commits both chat and pending list.
inline std::string scheduleNativeMeeting(Json& state,Money when,int localMinute,const std::string& id,const std::string& label,const std::function<double()>& random,const std::function<double(const Json&)>& buyerDelay={}){
 if(id.empty()||!state.contains("chat")||!state["chat"].is_object())return "inactive";
 if(state.at("marketRisks").at("seizures").size()>=5)return "game-over";
 for(const auto& pending:state.at("pending"))if(pending.value("id","")==id)return "duplicate-id";
 Json draft=state;auto& chat=draft["chat"];auto result=reserveMeetingSlot(chat,when,draft.at("gameMs"),localMinute,random);
 if(result!="accepted"){if(result=="busy")state.swap(draft);return result;}
 Money carId=chat.at("car").at("id");auto key=std::to_string(carId);auto previous=chat.contains("pid")&&chat["pid"].is_string()?chat["pid"].get<std::string>():std::string();
 auto& pending=draft["pending"];std::vector<std::string> removed;pending.erase(std::remove_if(pending.begin(),pending.end(),[&](const Json& p){bool remove=(!previous.empty()&&p.value("id","")==previous)||(chat.at("mode")=="sell"&&p.value("type","")=="ad"&&p.value("carId",0LL)==carId);if(remove)removed.push_back(p.value("id",""));return remove;}),pending.end());
 for(auto it=draft["chatStore"].begin();it!=draft["chatStore"].end();){const auto& c=it.value();if(std::find(removed.begin(),removed.end(),(c.contains("pid")&&c["pid"].is_string()?c["pid"].get<std::string>():std::string()))!=removed.end()||(chat.at("mode")=="sell"&&c.value("mode","")=="sell"&&c.value("carId",0LL)==carId))it=draft["chatStore"].erase(it);else ++it;}
 if(chat.at("mode")=="sell"&&draft["listings"].contains(key)){if(!buyerDelay)throw std::logic_error("Buyer delay not connected");draft["listings"][key]["nextBuyerAt"]=num(draft,"gameMs")+buyerDelay(draft["listings"][key]);}
 chat["meet"]={{"whenMs",when},{"label",label}};chat["note"]=nullptr;chat["pid"]=id;const auto& npc=chat.at("npc");pending.push_back({{"id",id},{"type","meet"},{"mode",chat.at("mode")},{"carId",carId},{"npc",{{"name",npc.at("name")},{"avatar",npc.at("avatar")},{"personality",npc.at("personality")},{"mood",npc.at("mood")}}},{"price",chat.at("price")},{"trade",chat.value("trade",Json(nullptr))},{"when",when},{"label",label},{"note",nullptr},{"reached",false},{"noShow",random()<.20},{"attendanceChecked",false}});chat["stage"]="go";state.swap(draft);return "accepted";
}
}
