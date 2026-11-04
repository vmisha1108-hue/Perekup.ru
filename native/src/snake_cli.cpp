#include "snake.hpp"
#include <iostream>
int main(){using namespace perekup;std::string line;while(std::getline(std::cin,line))try{
 Json in=Json::parse(line);auto random=in.value("random",std::vector<double>{.5});std::size_t i=0;Snake snake([&](){return i<random.size()?random[i++]:.5;},in.value("best",0));Json result=Json::array();
 for(auto& cmd:in["commands"]){std::string op=cmd["op"];
  if(op=="start")snake.start(num(cmd,"time"));else if(op=="resume")snake.resume(num(cmd,"time"));else if(op=="pause")snake.pause();else if(op=="turn")snake.turn(cmd["x"],cmd["y"]);else if(op=="frame")snake.frame(num(cmd,"time"),cmd.value("visible",true));else throw std::runtime_error("unknown operation");
  result.push_back(snake.snapshot());
 }
 std::cout<<Json({{"ok",true},{"result",result}}).dump()<<'\n';
 }catch(const std::exception& e){std::cout<<Json({{"ok",false},{"error",e.what()}}).dump()<<'\n';}}
