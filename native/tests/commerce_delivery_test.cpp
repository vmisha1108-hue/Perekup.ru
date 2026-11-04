#include "commerce_delivery.hpp"
#include "deals.hpp"
#include "contracts.hpp"
#include <iostream>
#define CHECK(...) do {if(!(__VA_ARGS__))throw std::runtime_error("check failed at line "+std::to_string(__LINE__));}while(false)
int main(){using namespace perekup;Json cities={{"home",{{"id","home"},{"name","Москва"}}}},cars={{"1",{{"id",1},{"name","Тест"},{"cityId","home"},{"price",50000}}}},offers={{"dealer",{{"id","dealer"},{"kind","dealer"},{"carId",1},{"price",50000}}}};Deals d(cities,cars,"home",[]{return .5;});auto live=d.fresh(1000000);live["career"]=freshCareer(1000000);live["playerIdentity"]={{"nickname","Игрок"},{"signature","TEST"}};live["contracts"]=freshContracts(live["playerIdentity"]);Bank bank([]{return .5;});bank.now=1000000;Commerce c(bank,offers);auto order=c.place("dealer",{{"fullName","Игрок"}},"home",true,false,true,false,"","Тест");CHECK(!order.is_null());live["balance"]=bank.balance;live["bank"]=bank.state;live["commerce"]=c.state;Json vehicle=contractDocumentIds(1,true);auto before=live;
 CHECK(!acceptCommerceDelivery(live,"supply-1",false,cities,cars,offers,"home",vehicle,[](const Json&){}));CHECK(live==before);
 auto underpaid=live;underpaid["commerce"]["orders"][0]["paid"]=1;CHECK(!acceptCommerceDelivery(underpaid,"supply-1",true,cities,cars,offers,"home",vehicle,[](const Json&){}));
 bool failed=false;try{acceptCommerceDelivery(live,"supply-1",true,cities,cars,offers,"home",vehicle,[](const Json&){throw std::runtime_error("disk full");});}catch(...){failed=true;}CHECK(failed&&live==before);
 Json saved;CHECK(acceptCommerceDelivery(live,"supply-1",true,cities,cars,offers,"home",vehicle,[&](const Json& s){saved=s;}));CHECK(live==saved&&live["garage"]==Json::array({1})&&live["balance"]==50000);CHECK(live["purchasePrices"]["1"]==50000);CHECK(live["commerce"]["orders"][0]["receipt"]["total"]==50000);CHECK(!commerceAcquisition(live["commerce"],offers,1).is_null());before=live;CHECK(!acceptCommerceDelivery(live,"supply-1",true,cities,cars,offers,"home",vehicle,[](const Json&){}));CHECK(live==before);
 Json customs={{"stage","customs"},{"nextAt",1000000}};bank.now=1000000+3*day;CHECK(c.storage(customs)==0);bank.now+=1;CHECK(c.storage(customs)==2000);bank.now=1000000+4*day;CHECK(c.storage(customs)==2000);bank.now+=1;CHECK(c.storage(customs)==4000);
 std::cout<<"PASS: receipt/garage atomic commit, duplicate/underpaid delivery rejected, acquisition lookup, customs day boundaries\n";
}
