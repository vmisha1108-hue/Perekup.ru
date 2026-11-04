#pragma once
#include "transport.hpp"
namespace perekup {
inline bool departPublicTransport(Json& state,const Json& cities,const Json& cars,const std::string& home,const std::string& target,const std::string& mode){
 if(mode!="train"&&mode!="plane"&&mode!="taxi")return false;
 Json draft=state;Bank bank([]{return .5;});bank.state=draft.at("bank");bank.balance=draft.at("balance");bank.now=num(draft,"gameMs");Transport transport(cities,cars,home);transport.state=draft.at("transport");transport.garage=draft.at("garage");transport.now=bank.now;transport.gameOver=draft.at("marketRisks").at("seizures").size()>=5;
 transport.physicalMeeting=draft.contains("chat")&&draft["chat"].is_object()&&draft["chat"].value("met",false)&&!draft["chat"].value("done",false);
 transport.balance=[&]{return bank.balance;};transport.spend=[&](Money amount,const std::string& label){return bank.changeBalance(-amount,label,"expense",bank.now);};
 if(!transport.depart(target,mode))return false;
 draft["transport"]=transport.state;draft["bank"]=bank.state;draft["balance"]=bank.balance;state.swap(draft);return true;
}
}
