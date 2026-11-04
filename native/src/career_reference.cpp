#include "career_orders.hpp"
#include <iostream>
int main(){using namespace perekup;std::string line;while(std::getline(std::cin,line)){try{auto q=Json::parse(line);auto action=q.value("action","");Json out;if(action=="story")out=nativeCarStory(q.at("car"));else if(action=="orders"){auto s=q.at("state");generateNativeCareerOrders(s);out=s["career"];}else if(action=="market"){auto car=q.at("car");applyNativeCareerMarket(car,q.at("cycle"));out=car;}else throw std::invalid_argument("action");std::cout<<out.dump()<<'\n';}catch(const std::exception& e){std::cerr<<e.what()<<'\n';return 1;}}}
