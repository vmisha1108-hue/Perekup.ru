#pragma once
#include "transport.hpp"
namespace perekup {
inline bool garageTransportAction(Json& state,const Json& cities,const Json& cars,const std::string& home,Money id,bool ship){
 const auto key=std::to_string(id);if(!cars.contains(key))return false;
 Json draft=state;Bank bank([]{return .5;});bank.state=draft.at("bank");bank.balance=draft.at("balance");bank.now=num(draft,"gameMs");Transport transport(cities,cars,home);transport.state=draft.at("transport");transport.garage=draft.at("garage");transport.capacity=draft.value("garageCapacity",1);transport.now=bank.now;transport.gameOver=draft.at("marketRisks").at("seizures").size()>=5;
 if(transport.gameOver||!transport.owned(id))return false;
 // Listing suspension/resumption and workshop integration are not available yet.
 // Do not silently ship a vehicle with an active buyer or workshop operation.
 if(ship&&draft.at("listings").contains(key))return false;
 transport.meeting=[&](Money carId){for(const auto& p:draft.at("pending"))if(p.value("carId",0LL)==carId)return true;return false;};
 transport.balance=[&]{return bank.balance;};transport.spend=[&](Money amount,const std::string& label){return bank.changeBalance(-amount,label,"expense",bank.now);};
 transport.settle(id,transport.now);
 if(ship?!transport.ship(id):!transport.payDebt(id))return false;
 draft["transport"]=transport.state;draft["bank"]=bank.state;draft["balance"]=bank.balance;state.swap(draft);return true;
}
}
