#include "travel.hpp"
#include <iostream>
int main(){using namespace perekup;std::string line;while(std::getline(std::cin,line))try{
 Json input=Json::parse(line),out=Json::array();for(const auto& pair:input["routes"]){const auto& from=pair["from"];const auto& to=pair["to"];out.push_back({{"routes",routeOptions(from,to,pair.value("drive",false))},{"shipping",shippingQuote(from,to,pair.value("moving",false))},{"direct",distanceBetweenCities(from,to)},{"road",roadDistance(from,to)}});}
 std::cout<<Json({{"ok",true},{"result",out}}).dump()<<'\n';
 }catch(const std::exception& e){std::cout<<Json({{"ok",false},{"error",e.what()}}).dump()<<'\n';}}
