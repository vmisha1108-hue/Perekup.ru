#pragma once
#include "travel.hpp"
#include "market.hpp"
namespace perekup {
// Transport owns location data; the game owns cash, cars and pending meetings.
class Transport {
public:
 Json state,garage=Json::array(),cities,cars;int capacity=1;double now=0;std::string home;
 std::function<bool(Money,const std::string&)> spend;
 std::function<Money()> balance;
 std::function<bool(Money)> workshop=[](Money){return false;};
 std::function<bool(Money)> meeting=[](Money){return false;};
 std::function<bool(Money)> repaired=[](Money){return false;};
 std::function<void(Money)> removeOffers=[](Money){};
 std::function<void(Money,double)> resumeListing=[](Money,double){};
 bool physicalMeeting=false,gameOver=false;
 Transport(Json cityMap,Json carMap,std::string homeId):cities(std::move(cityMap)),cars(std::move(carMap)),home(std::move(homeId)){reset();}
 void reset(){state={{"version",1},{"cityId",home},{"trip",nullptr},{"shipments",Json::array()},{"vehicles",Json::object()},{"odometers",Json::object()},{"arrival",nullptr}};}
 static std::string key(Money id){return std::to_string(id);}
 bool owned(Money id)const{return std::find(garage.begin(),garage.end(),Json(id))!=garage.end();}
 void rebalance(){std::vector<Money> ids;for(const auto& id:garage){auto it=state["vehicles"].find(key(id));if(it!=state["vehicles"].end()&&(*it)["cityId"]==home&&((*it)["place"]=="garage"||(*it)["place"]=="yard"))ids.push_back(id);}
 std::stable_sort(ids.begin(),ids.end(),[&](Money a,Money b){return (state["vehicles"][key(a)]["place"]=="garage"?0:1)<(state["vehicles"][key(b)]["place"]=="garage"?0:1);});
 for(std::size_t i=0;i<ids.size();i++)state["vehicles"][key(ids[i])]["place"]=i<std::size_t(std::max(0,capacity))?"garage":"yard";
 }
 Json* vehicle(Money id){auto k=key(id);if(!state["vehicles"].contains(k)&&owned(id)){state["vehicles"][k]={{"cityId",home},{"place","yard"},{"debt",0}};rebalance();}auto it=state["vehicles"].find(k);return it==state["vehicles"].end()?nullptr:&*it;}
 void park(Money id,const std::string& city,double at){state["vehicles"][key(id)]={{"cityId",city},{"place",city==home?"yard":"parking"},{"debt",0},{"nextChargeAt",city==home?Json(nullptr):Json(at+day)}};rebalance();}
 void remove(Money id){state["vehicles"].erase(key(id));rebalance();}
 bool moving(Money id){auto v=vehicle(id);return workshop(id)||(v&&((*v)["place"]=="road"||(*v)["place"]=="carrier"));}
 Money debt(Money id){auto v=vehicle(id);return v?Money(num(*v,"debt")):0;}
 bool payDebt(Money id){auto v=vehicle(id);if(!v)return false;Money n=debt(id);if(n>balance()||!spend(n,"Погашение долга за парковку: "+cars.at(key(id)).value("name","")))return false;(*v)["debt"]=0;return true;}
 bool settle(Money id,double until){auto v=vehicle(id);if(!v||(*v)["place"]!="parking"||!num(*v,"nextChargeAt")||until<num(*v,"nextChargeAt"))return false;
 double days=std::floor((until-num(*v,"nextChargeAt"))/day)+1;Money fee=Money(days*100),paid=std::min(balance(),fee);
 if(!spend(paid,"Парковка: "+cars.at(key(id)).value("name","")))return false;
 (*v)["debt"]=std::min(safeInteger,debt(id)+fee-paid);(*v)["nextChargeAt"]=num(*v,"nextChargeAt")+days*day;return true;}
 std::vector<Money> driving(){std::vector<Money> ids;for(const auto& value:garage){Money id=value;auto v=vehicle(id);const auto& c=cars.at(key(id));auto desc=lowerCatalogue(c.value("desc","")+" "+c.value("full",""));if(v&&(*v)["cityId"]==state["cityId"]&&!moving(id)&&(desc.find("не на ходу")==std::string::npos||(c.value("blagNew",false)&&repaired(id))))ids.push_back(id);}return ids;}
 Json options(const std::string& target){if(!cities.contains(target))return Json::array();return routeOptions(cities.at(state["cityId"].get<std::string>()),cities.at(target),!driving().empty());}
 bool depart(const std::string& target,const std::string& mode,Money id=0){if(gameOver||!state["trip"].is_null()||physicalMeeting)return false;auto routes=options(target);auto it=std::find_if(routes.begin(),routes.end(),[&](const auto& r){return r["mode"]==mode;});if(it==routes.end())return false;const Json option=*it;auto local=driving();if(mode=="drive"&&(std::find(local.begin(),local.end(),id)==local.end()||meeting(id)))return false;
 Money price=option["price"],owed=mode=="drive"?debt(id):0;if(price>balance()||owed>balance()-price)return false;
 auto from=state["cityId"].get<std::string>();if(!spend(price,"Переезд: "+cities[from].value("name","")+" → "+cities[target].value("name","")+" · "+option.value("label","")))return false;
 if(mode=="drive"){payDebt(id);state["vehicles"][key(id)]["place"]="road";removeOffers(id);rebalance();}
 state["arrival"]=nullptr;state["trip"]={{"from",from},{"to",target},{"mode",mode},{"label",option["label"]},{"carId",mode=="drive"?Json(id):Json(nullptr)},{"distance",option["distance"]},{"price",price},{"departedAt",now},{"arrivesAt",now+num(option,"duration")}};return true;}
 bool ship(Money id){if(gameOver)return false;auto v=vehicle(id);if(!v||moving(id)||meeting(id))return false;auto q=shippingQuote(cities.at((*v)["cityId"].get<std::string>()),cities.at(home),false);if(q.is_null())return false;Money price=q["price"],owed=debt(id);if(price>balance()||owed>balance()-price)return false;
 if(!spend(price,"Автовоз в Москву: "+cars.at(key(id)).value("name","")))return false;payDebt(id);(*v)["place"]="carrier";state["shipments"].push_back({{"carId",id},{"from",(*v)["cityId"]},{"departedAt",now},{"arrivesAt",now+num(q,"duration")},{"price",price}});removeOffers(id);return true;}
 bool tick(){if(gameOver)return false;bool changed=false;Json trip=state["trip"];
 if(!trip.is_null()&&now>=num(trip,"arrivesAt")){state["cityId"]=trip["to"];if(!trip["carId"].is_null()&&owned(trip["carId"])){Money id=trip["carId"];auto k=key(id);state["odometers"][k]=num(state["odometers"],k.c_str())+num(trip,"distance");park(id,trip["to"],num(trip,"arrivesAt"));resumeListing(id,num(trip,"arrivesAt"));}state["trip"]=nullptr;state["arrival"]={{"cityId",trip["to"]},{"label",trip["label"]},{"when",trip["arrivesAt"]}};changed=true;}
 Json remaining=Json::array();for(const auto& shipment:state["shipments"]){if(now<num(shipment,"arrivesAt")){remaining.push_back(shipment);continue;}Money id=shipment["carId"];if(owned(id)){park(id,home,num(shipment,"arrivesAt"));resumeListing(id,num(shipment,"arrivesAt"));}changed=true;}state["shipments"]=remaining;
 for(const auto& id:garage)changed=settle(id,now)||changed;return changed;}
};
}
