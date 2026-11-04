#pragma once
#include "transport.hpp"
namespace perekup {
struct DealResult {bool ok=false;std::string error;Json state;Json effects=Json::array();};
// Plans the entire ownership/cash mutation on a copy. Career/contracts must apply
// effects to that copy before commit; callers cannot partially mutate live state.
class Deals {
 Json cities_,cars_;std::string home_;std::function<double()> rng_;
 static std::string key(Money id){return std::to_string(id);}
 static bool contains(const Json& a,Money id){return std::find(a.begin(),a.end(),Json(id))!=a.end();}
 static void eraseId(Json& a,Money id){a.erase(std::remove(a.begin(),a.end(),Json(id)),a.end());}
public:
 Deals(Json cities,Json cars,std::string home,std::function<double()> rng):cities_(std::move(cities)),cars_(std::move(cars)),home_(std::move(home)),rng_(std::move(rng)){}
 Json fresh(double now){Bank b(rng_);Transport t(cities_,cars_,home_);return {{"balance",100000},{"bank",b.state},{"garage",Json::array()},{"transport",t.state},{"purchasePrices",Json::object()},{"listings",Json::object()},{"retiredMarketCars",Json::array()},{"pending",Json::array()},{"chatStore",Json::object()},{"marketRisks",{{"version",1},{"vehicles",Json::object()},{"seizures",Json::array()},{"notice",nullptr}}},{"deals",0},{"gameMs",now},{"garageCapacity",1}};}
 DealResult plan(const Json& original,const std::string& mode,Money id,Money price,Money incomingId=0,Money incomingValue=0,bool privateMarket=true){
 DealResult result;auto fail=[&](const char* message){result.error=message;return result;};
 if(mode!="buy"&&mode!="sell"&&mode!="trade")return fail("unknown-mode");
 if(price<1||price>safeInteger)return fail("invalid-price");
 if(!cars_.contains(key(id)))return fail("unknown-car");
 if(original.at("marketRisks").at("seizures").size()>=5)return fail("game-over");
 Json s=original;const auto& car=cars_.at(key(id));auto& garage=s["garage"];
 if(mode=="buy"?(contains(garage,id)||contains(s["retiredMarketCars"],id)):!contains(garage,id))return fail("ownership-changed");
 Bank bank(rng_);bank.balance=s.at("balance");bank.state=s.at("bank");bank.now=num(s,"gameMs");
 Transport t(cities_,cars_,home_);t.state=s.at("transport");t.garage=garage;t.capacity=s.value("garageCapacity",1);t.now=bank.now;t.balance=[&]{return bank.balance;};t.spend=[&](Money n,const std::string& label){return bank.changeBalance(-n,label,"expense",bank.now);};
 if(!t.state["trip"].is_null())return fail("player-in-transit");
 std::string location=car.value("cityId",home_);if(mode!="buy"){auto v=t.vehicle(id);if(!v||t.moving(id))return fail("car-unavailable");location=(*v)["cityId"];}
 if(location!=t.state["cityId"])return fail("wrong-city");
 auto retire=[&](Money value){if(!contains(s["retiredMarketCars"],value))s["retiredMarketCars"].push_back(value);};
 auto removeOffers=[&](Money value,Money incoming){auto& pending=s["pending"];std::vector<std::string> deleted;pending.erase(std::remove_if(pending.begin(),pending.end(),[&](const Json& p){bool match=p.value("type","")=="ad"&&(p.value("carId",0LL)==value||(incoming&&p.contains("trade")&&p["trade"].is_object()&&p["trade"].value("carId",0LL)==incoming));if(match)deleted.push_back(p.value("id",""));return match;}),pending.end());for(auto it=s["chatStore"].begin();it!=s["chatStore"].end();){if((it.value().value("mode","")=="sell"&&it.value().value("carId",0LL)==value)||std::find(deleted.begin(),deleted.end(),it.value().value("pid",""))!=deleted.end())it=s["chatStore"].erase(it);else ++it;}};
 auto cost=[&]{return s["purchasePrices"].contains(key(id))?s["purchasePrices"][key(id)].get<Money>():Money(basePrice(car));};
 auto effect=[&](const std::string& type){result.effects.push_back({{"type",type},{"carId",id}});};
 if(mode=="buy"){
  if(!bank.changeBalance(-price,"Покупка автомобиля: "+car.value("name",""),"expense",bank.now))return fail("insufficient-funds");
  garage.push_back(id);t.garage=garage;retire(id);t.park(id,location,bank.now);s["purchasePrices"][key(id)]=price;
  if(privateMarket){auto& risks=s["marketRisks"];auto& vehicles=risks["vehicles"];if(!vehicles.contains(key(id)))vehicles[key(id)]=rollMarketRisk(car,rng_);auto& risk=vehicles[key(id)];
   if(!risk.value("purchased",false)){risk["purchased"]=true;Money picker=risk.value("pickerPaid",0LL);s["purchasePrices"][key(id)]=price+picker;if(picker)result.effects.push_back({{"type","preparation-paid"},{"carId",id},{"amount",picker}});
    if(risk.value("stolen",false)){eraseId(garage,id);t.garage=garage;t.remove(id);s["purchasePrices"].erase(key(id));s["listings"].erase(key(id));risks["seizures"].push_back({{"carId",id},{"when",bank.now},{"loss",price+picker}});risks["notice"]=id;effect("seized");}
    else if(risk.value("defect",false))risk["discovered"]=true;
   }
  }effect("bought");
 }else{
  t.tick();Money owed=t.debt(id),basis=cost();bool disclosed=!s["listings"].contains(key(id))||s["listings"][key(id)].value("disclosed",true);
  Money difference=price,incomingCost=0,recognizedCost=basis;
  if(mode=="trade"){
   if(incomingValue<1||incomingValue>safeInteger||!cars_.contains(key(incomingId))||contains(garage,incomingId))return fail("invalid-exchange");
   difference=price-incomingValue;incomingCost=std::max<Money>(1,basis-difference);recognizedCost=price-(difference+incomingCost-basis);
  }
  if(difference>safeInteger-bank.balance||difference< -bank.balance||owed>bank.balance+difference)return fail("insufficient-funds-or-overflow");
  auto label=mode=="trade"?"Доплата при обмене: "+car.value("name","")+" → "+cars_.at(key(incomingId)).value("name",""):"Продажа автомобиля: "+car.value("name","");
  if(difference&&!bank.changeBalance(difference,label,mode=="trade"?"trade":"sale",bank.now))return fail("payment-rejected");
  if(!t.payDebt(id))return fail("parking-payment-rejected");
  result.effects.push_back({{"type","sold"},{"carId",id},{"price",price},{"cost",recognizedCost},{"disclosed",disclosed}});retire(id);
  if(mode=="trade"){*std::find(garage.begin(),garage.end(),Json(id))=incomingId;retire(incomingId);effect("bought");result.effects.back()["carId"]=incomingId;}else eraseId(garage,id);
  t.garage=garage;t.remove(id);if(mode=="trade")t.park(incomingId,t.state["cityId"],bank.now);
  s["purchasePrices"].erase(key(id));if(mode=="trade")s["purchasePrices"][key(incomingId)]=incomingCost;s["listings"].erase(key(id));removeOffers(id,mode=="trade"?incomingId:0);
 }
 s["balance"]=bank.balance;s["bank"]=bank.state;s["transport"]=t.state;s["deals"]=s.value("deals",0LL)+1;result.state=std::move(s);result.ok=true;return result;
 }
 // Persistence and the game-specific effects are required, never optional.
 static void commit(Json& live,DealResult result,const std::function<void(Json&,const Json&)>& applyEffects,const std::function<void(const Json&)>& persist){if(!result.ok)throw std::invalid_argument("Cannot commit rejected deal");applyEffects(result.state,result.effects);persist(result.state);live.swap(result.state);}
};
}
