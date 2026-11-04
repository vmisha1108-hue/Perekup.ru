#pragma once
#include "buyer_offers.hpp"
#include "bank.hpp"
#include <regex>
namespace perekup {
inline double nativeCollectorBuyerFactor(const Json& state){
 double oldest=num(state,"gameMs"),now=oldest;bool overdue=false;
 for(const auto& l:state.at("bank").at("loans"))if(Bank::overdueCents(l)>0&&l.contains("overdueAt")&&l["overdueAt"].is_number()&&now-num(l,"overdueAt")>=collectorGrace){oldest=std::min(oldest,num(l,"overdueAt"));overdue=true;}
 if(!overdue)return 1;double days=std::floor((now-oldest)/day);return days>=180?3:days>=120?2:1.5;
}
inline double nativeCareerBuyerFactor(const Json& state,const Json& car){
 const auto& c=state.at("career");double rep=num(c,"reputation",50),factor=rep>=75?.85:rep<35?1.3:1;
 if(c.value("assistant",false))factor*=.75;
 int cycle=int(num(c,"cycle"))%6;bool segment=false;
 if(cycle==3)segment=basePrice(car)<=300000;
 if(cycle==1){auto body=car.value("body","");auto name=car.value("name","");segment=body.find("кроссовер")!=std::string::npos||body.find("внедорожник")!=std::string::npos||std::regex_search(name,std::regex("RAV4|Duster|Land Cruiser|Tiguan|Sportage|CR-V|Forester|Outlander|Haval|Chery Tiggo|CX-|X5|X7|X-Trail|Патриот",std::regex::icase));}
 return factor*(segment?.8:1.);
}
inline double nativeListingDelay(const Json& state,const Json& car,const Json& listing,double draw){return nextNativeBuyerDelay(listing,draw,nativeCollectorBuyerFactor(state),nativeCareerBuyerFactor(state,car));}
}
