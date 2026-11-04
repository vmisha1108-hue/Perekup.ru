#pragma once
#include "chat_store.hpp"
namespace perekup {
inline Json nativeDealInbox(const Json& state){
 Json result={{"listings",Json::array()},{"incoming",Json::array()},{"outgoing",Json::array()}};
 Json chats=state.value("chatStore",Json::object());
 if(state.contains("chat")&&state["chat"].is_object()&&state["chat"].contains("car")){
  const auto& c=state["chat"];auto pid=c.contains("pid")&&c["pid"].is_string()?c["pid"].get<std::string>():std::string();
  chats[nativeChatKey(c.value("mode","buy"),c["car"].value("id",0LL),pid)]=c;
 }
 const auto pending=state.value("pending",Json::array());
 for(const auto& listing:state.value("listings",Json::object())){
  auto id=listing.value("carId",0LL);int count=0;bool meeting=false;
  for(const auto& p:pending)if(p.value("carId",0LL)==id){if(p.value("type","")=="ad"&&p.value("ready",false))++count;if(p.value("type","")=="meet")meeting=true;}
  result["listings"].push_back({{"carId",id},{"amount",listing.value("price",0LL)},{"responses",count},{"meeting",meeting}});
 }
 for(const auto& p:pending){
  auto kind=p.value("type","");if(p.value("mode","")!="sell"||(kind!="ad"&&kind!="meet")||(kind=="ad"&&!p.value("ready",false)))continue;
  auto id=p.value("carId",0LL);auto pid=p.value("id","");auto key=nativeChatKey("sell",id,pid);Json log=Json::array();
  if(chats.contains(key))log=chats[key].value("log",Json::array());
  result["incoming"].push_back({{"carId",id},{"id",pid},{"npc",p.value("npc",Json::object())},{"amount",num(p,kind=="meet"?"price":"bid")},{"stage",kind=="meet"?"go":log.empty()?"response":"talk"},{"when",num(p,"when")},{"log",log}});
 }
 Json byCar=Json::object();
 for(const auto& c:chats)if(c.is_object()&&c.value("mode","")=="buy"&&c.contains("car")){
  auto id=c["car"].value("id",0LL);auto pid=c.contains("pid")&&c["pid"].is_string()?c["pid"].get<std::string>():std::string();
  byCar[std::to_string(id)]={{"carId",id},{"id",pid},{"npc",c.value("npc",Json::object())},{"amount",num(c,"price",num(c,"ask"))},{"stage",c.value("stage","talk")},{"done",c.value("done",false)},{"log",c.value("log",Json::array())},{"when",0}};
 }
 for(const auto& p:pending)if(p.value("type","")=="meet"&&p.value("mode","")=="buy"){
  auto id=p.value("carId",0LL);auto key=std::to_string(id);
  if(!byCar.contains(key))byCar[key]={{"carId",id},{"npc",p.value("npc",Json::object())},{"log",Json::array()},{"done",false}};
  auto& row=byCar[key];row["id"]=p.value("id","");row["stage"]="go";row["amount"]=num(p,"price");row["when"]=num(p,"when");
 }
 for(const auto& row:byCar)result["outgoing"].push_back(row);
 return result;
}
}
