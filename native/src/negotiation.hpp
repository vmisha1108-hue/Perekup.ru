#pragma once
#include "meeting.hpp"
namespace perekup {
struct Personality {double dMin,dMax,bMin,bMax;};
inline Personality personality(const std::string& id){if(id=="kind")return {.05,.20,0,.15};if(id=="evil")return {-.08,.04,-.20,-.02};return {-.02,.12,-.05,.05};}
inline Money sellerLimit(Json& chat,const std::function<double()>& random){auto p=personality(chat.at("npc").value("personality","neutral"));double d=p.dMin+(p.dMax-p.dMin)*num(chat["npc"],"mood")/100;Money reference=Money(num(chat,"referencePrice",num(chat,"ask")));if(!reference)reference=Money(num(chat,"ask"));if(!chat.contains("discountBudget")||!chat["discountBudget"].is_number_integer()||num(chat,"discountBudget")<0||num(chat,"discountBudget")>safeInteger)chat["discountBudget"]=negotiationDiscount(reference,random);Money discount=Money(std::max(0.,std::min(num(chat,"discountBudget"),std::floor(reference*d/500)*500)));return reference-discount;}
inline Money buyerLimit(const Json& chat){if(chat.contains("listingPrice")&&!chat["listingPrice"].is_null())return Money(std::max(num(chat,"bid"),num(chat,"maxBid")?num(chat,"maxBid"):num(chat,"bid")));auto p=personality(chat.at("npc").value("personality","neutral"));double b=p.bMin+(p.bMax-p.bMin)*num(chat["npc"],"mood")/100;return Money(jsRound(num(chat.at("car"),"price")*(1+b)));}
struct OfferResult {std::string action;Money price=0;};
inline std::string lowballReply(const Json& chat,const std::string& action){
 if(action=="closed")return chat.at("npc").value("personality","")=="evil"?"С таким торгом — мимо. Диалог закрыт.":"Я завершаю переписку. С такими предложениями мы не договоримся.";
 return chat.value("lowballAttempts",0)>=2?"Ещё одно такое предложение — и я прекращаю разговор.":"Такую цену не рассматриваю. Предложите реальную сумму.";
}
inline OfferResult agreeNegotiation(Json& chat,Money price,Money balance){if(price<1||price>safeInteger)return {"invalid",0};if((chat.at("mode")=="buy"&&price>balance)||(meetingHasTrade(chat)&&num(chat["trade"],"value")-price>balance))return {"unaffordable",price};chat["price"]=price;chat["stage"]="schedule";return {"agreed",price};}
inline OfferResult negotiate(Json& chat,Money offered,Money balance,const std::function<double()>& random){if(chat.value("done",false)||chat.value("stage","")!="talk")return {"inactive",0};if(offered<1||offered>safeInteger)return {"invalid",0};
 if(chat.at("mode")=="buy"){
  Money ask=chat.at("ask");double reference=num(chat,"referencePrice",double(ask));
  if(offered>=ask)return agreeNegotiation(chat,offered,balance);
  if(offered<reference*.3){
   int attempts=std::clamp(chat.value("lowballAttempts",0),0,3)+1;
   chat["lowballAttempts"]=attempts;
   chat["npc"]["mood"]=std::max(0.,num(chat["npc"],"mood",50)-15);
   if(attempts>=3){chat["done"]=true;chat["stage"]="closed";chat["closedReason"]="lowball";return {"closed",ask};}
   return {"lowball-warning",ask};
  }
  int round=chat.value("sellerConcessionRound",0);
  if(round>=3)return {"rejected",ask};
  // Roll each stage once, and retain its allowance across save/reload.
  if(!chat.contains("sellerConcessions")){
   auto draw=[&]{return std::clamp(random(),0.,.999999999);};
   chat["sellerConcessions"]=Json::array({Money(20000+std::floor(draw()*21)*500),Money(5000+std::floor(draw()*5)*500),Money(500+std::floor(draw()*2)*500)});
  }
  Money allowance=chat["sellerConcessions"].at(round);
  auto temperament=chat.at("npc").value("personality","neutral");
  double factor=temperament=="kind"?1.:temperament=="evil"?.65:.85;
  allowance=std::max<Money>(1,Money(std::floor(allowance*factor)));
  // Cheap vehicles retain a proportional floor rather than losing 20k blindly.
  Money floor=std::max<Money>(1,Money(std::ceil(reference*.70)));
  Money reduction=std::min({ask-offered,allowance,std::max<Money>(0,ask-floor)});
  if(reduction<=0)return {"rejected",ask};
  Money counter=ask-reduction;
  if(counter==offered){auto result=agreeNegotiation(chat,counter,balance);if(result.action=="agreed")chat["sellerConcessionRound"]=round+1;return result;}
  chat["ask"]=counter;chat["sellerConcessionRound"]=round+1;
  return {"counter",counter};
 }

 Money limit=buyerLimit(chat),bid=chat.at("bid");double carPrice=num(chat.at("car"),"price"),listing=num(chat,"listingPrice")?num(chat,"listingPrice"):carPrice;if(offered>std::max(carPrice*2.5,listing*1.5))return {"rejected",bid};if(offered<=bid)return agreeNegotiation(chat,bid,balance);if(offered<=limit)return agreeNegotiation(chat,offered,balance);Money counter=Money(jsRound(((double(offered)+bid)/2)/500)*500);counter=std::min(counter,limit);if(counter>=offered)counter=offered-500;chat["bid"]=std::max(bid,counter);return {"counter",chat["bid"]};
}
// Only scheduling decisions; caller persists pending/calendar/chat atomically.
inline std::string reserveMeetingSlot(Json& chat,Money when,Money now,int localMinute,const std::function<double()>& random){if(chat.value("done",false)||chat.value("stage","")!="schedule")return "inactive";if(when<now/60000*60000)return "past";if(localMinute!=0&&localMinute!=30)return "invalid-slot";if(!chat.contains("busyTimes")||!chat["busyTimes"].is_array())chat["busyTimes"]=Json::array();for(const auto& at:chat["busyTimes"])if(at==when)return "busy";auto p=chat.at("npc").value("personality","neutral");double chance=p=="kind"?.05:p=="evil"?.14:.08;if(!chat.value("busyUsed",false)&&random()<chance){chat["busyUsed"]=true;chat["busyTimes"].push_back(when);return "busy";}return "accepted";}
}
