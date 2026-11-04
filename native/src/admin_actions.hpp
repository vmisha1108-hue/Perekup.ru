#pragma once
#include "garage_upgrades.hpp"
namespace perekup {
inline bool nativeAdminMoney(Json& state,const std::string& mode,Money amount,const std::function<void(const Json&)>& persist){
 if(amount<0||(amount==0&&mode!="set")||(mode!="add"&&mode!="sub"&&mode!="set"))return false;
 if(state.at("marketRisks").at("seizures").size()>=5)return false;
 constexpr Money limit=1000000000000000LL;
 Json draft=state;Bank bank([]{return .5;});bank.state=draft.at("bank");bank.balance=draft.at("balance");bank.now=num(draft,"gameMs");
 Money target=mode=="set"?std::min(limit,amount):mode=="sub"?std::max<Money>(0,bank.balance-std::min(amount,bank.balance)):bank.balance>=limit?limit:bank.balance+std::min(amount,limit-bank.balance);
 auto label=mode=="add"?"Администратор: пополнение":mode=="sub"?"Администратор: списание":"Администратор: новый баланс";
 if(!bank.changeBalance(target-bank.balance,label,"admin",bank.now))return false;
 draft["balance"]=bank.balance;draft["bank"]=bank.state;persist(draft);state.swap(draft);return true;
}
inline bool nativeAdminGarage(Json& state,int level,const Json& cities,const Json& cars,const std::string& home,const std::function<void(const Json&)>& persist){
 static const int capacities[]={1,5,8,12,20};if(level<0||level>=5)return false;
 Json draft=state;Transport transport(cities,cars,home);transport.state=draft.at("transport");transport.garage=draft.at("garage");transport.capacity=capacities[level]+careerGarageBonus(draft);transport.rebalance();draft["garageLevel"]=level;draft["garageCapacity"]=transport.capacity;draft["transport"]=transport.state;persist(draft);state.swap(draft);return true;
}
}
