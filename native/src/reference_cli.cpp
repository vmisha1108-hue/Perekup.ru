#include "bank.hpp"
#include <iostream>
int main(){using namespace perekup;std::string line;while(std::getline(std::cin,line))try{
 Json in=Json::parse(line);auto values=in.value("random",std::vector<double>{.5});std::size_t i=0;Bank b([&](){return i<values.size()?values[i++]:.5;});
 b.balance=in.value("balance",Money(100000));b.now=in.value("now",0.);b.reset();b.gameOver=in.value("gameOver",false);if(in.contains("bank"))b.state=in["bank"];
 Json out=Json::array();for(const auto& c:in["commands"]){std::string op=c["op"];Json r=nullptr;
 if(op=="quote")r=b.quote(c["amount"],c["months"]);else if(op=="chance")r=b.chance(c["amount"],c.value("assets",0.));else if(op=="request")r=b.request(c["amount"],c["months"],c.value("assets",0.));else if(op=="accept")r=b.accept();else if(op=="microQuote")r=b.microQuote(c["amount"]);else if(op=="micro")r=b.micro(c["amount"]);else if(op=="tick"){b.now=c["now"];b.tick();}else if(op=="balance")b.balance=c["value"];else if(op=="pay")r=b.pay(b.state["loans"].at(c.value("index",0)),c["amount"],b.now);else throw std::runtime_error("unknown operation");
 out.push_back({{"result",r},{"balance",b.balance},{"bank",b.state}});}
 std::cout<<Json({{"ok",true},{"steps",out}}).dump()<<'\n';
 }catch(const std::exception& e){std::cout<<Json({{"ok",false},{"error",e.what()}}).dump()<<'\n';}}
