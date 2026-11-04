#include "buyer_offers.hpp"
#include <iostream>
#define CHECK(x) do { if(!(x)) throw std::runtime_error("buyer test line " + std::to_string(__LINE__)); } while(false)
int main(int argc,char**) {
 using namespace perekup;
 if(argc>1) {std::string line;while(std::getline(std::cin,line)){auto q=Json::parse(line);std::size_t pos=0;auto draw=[&](){return q.at("draws").at(pos++).get<double>();};NativeBuyerHooks h;h.random=draw;h.newId=[](){return "offer";};h.tuningEffect=[&](const Json&,const Json&){return q.at("effect");};auto l=q.at("listing");auto offer=makeNativeBuyerOffer(l,q.at("car"),q.at("trades"),q.at("state"),1234,h);std::cout<<Json({{"offer",offer},{"listing",l},{"drawCount",pos}}).dump()<<'\n';}return 0;}
 Json cars={{"1",{{"id",1},{"price",100000}}}};
 Json state={{"gameMs",1000000},{"garage",Json::array({1})},{"pending",Json::array()},
 {"listings",{{"1",{{"carId",1},{"price",100000},{"purchasePrice",80000},{"nextBuyerAt",0}}}}}};
 int sequence=0;NativeBuyerHooks h;h.random=[](){return .6;};h.newId=[&](){return "p"+std::to_string(++sequence);};h.tuningEffect=[](const Json&,const Json&){return Json{{"amount",0},{"text",""}};};h.delay=[](const Json&){return 60000.;};h.moving=[](Money){return false;};Json trades=Json::array({{{"id",2},{"marketPrice",90000}}});
 CHECK(tickNativeListings(state,cars,trades,h));CHECK(state["pending"].size()==3);CHECK(state["pending"][0]["trade"]["carId"]==2);CHECK(state["pending"][1]["trade"].is_null());CHECK(state["pending"][0]["npc"]["name"]!=state["pending"][1]["npc"]["name"]);CHECK(state["listings"]["1"]["nextBuyerAt"]==1060000);
 CHECK(!tickNativeListings(state,cars,trades,h));
 state["gameMs"]=2000000;auto before=state;h.delay=[](const Json&)->double{throw std::runtime_error("failure");};bool failed=false;try{tickNativeListings(state,cars,trades,h);}catch(...){failed=true;}CHECK(failed&&state==before);
 h.delay=[](const Json&){return 60000.;};h.moving=[](Money){return true;};CHECK(!tickNativeListings(state,cars,trades,h)&&state==before);
 h.moving=[](Money){return false;};state["pending"].push_back({{"type","meet"},{"carId",1}});before=state;CHECK(!tickNativeListings(state,cars,trades,h)&&state==before);
 state["pending"]=Json::array();h.newId=[](){return "duplicate";};before=state;failed=false;try{tickNativeListings(state,cars,trades,h);}catch(...){failed=true;}CHECK(failed&&state==before);
 state["garage"]=Json::array();CHECK(tickNativeListings(state,cars,trades,h)&&state["listings"].empty());
 std::cout<<"PASS: offer cap, nonrepeating buyers, exchange uniqueness, pause, cleanup and atomic rollback\n";
}
