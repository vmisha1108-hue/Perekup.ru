#include "session.hpp"
#include "meeting_session.hpp"
#include "trade_completion.hpp"
#include "contract_signing.hpp"
#include <iostream>
#define CHECK(x) do{if(!(x))throw std::runtime_error("Trade/cancel line "+std::to_string(__LINE__));}while(false)
int main(){using namespace perekup;Json car={{"id",1},{"price",50000},{"cityId","home"},{"newCar",true}},other={{"id",2},{"price",60000},{"cityId","away"},{"newCar",true}};Json cars={{"1",car},{"2",other}},cities={{"home",{{"id","home"}}}};Deals deals(cities,cars,"home",[]{return .9;});auto initial=deals.fresh(1000000);initial["career"]=freshCareer(1000000);initial["garage"]=Json::array({1});initial["purchasePrices"]["1"]=50000;Transport t(cities,cars,"home");t.garage=initial["garage"];t.park(1,"home",1000000);initial["transport"]=t.state;
 for(Money value:{60000,70000,80000}){
  auto state=initial;Json trade={{"carId",2},{"value",value}};
  state["chat"]={{"mode","sell"},{"car",car},{"pid","meet"},{"stage","event"},{"met",true},{"done",false},{"price",70000},{"event",nullptr},{"trade",trade}};
  state["pending"]=Json::array({{{"id","meet"},{"type","meet"},{"mode","sell"},{"carId",1},{"trade",trade}}});state["listings"]["1"]={{"price",70000},{"disclosed",true},{"nextBuyerAt",0}};rememberNativeChat(state);
  auto before=state;bool failed=false;try{completeNativeTrade(state,deals,cars,[](const Json&){throw std::runtime_error("Disk full");});}catch(...){failed=true;}CHECK(failed&&state==before);
  Json saved;CHECK(completeNativeTrade(state,deals,cars,[&](const Json& s){saved=s;})=="completed");CHECK(saved==state);CHECK(state["balance"]==100000+70000-value);CHECK(state["garage"]==Json::array({2}));CHECK(state["purchasePrices"]["2"]==50000-70000+value);CHECK(state["career"]["sales"]==1);CHECK(state["career"]["profit"]==0);CHECK(state["listings"].empty());before=state;CHECK(completeNativeTrade(state,deals,cars,[](const Json&){})=="inactive"&&state==before);
  CHECK(closeNativeSaleMeeting(state,false,[](const Json&)->double{throw std::runtime_error("No sold listing");}));CHECK(state["pending"].empty());
 }
 auto state=initial;state["chat"]={{"mode","sell"},{"car",car},{"pid","meet"},{"stage","waiting"},{"met",true},{"done",false}};state["pending"]=Json::array({{{"id","meet"},{"type","meet"},{"carId",1}}});state["listings"]["1"]={{"nextBuyerAt",0}};rememberNativeChat(state);auto before=state;CHECK(!closeNativeSaleMeeting(state,false,[](const Json&){return 60000.;})&&state==before);
 bool failed=false;try{closeNativeSaleMeeting(state,true,[](const Json&){return 0.;});}catch(...){failed=true;}CHECK(failed&&state==before);
 CHECK(closeNativeSaleMeeting(state,true,[](const Json&){return 60000.;}));CHECK(state["balance"]==before["balance"]&&state["garage"]==before["garage"]);CHECK(state["pending"].empty()&&state["chatStore"].empty());CHECK(state["listings"]["1"]["nextBuyerAt"]==1060000);
 state["chat"]["trade"]={{"carId",2},{"value",60000}};state["chat"]["stage"]="contract";state["chat"]["done"]=false;CHECK(!signContract(state,deals,cars,[](const Json&){throw std::runtime_error("Must not sell an exchange");}).empty());
 std::cout<<"PASS: exchange in both payment directions and without payment, rollback, cancellation, listing resumed, contract guard\n";
}
