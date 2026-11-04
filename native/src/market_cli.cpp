#include "market.hpp"
#include <iostream>
int main(){using namespace perekup;std::string line;while(std::getline(std::cin,line))try{
 Json input=Json::parse(line),result;auto values=input.value("random",std::vector<double>{.5});std::size_t i=0;auto rng=[&](){return i<values.size()?values[i++]:.5;};
 std::string op=input["op"];
 if(op=="estimate"){result=Json::array();for(const auto& car:input["cars"])result.push_back(estimateMarketPrice(car));}
 else if(op=="session"){Json cars=input["cars"];Json moods=marketSession(cars,input.value("previous",Json::object()),rng);result={{"cars",cars},{"moods",moods}};}
 else if(op=="risks"){result=Json::array();for(const auto& car:input["cars"])result.push_back(rollMarketRisk(car,rng));}
 else if(op=="inspect"){Json risk=input["risk"];Money balance=input["balance"];Json states=Json::array();for(bool pro:input["checks"]){bool ok=inspectMarketRisk(risk,pro,[&](Money charge){if(charge>balance)return false;balance-=charge;return true;});states.push_back({{"ok",ok},{"risk",risk},{"balance",balance}});}result=states;}
 else throw std::runtime_error("unknown operation");
 std::cout<<Json({{"ok",true},{"result",result}}).dump()<<'\n';
 }catch(const std::exception& e){std::cout<<Json({{"ok",false},{"error",e.what()}}).dump()<<'\n';}}
