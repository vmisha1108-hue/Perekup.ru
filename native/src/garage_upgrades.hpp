#pragma once
#include "transport.hpp"
namespace perekup {
inline constexpr int garagePlaces[]={1,5,8,12,20};
inline constexpr Money garagePrices[]={0,300000,800000,2000000,5000000};
inline const char* garageName(int level){static const char* names[]={"Гараж «Стартовый»","Гараж «Расширенный»","Гараж «Профи»","Гараж «Ангар»","Автопарк «Империя»"};return level>=0&&level<5?names[level]:"";}
inline int careerGarageBonus(const Json& state){static const int bonus[]={0,2,5,10};if(!state.contains("career"))return 0;int level=state.at("career").value("level",0);return level>=0&&level<4?bonus[level]:0;}
inline int nativeGarageLevel(const Json& state){if(state.contains("garageLevel"))return state.at("garageLevel").get<int>();int cap=state.value("garageCapacity",1)-careerGarageBonus(state);for(int i=0;i<5;++i)if(cap==garagePlaces[i])return i;return -1;}
inline bool buyNativeGarage(Json& state,int level,const Json& cities,const Json& cars,const std::string& home,const std::function<void(const Json&)>& persist){
 if(level<1||level>=5||nativeGarageLevel(state)!=level-1||state.at("marketRisks").at("seizures").size()>=5)return false;
 Json draft=state;Bank bank([]{return .5;});bank.state=draft.at("bank");bank.balance=draft.at("balance");bank.now=num(draft,"gameMs");
 if(!bank.changeBalance(-garagePrices[level],std::string("Расширение гаража: ")+garageName(level),"expense",bank.now))return false;
 Transport transport(cities,cars,home);transport.state=draft.at("transport");transport.garage=draft.at("garage");transport.capacity=garagePlaces[level]+careerGarageBonus(draft);transport.rebalance();
 draft["bank"]=bank.state;draft["balance"]=bank.balance;draft["garageLevel"]=level;draft["garageCapacity"]=transport.capacity;draft["transport"]=transport.state;persist(draft);state.swap(draft);return true;
}
}
