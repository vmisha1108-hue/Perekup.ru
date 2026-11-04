#pragma once
#include "bank.hpp"
namespace perekup {
inline Json freshCommerce(){return {{"version",1},{"sequence",0},{"revision",0},{"orders",Json::array()},{"inspections",Json::object()},{"discounts",Json::object()},{"dialogues",Json::object()},{"colors",Json::object()}};}
inline Money commerceTotal(const Json& costs){Money total=0;for(const auto& value:costs){double n=value.get<double>();if(!std::isfinite(n)||n<0||std::floor(n)!=n||n>safeInteger-total)throw std::invalid_argument("Invalid commerce total");total+=Money(n);}return total;}
inline Json commerceQuote(const Json& offer,const Json& book,bool equipment,double fx=1,double dealerFactor=1){auto id=offer.at("id").get<std::string>();if(offer.at("kind")=="dealer"){double price=jsRound(num(offer,"price")*dealerFactor);return {{"vehicle",price-(book.at("discounts").value(id,false)?jsRound(price*.02):0)},{"equipment",equipment?25000:0},{"inspection",0}};}double vehicle=jsRound(num(offer,"foreign")*num(offer,"rate")*fx);return {{"vehicle",vehicle},{"transfer",jsRound(vehicle*.015)},{"delivery",offer.at("delivery")},{"duty",offer.at("duty")},{"util",offer.at("util")},{"documents",25000},{"broker",30000},{"inspection",book.at("inspections").contains(id)?8000:0}};}
class Commerce {
public:
 Json state=freshCommerce(),offers;Bank& bank;
 explicit Commerce(Bank& b,Json offerMap):offers(std::move(offerMap)),bank(b){}
 void revision(){state["revision"]=num(state,"revision")+1;}
 bool taken(const std::string& id)const{for(const auto& order:state.at("orders"))if(order.at("offerId")==id)return true;return false;}
 Json* order(const std::string& id){for(auto& o:state["orders"])if(o.at("id")==id)return &o;return nullptr;}
 bool inspect(const std::string& id,const std::string& carName){if(bank.gameOver||!offers.contains(id))return false;const auto& offer=offers[id];if(offer.value("legacy",false)||offer.at("kind")!="import"||taken(id)||state["inspections"].contains(id))return false;if(!bank.changeBalance(-8000,"Предпокупочный осмотр: "+carName,"expense",bank.now))return false;state["inspections"][id]={{"paidAt",bank.now}};revision();return true;}
 // Call on a staged Bank/Commerce pair; callers attach the supply contract and
 // persist all affected books in the same commit before updating the live game.
 Json place(const std::string& id,const Json& buyer,const std::string& city,bool atHome,bool travelling,bool acknowledged,bool equipment,const std::string& factoryColor,const std::string& carName,double fx=1,double dealerFactor=1){
 if(bank.gameOver||!offers.contains(id)||travelling||!acknowledged||taken(id))return nullptr;const auto& offer=offers[id];if(offer.value("legacy",false)||(offer.at("kind")=="dealer"&&!atHome))return nullptr;bool imported=offer.at("kind")=="import";auto costs=commerceQuote(offer,state,equipment,fx,dealerFactor);Money total=commerceTotal(costs),deposit=imported?Money(num(costs,"vehicle")+num(costs,"transfer")+num(costs,"delivery")):total;
 if(!bank.changeBalance(-deposit,std::string(imported?"Выкуп и доставка: ":"Оплата автосалону: ")+carName,"expense",bank.now))return nullptr;
 Money sequence=Money(num(state,"sequence"))+1;state["sequence"]=sequence;Json result={{"id","supply-"+std::to_string(sequence)},{"offerId",id},{"cityId",city},{"createdAt",bank.now},{"exchangeRate",num(offer,"rate")?Json(num(offer,"rate")*fx):Json(nullptr)},{"costs",costs},{"paid",deposit+(imported?Money(num(costs,"inspection")):0)},{"buyer",buyer},{"stage",imported?"export":"ready"},{"nextAt",bank.now+(imported?2*day:0)},{"shippingDays",num(offer,"days")}};if(imported&&!factoryColor.empty())result["factoryColor"]=factoryColor;
 state["orders"].insert(state["orders"].begin(),result);state["dialogues"][result["id"].get<std::string>()]=state["dialogues"].value(id,Json::array());revision();return result;
 }
 Money storage(const Json& order)const{return order.at("stage")=="customs"?Money(std::max(0.,std::ceil((bank.now-num(order,"nextAt")-3*day)/day)))*2000:0;}
 bool payCustoms(const std::string& id,const std::string& carName){if(bank.gameOver)return false;auto o=order(id);if(!o||(*o)["stage"]!="customs")return false;Money fee=storage(*o);const auto& c=(*o)["costs"];Money due=Money(num(c,"duty")+num(c,"util")+num(c,"documents")+num(c,"broker"))+fee;if(!bank.changeBalance(-due,"Таможня и оформление: "+carName,"expense",bank.now))return false;if(fee)(*o)["costs"]["storage"]=fee;(*o)["paid"]=num(*o,"paid")+due;(*o)["stage"]="clearance";(*o)["nextAt"]=bank.now+2*day;revision();return true;}
 bool tick(){if(bank.gameOver)return false;bool changed=false;for(auto& o:state["orders"]){while(bank.now>=num(o,"nextAt")){auto stage=o.at("stage").get<std::string>();if(stage=="export"){o["stage"]="shipping";o["nextAt"]=num(o,"nextAt")+num(o,"shippingDays")*day;}else if(stage=="shipping")o["stage"]="customs";else if(stage=="clearance"){o["stage"]="delivery";o["nextAt"]=num(o,"nextAt")+3*day;}else if(stage=="delivery")o["stage"]="ready";else break;changed=true;}}if(changed)revision();return changed;}
 bool canAccept(const std::string& id,const std::string& city,bool travelling,bool acknowledged,const Json& garage){auto o=order(id);if(bank.gameOver||!o||(*o)["stage"]!="ready"||!acknowledged||travelling||(*o)["cityId"]!=city)return false;Money carId=offers.at((*o)["offerId"].get<std::string>()).at("carId");return std::find(garage.begin(),garage.end(),Json(carId))==garage.end()&&num(*o,"paid")==commerceTotal((*o)["costs"]);}
};
}
