#pragma once
#include "market.hpp"
namespace perekup {
inline Json freshCareer(double now){return {{"version",1},{"level",0},{"sales",0},{"profit",0},{"reputation",50},{"assistant",false},{"startedAt",now},{"cycle",0},{"sequence",0},{"orders",Json::array()},{"clients",Json::object()},{"vehicles",Json::object()},{"complaints",Json::array()},{"news",Json::array()},{"tutorial",Json::object()},{"revision",0}};}
inline std::uint32_t historySeed(Money id){std::uint32_t h1=0xdeadbeef,h2=0x41c6ce57;for(unsigned char c:std::string("car-history:")+std::to_string(id)){h1=(h1^c)*2654435761u;h2=(h2^c)*1597334677u;}return (h1^(h1>>16))*2246822507u^(h2^(h2>>13))*3266489909u;}
inline Json& careerVehicle(Json& career,Money id){auto k=std::to_string(id);if(!career["vehicles"].contains(k))career["vehicles"][k]={{"inspected",false},{"repaired",false},{"repairPaid",0}};return career["vehicles"][k];}
inline void careerStep(Json& career,const std::string& step){if(!career["tutorial"].value(step,false)){career["tutorial"][step]=true;career["revision"]=num(career,"revision")+1;}}
inline void applyCareerDealEffects(Json& state,const Json& effects,const Json& cars){
 auto& career=state.at("career");
 for(const auto& e:effects){auto type=e.value("type","");Money id=e.at("carId");const auto& car=cars.at(std::to_string(id));
 if(type=="bought"){careerStep(career,"bought");continue;}if(type=="seized")continue;
 auto& vehicle=careerVehicle(career,id);
 if(type=="preparation-paid"){vehicle["repairPaid"]=num(vehicle,"repairPaid")+num(e,"amount");continue;}
 if(type!="sold")throw std::invalid_argument("Unknown career deal effect");
 bool defect=false;Money repair=0;
 if(!car.value("newCar",false)){
  if((car.value("expanded",false)||car.value("aldanNew",false)||car.value("blagNew",false))&&car.contains("story")){defect=!car["story"].value("defect","").empty();repair=Money(num(car["story"],"repair"));}
  else{defect=basePrice(car)<=100000||historySeed(id)%5==0;repair=defect?Money(std::max(6000.,std::min(90000.,jsRound(basePrice(car)*.07/500)*500))):0;}
 }
 auto text=lowerCatalogue(car.value("desc","")+" "+car.value("full",""));bool known=(vehicle.value("inspected",false)||text.find("проект")!=std::string::npos||text.find("ремонт")!=std::string::npos||text.find("восстанов")!=std::string::npos)&&defect&&!vehicle.value("repaired",false);
 const auto& risks=state.at("marketRisks").at("vehicles");bool mechanical=false;Money mechanicalCost=0;auto it=risks.find(std::to_string(id));if(it!=risks.end()){const auto& r=*it;mechanical=r.value("purchased",false)&&r.value("defect",false)&&r.value("discovered",false)&&!r.value("repaired",false);if(mechanical)mechanicalCost=Money(num(r,"repairCost"));}
 bool hidden=!e.value("disclosed",true)&&(mechanical||known);Money price=e.at("price"),cost=e.at("cost");career["sales"]=num(career,"sales")+1;career["profit"]=num(career,"profit")+price-cost;career["reputation"]=std::clamp(num(career,"reputation")+(hidden?-10:3),0.,100.);
 if(hidden){Money amount=std::min((known?repair:0)+mechanicalCost,std::max<Money>(1000,Money(jsRound(price*.1))));Money sequence=Money(num(career,"sequence"))+1;career["sequence"]=sequence;career["complaints"].push_back({{"id","claim-"+std::to_string(sequence)},{"text","Покупатель "+car.value("name","")+" обнаружил известные вам недостатки, не указанные в объявлении."},{"amount",amount},{"paid",false}});}
 careerStep(career,"sold");career["revision"]=num(career,"revision")+1;
 }
}
}
