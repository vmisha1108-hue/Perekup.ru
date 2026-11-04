#include "session.hpp"
#include "career.hpp"
#include <cassert>
#include <iostream>
using namespace perekup;
int main(){Json cities={{"home",{{"id","home"},{"name","Москва"}}}},cars={{"1",{{"id",1},{"name","Тест"},{"price",50000},{"cityId","home"}}}};auto root=fs::temp_directory_path()/("perekup-diagnosis-"+std::to_string(std::chrono::steady_clock::now().time_since_epoch().count()));try{
 {Session session(root,cities,cars,"home");session.create("Игрок","TEST",1000000);auto s=session.state;s["garage"]=Json::array({1});s["purchasePrices"]["1"]=50000;Transport t(cities,cars,"home");t.garage=s["garage"];t.park(1,"home",1000000);s["transport"]=t.state;
 // A snapshot produced by the previous build after signing the purchase DKP.
 Json meet={{"id","old-buy"},{"type","meet"},{"mode","buy"},{"carId",1},{"contract",{{"id","dkp-old-buy"}}}};
 s["pending"].push_back(meet);s["contracts"]["records"].push_back({{"id","dkp-old-buy"},{"mode","buy"},{"carId",1}});s["chat"]={{"pid","old-buy"},{"done",true},{"met",true},{"stage","done"}};s["chatStore"]["buy:1"]=s["chat"];
 assert(!careerLocalCar(s,1));auto unrelated=s;unrelated["contracts"]["records"][0]["id"]="unrelated";assert(!releaseSignedMeetings(unrelated));assert(!careerLocalCar(unrelated,1));session.commit(s);}
 {Session session(root,cities,cars,"home");assert(session.load().status==LoadStatus::Loaded);auto s=session.state;assert(s["pending"].empty()&&s["chatStore"].empty()&&s["chat"]["pid"].is_null());assert(careerLocalCar(s,1));assert(prepareNativeCar(s,cars,1,"inspect",[&](const Json& saved){session.commit(saved);}));assert(s["balance"]==98500&&s["purchasePrices"]["1"]==51500);assert(!prepareNativeCar(s,cars,1,"inspect",[](const Json&){}));auto active=s;active["pending"].push_back({{"id","new-sale"},{"type","meet"},{"mode","sell"},{"carId",1}});assert(!releaseSignedMeetings(active)&&!careerLocalCar(active,1));assert(!careerCarBlockReason(active,1).empty());}
 {Session s(root,cities,cars,"home");assert(s.load().status==LoadStatus::Loaded);assert(s.state["pending"].empty()&&s.state["career"]["vehicles"]["1"]["inspected"]==true&&s.state["balance"]==98500);}
 fs::remove_all(root);std::cout<<"PASS old signed meeting recovered, active meetings preserved, diagnosis available and durable, no repeated charge\n";}catch(...){fs::remove_all(root);throw;}}
