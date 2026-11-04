#include "deals.hpp"
#include "career_sales.hpp"
#include <iostream>
#define CHECK(...) do {if(!(__VA_ARGS__))throw std::runtime_error("check failed at line "+std::to_string(__LINE__));}while(false)
int main(){using namespace perekup;
 Json cities={{"home",{{"id","home"},{"name","Москва"},{"lat",55},{"lon",37}}}},cars=Json::object();for(int id:{1,2,3})cars[std::to_string(id)]={{"id",id},{"cityId","home"},{"name","Автомобиль "+std::to_string(id)},{"price",50000},{"basePrice",50000},{"desc","На ходу"}};
 Deals engine(cities,cars,"home",[]{return .9;});auto live=engine.fresh(1000000),initial=live;
 auto buy=engine.plan(live,"buy",1,50000);CHECK(buy.ok&&live==initial);CHECK(buy.state["balance"]==50000&&buy.state["garage"]==Json::array({1}));CHECK(buy.state["transport"]["vehicles"]["1"]["place"]=="garage");
 bool threw=false;try{Deals::commit(live,buy,[](Json&,const Json&){},[](const Json&){throw std::runtime_error("disk failure");});}catch(...){threw=true;}CHECK(threw&&live==initial);
 Json written;Deals::commit(live,buy,[](Json& s,const Json& effects){s["appliedEffects"]=effects;},[&](const Json& s){written=s;});CHECK(written==live);CHECK(!engine.plan(live,"buy",1,50000).ok);CHECK(!engine.plan(live,"buy",2,50001).ok);
 auto sell=engine.plan(live,"sell",1,70000);CHECK(sell.ok&&sell.state["balance"]==120000&&sell.state["garage"].empty());CHECK(sell.effects[0]["cost"]==50000);CHECK(sell.state["deals"]==2);CHECK(sell.state["purchasePrices"].empty());
 auto trade=engine.plan(live,"trade",1,70000,2,90000);CHECK(trade.ok&&trade.state["balance"]==30000&&trade.state["garage"]==Json::array({2}));CHECK(trade.state["purchasePrices"]["2"]==70000);CHECK(trade.effects[0]["cost"]==70000);
 CHECK(!engine.plan(live,"trade",1,50000,2,200000).ok);CHECK(!engine.plan(live,"trade",1,50000,1,50000).ok);
 auto indebted=live;indebted["transport"]["vehicles"]["1"]["debt"]=130000;CHECK(!engine.plan(indebted,"sell",1,70000).ok);indebted["transport"]["vehicles"]["1"]["debt"]=10000;auto paid=engine.plan(indebted,"sell",1,70000);CHECK(paid.ok&&paid.state["balance"]==110000);
 auto overflow=live;overflow["balance"]=safeInteger;CHECK(!engine.plan(overflow,"sell",1,1).ok);
 Deals risky(cities,cars,"home",[]{return .01;});auto seized=risky.plan(initial,"buy",1,50000);CHECK(seized.ok&&seized.state["garage"].empty()&&seized.state["balance"]==50000);CHECK(seized.state["marketRisks"]["seizures"].size()==1);CHECK(seized.state["marketRisks"]["seizures"][0]["loss"]==50000);
 auto over=initial;for(int i=0;i<5;i++)over["marketRisks"]["seizures"].push_back({{"carId",i}});CHECK(!engine.plan(over,"buy",1,50000).ok);
 auto trip=live;trip["transport"]["trip"]={{"to","home"}};CHECK(!engine.plan(trip,"sell",1,50000).ok);
 auto careerSale=sell.state;careerSale["career"]=freshCareer(1000000);applyCareerDealEffects(careerSale,sell.effects,cars);CHECK(careerSale["career"]["sales"]==1&&careerSale["career"]["profit"]==20000&&careerSale["career"]["reputation"]==53);
 auto hidden=live;hidden["listings"]["1"]={{"disclosed",false}};hidden["marketRisks"]["vehicles"]["1"]["defect"]=true;hidden["marketRisks"]["vehicles"]["1"]["discovered"]=true;hidden["marketRisks"]["vehicles"]["1"]["repairCost"]=18000;auto hiddenSale=engine.plan(hidden,"sell",1,70000);hiddenSale.state["career"]=freshCareer(1000000);applyCareerDealEffects(hiddenSale.state,hiddenSale.effects,cars);CHECK(hiddenSale.state["career"]["reputation"]==40);CHECK(hiddenSale.state["career"]["complaints"][0]["amount"]==7000);
 std::cout<<"PASS: buy/sell/trade money and ownership, debt, overflow, stolen car, game-over, duplicate purchase, atomic commit failure\n";
}
