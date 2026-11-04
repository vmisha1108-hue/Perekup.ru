#include "collectors.hpp"
#include <cassert>
#include <iostream>
int main(){using namespace perekup;Json initial={{"gameMs",30*day-1},{"bank",{{"loans",Json::array({{{"id","loan"},{"status","active"},{"kind","micro"},{"arrearsCents",10000},{"principalCents",10000},{"interestCents",0},{"feesCents",0},{"nextDueAt",nullptr},{"overdueAt",0}}})}}},{"pending",Json::array()},{"chatStore",Json::object()}};auto s=initial;tickNativeCollectors(s,[]{return 0.;});assert(!s["bank"]["collectors"]["active"]);s["gameMs"]=30*day;tickNativeCollectors(s,[]{return 0.;});assert(s["bank"]["collectors"]["active"]==true);s["gameMs"]=30*day+1800000;tickNativeCollectors(s,[]{return 0.;});assert(s["bank"]["collectors"]["call"]["minutes"]==15);auto before=s;bool failed=false;try{dismissNativeCollectorCall(s,[](Json&,Money){throw std::runtime_error("fail");},[]{return .5;});}catch(...){failed=true;}assert(failed&&s==before);int steps=0;assert(dismissNativeCollectorCall(s,[&](Json& d,Money next){d["gameMs"]=next;++steps;},[]{return .5;}));assert(steps==1&&s["bank"]["collectors"]["call"].is_null());s["bank"]["loans"][0]["status"]="paid";tickNativeCollectors(s,[]{return .5;});assert(s["bank"]["collectors"]["active"]==false);assert(s["bank"]["collectors"]["nextEventAt"].is_null());for(double event:{.5,.75,.9}){auto d=initial;d["gameMs"]=30*day;syncNativeCollectors(d);d["gameMs"]=30*day+1800000;
 d["pending"].push_back({{"id","buyer"},{"type","ad"},{"ready",true},{"npc",{{"name","Анна"}}}});
 d["pending"].push_back({{"id","meeting"},{"type","meet"},{"flow",{{"stage","waiting"},{"arrivalAt",1000},{"inspectionUntil",2000}}}});
 int draw=0;tickNativeCollectors(d,[&]{return ++draw==2?event:0.;});auto kind=d["bank"]["collectors"]["log"][0]["kind"];
 assert(kind==(event==.5?"message":event==.75?"buyer":"meeting"));
 if(event==.75)assert(d["pending"].size()==1);
 if(event==.9){assert(d["pending"][1]["flow"]["collectorDelayed"]==true);assert(d["pending"][1]["flow"]["arrivalAt"]==901000);}
 auto restored=Json::parse(d.dump());assert(restored==d);
 }
 std::cout<<"PASS collectors 30-day boundary, call duration, rollback and repayment stop\n";}
