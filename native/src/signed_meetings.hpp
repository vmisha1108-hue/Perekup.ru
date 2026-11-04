#pragma once
#include "market.hpp"
namespace perekup {
// A signed contract is durable proof that this particular meeting has finished.
// Do not infer completion from car ownership: a later sale meeting may be active.
inline bool releaseSignedMeetings(Json& state){
 if(!state.contains("contracts")||!state["contracts"].contains("records")||!state.contains("pending"))return false;
 std::vector<std::string> completed;
 auto& pending=state["pending"];
 pending.erase(std::remove_if(pending.begin(),pending.end(),[&](const Json& p){
  if(p.value("type","")!="meet"||!p.contains("contract")||!p["contract"].is_object())return false;
  const auto& draft=p["contract"];if(draft.value("id","").empty())return false;for(const auto& record:state["contracts"]["records"])
   if(record.value("id","")==draft.value("id","")&&record.value("carId",0LL)==p.value("carId",0LL)&&record.value("mode","")==p.value("mode","")){
    completed.push_back(p.value("id",""));return true;
   }
  return false;
 }),pending.end());
 if(completed.empty())return false;
 auto matches=[&](const Json& chat){return chat.is_object()&&chat.contains("pid")&&chat["pid"].is_string()&&std::find(completed.begin(),completed.end(),chat["pid"].get<std::string>())!=completed.end();};
 if(state.contains("chatStore"))for(auto it=state["chatStore"].begin();it!=state["chatStore"].end();)if(matches(it.value()))it=state["chatStore"].erase(it);else ++it;
 if(state.contains("chat")&&matches(state["chat"])){state["chat"]["done"]=true;state["chat"]["stage"]="done";state["chat"]["pid"]=nullptr;state["chat"]["met"]=false;}
 return true;
}
}
