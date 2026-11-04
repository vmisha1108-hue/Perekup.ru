#pragma once
#include "career_sales.hpp"
namespace perekup {
inline double nextNativeBuyerDelay(const Json& listing,double draw,double collectorFactor,double careerFactor){
 if(!std::isfinite(draw)||!std::isfinite(collectorFactor)||!std::isfinite(careerFactor)||collectorFactor<=0||careerFactor<=0)throw std::invalid_argument("Invalid buyer timing factors");
 double markup=num(listing,"price")-num(listing,"purchasePrice");double factor=markup>500000?std::min(8.,3+(markup-500000)/500000):1.;draw=std::clamp(draw,0.,1-std::numeric_limits<double>::epsilon());return std::max(60000.,jsRound(-std::log(1-draw)*10800000*factor*collectorFactor*careerFactor));
}
inline void clearNativeSaleOffers(Json& draft,Money id){
 auto& pending=draft["pending"];pending.erase(std::remove_if(pending.begin(),pending.end(),[&](const Json& p){return p.value("type","")=="ad"&&p.value("carId",0LL)==id;}),pending.end());
 for(auto it=draft["chatStore"].begin();it!=draft["chatStore"].end();)if(it.value().value("mode","")=="sell"&&it.value().value("carId",0LL)==id)it=draft["chatStore"].erase(it);else ++it;
 if(draft.contains("chat")&&draft["chat"].is_object()){auto& chat=draft["chat"];if(chat.value("mode","")=="sell"&&chat.contains("car")&&chat["car"].value("id",0LL)==id&&!chat.value("met",false)){chat["done"]=true;chat["stage"]="done";chat["event"]=nullptr;}}
}
inline bool postNativeListing(Json& state,const Json& car,Money price,bool disclosed,const std::function<bool(Money)>& moving,const std::function<double(const Json&)>& buyerDelay){
 Money id=car.at("id");auto key=std::to_string(id);if(state.at("marketRisks").at("seizures").size()>=5||price<1||price>safeInteger)return false;
 if(std::find(state.at("garage").begin(),state.at("garage").end(),Json(id))==state.at("garage").end()||moving(id))return false;
 for(const auto& p:state.at("pending"))if(p.value("type","")=="meet"&&p.value("carId",0LL)==id)return false;
 Json draft=state;clearNativeSaleOffers(draft,id);Json listing={{"carId",id},{"price",price},{"disclosed",disclosed},{"purchasePrice",draft["purchasePrices"].contains(key)?draft["purchasePrices"][key]:Json(num(car,"basePrice",num(car,"price")))},{"buyerTimingVersion",2}};
 double delay=buyerDelay(listing);if(!std::isfinite(delay)||delay<60000)throw std::invalid_argument("Invalid buyer delay");listing["nextBuyerAt"]=num(draft,"gameMs")+delay;draft["listings"][key]=listing;careerStep(draft["career"],"listed");state.swap(draft);return true;
}
inline bool cancelNativeListing(Json& state,Money id){auto key=std::to_string(id);if(!state.at("listings").contains(key))return false;Json draft=state;clearNativeSaleOffers(draft,id);draft["listings"].erase(key);state.swap(draft);return true;}
}
