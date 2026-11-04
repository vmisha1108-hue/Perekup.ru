#pragma once
#include "commerce.hpp"
#include "transport.hpp"
#include "career_sales.hpp"
#include "identity.hpp"
namespace perekup {
inline Json commerceAcquisition(const Json& commerce,const Json& offers,Money carId){for(const auto& order:commerce.at("orders")){auto key=order.value("offerId","");if(offers.contains(key)&&offers[key].at("carId")==carId&&order.value("stage","")=="delivered")return order;}return nullptr;}
// Delivery is a single save transaction, including the acceptance receipt.
inline bool acceptCommerceDelivery(Json& live,const std::string& orderId,bool acknowledged,const Json& cities,const Json& cars,const Json& offers,const std::string& home,const Json& vehicleDocuments,const std::function<void(const Json&)>& persist){
 if(!validIdentity(live.at("playerIdentity")))return false;Bank bank([]{return .5;});bank.balance=live.at("balance");bank.state=live.at("bank");bank.now=num(live,"gameMs");bank.gameOver=live.at("marketRisks").at("seizures").size()>=5;Commerce commerce(bank,offers);commerce.state=live.at("commerce");const auto& transport=live.at("transport");auto city=transport.at("cityId").get<std::string>();if(!commerce.canAccept(orderId,city,!transport.at("trip").is_null(),acknowledged,live.at("garage")))return false;
 Json staged=live;auto order=commerce.order(orderId);Money carId=offers.at(order->at("offerId").get<std::string>()).at("carId");if(!cars.contains(std::to_string(carId)))return false;
 staged["garage"].push_back(carId);staged["purchasePrices"][std::to_string(carId)]=order->at("paid");careerStep(staged["career"],"bought");auto& retired=staged["retiredMarketCars"];if(std::find(retired.begin(),retired.end(),Json(carId))==retired.end())retired.push_back(carId);
 Transport placement(cities,cars,home);placement.state=transport;placement.garage=staged["garage"];placement.capacity=staged.value("garageCapacity",1);placement.now=bank.now;placement.park(carId,city,bank.now);staged["transport"]=placement.state;staged["deals"]=staged.value("deals",0LL)+1;
 const auto& identity=staged["playerIdentity"];const auto& profile=staged["contracts"]["profile"];Json buyer={{"fullName",identity.at("nickname")},{"passport",profile.at("passport")},{"address",profile.at("address")},{"signature",identity.at("signature")}};
 (*order)["stage"]="delivered";(*order)["acceptedAt"]=bank.now;(*order)["receipt"]={{"buyer",buyer},{"vehicle",vehicleDocuments},{"total",order->at("paid")}};commerce.revision();staged["commerce"]=commerce.state;
 persist(staged);live.swap(staged);return true;
}
}
