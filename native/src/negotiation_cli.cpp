#include "negotiation.hpp"
#include <iostream>
int main(){using namespace perekup;std::string line;while(std::getline(std::cin,line)){auto q=Json::parse(line);auto chat=q.at("chat");auto result=negotiate(chat,q.at("offer"),q.at("balance"),[&]{return q.value("random",.5);});std::cout<<Json({{"action",result.action},{"price",result.price},{"chat",chat}}).dump()<<'\n';}}
