#include "session.hpp"
#include "career.hpp"
#include "buyer_offers.hpp"
#include "sell_chat.hpp"
#include "meeting_session.hpp"
#include "contract_signing.hpp"
#include <iostream>
#define CHECK(x) do {if(!(x))throw std::runtime_error("Sale journey line "+std::to_string(__LINE__));}while(false)
int main(){using namespace perekup;
 Json car={{"id",1},{"name","Автомобиль"},{"price",50000},{"cityId","away"},{"newCar",false}};
 Json cars={{"1",car}},cities={{"home",{{"id","home"},{"name","Москва"}}},{"away",{{"id","away"},{"name","Алдан"}}}};
 auto root=fs::temp_directory_path()/("perekup-repair-sale-"+std::to_string(std::chrono::steady_clock::now().time_since_epoch().count()));
 auto random=[](){return .9;};auto delay=[](const Json&){return 60000.;};
 try {
 {Session s(root,cities,cars,"home");s.create("Игрок","TEST",3600000);auto state=s.state;
  // Fixture: a previously bought vehicle has already been transported home.
  state["garage"]=Json::array({1});state["purchasePrices"]["1"]=50000;
  Transport t(cities,cars,"home");t.state=state["transport"];t.garage=state["garage"];t.park(1,"home",3600000);state["transport"]=t.state;
  CHECK(prepareNativeCar(state,cars,1,"inspect",[](const Json&){}));
  CHECK(prepareNativeCar(state,cars,1,"prepare",[](const Json&){}));
  CHECK(state["purchasePrices"]["1"]==57500);
  CHECK(postNativeListing(state,car,70000,true,[](Money){return false;},delay));
  state["gameMs"]=3800000;int n=0;NativeBuyerHooks hooks;hooks.random=[](){return .3;};hooks.newId=[&](){return "buyer"+std::to_string(++n);};hooks.delay=delay;hooks.moving=[](Money){return false;};hooks.tuningEffect=[](const Json&,const Json&){return Json{{"amount",0},{"text",""}};};
  CHECK(tickNativeListings(state,cars,Json::array(),hooks));CHECK(state["pending"].size()==3);
  CHECK(beginNativeSellChat(state,car,"buyer1")=="opened");
  CHECK(negotiate(state["chat"],90000,100000,random).action=="counter");CHECK(state["chat"]["bid"]==73500);
  CHECK(beginNativeSellChat(state,car,"buyer2")=="opened");CHECK(state["chat"]["bid"]==70000);
  state["chat"]["log"].push_back("Вторая беседа");rememberNativeChat(state);s.commit(state);
 }
 {Session s(root,cities,cars,"home");CHECK(s.load().status==LoadStatus::Loaded);auto state=s.state;
  CHECK(beginNativeSellChat(state,car,"buyer1")=="restored");CHECK(state["chat"]["bid"]==73500&&state["chat"]["log"].empty());
  CHECK(beginNativeSellChat(state,car,"buyer2")=="restored");CHECK(state["chat"]["log"].size()==1&&state["chat"]["bid"]==70000);
  CHECK(beginNativeSellChat(state,car,"buyer1")=="restored");CHECK(negotiate(state["chat"],73500,100000,random).action=="agreed");
  CHECK(scheduleNativeMeeting(state,5400000,30,"sale-meet","Встреча",random,delay)=="accepted");rememberNativeChat(state);
  CHECK(state["pending"].size()==1&&state["chatStore"].size()==1);CHECK(state["chatStore"].contains("sell:1:sale-meet"));
  auto before=state;CHECK(beginNativeSellChat(state,car,"buyer2")=="meeting-pending"&&state==before);s.commit(state);
 }
 {Session s(root,cities,cars,"home");CHECK(s.load().status==LoadStatus::Loaded);auto state=s.state;state["gameMs"]=5400000;
  CHECK(enterNativeMeeting(state,"sale-meet",random)=="entered"); // car catalogue says away, actual vehicle is home.
  state["gameMs"]=9000000;CHECK(tickNativeMeeting(state,random,[](Json&,Money){throw std::runtime_error("Sale must not inspect as buyer");}));
  Meeting meeting(random);CHECK(meeting.agree(state["chat"],[](Money){return true;}));
  auto vehicle=contractDocumentIds(1,true);vehicle["name"]=car["name"];vehicle["year"]=2000;vehicle["color"]="белый";vehicle["description"]="Автомобиль";
  Json other={{"fullName","Покупатель"},{"passport","4501 123456"},{"address","Москва, дом 1"}};
  CHECK(beginContract(state["chat"],state["pending"][0],state["contracts"],state["playerIdentity"],cities["home"],vehicle,other,9000000));rememberNativeChat(state);s.commit(state);
 }
 {Session s(root,cities,cars,"home");CHECK(s.load().status==LoadStatus::Loaded);auto state=s.state;auto& contract=state["pending"][0]["contract"];
  fillContractAssist(contract,state["contracts"],state["playerIdentity"]);CHECK(contract["fields"]["signature"]=="");contract["acknowledged"]=true;contract["fields"]["signature"]="TEST";
  Deals deals(cities,cars,"home",random);auto before=state;bool failed=false;try{signContract(state,deals,cars,[](const Json&){throw std::runtime_error("Disk full");});}catch(...){failed=true;}CHECK(failed&&state==before);
  CHECK(signContract(state,deals,cars,[&](const Json& saved){s.commit(saved);}).empty());CHECK(s.state["balance"]==166000&&s.state["garage"].empty());CHECK(s.state["career"]["sales"]==1&&s.state["career"]["profit"]==16000);
 }
 {Session s(root,cities,cars,"home");CHECK(s.load().status==LoadStatus::Loaded);CHECK(s.state["listings"].empty()&&s.state["chatStore"].empty());CHECK(s.state["contracts"]["records"].size()==1);CHECK(s.state["contracts"]["records"][0]["costBreakdown"]["preparation"]==7500);CHECK(s.state["contracts"]["records"][0]["seller"]["fullName"]=="Игрок");auto before=s.state;Deals deals(cities,cars,"home",random);CHECK(!signContract(s.state,deals,cars,[](const Json&){throw std::runtime_error("Duplicate");}).empty());CHECK(s.state==before);}
 fs::remove_all(root);std::cout<<"PASS: diagnosis and repair included in sale DKP and profit, three buyers, independent chats, four restarts, relocated car, sale contract, profit, rollback and no duplicate payment\n";
 }catch(...){fs::remove_all(root);throw;}
}
