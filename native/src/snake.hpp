#pragma once
#include "bank.hpp"
#include <deque>
namespace perekup {
struct Point {int x=0,y=0;bool operator==(const Point& p)const{return x==p.x&&y==p.y;}};
class Snake {
public:
 static constexpr int size=22;
 std::vector<Point> body;std::deque<Point> turns;Point direction{1,0},food{};
 int score=0,best=0;bool playing=false,ended=false,hasFood=false,won=false;double last=0,carry=0;
 std::function<double()> random;
 explicit Snake(std::function<double()> rng,int record=0):best(record),random(std::move(rng)){reset();}
 void placeFood(){
  std::vector<Point> free;for(int y=0;y<size;y++)for(int x=0;x<size;x++)if(std::find(body.begin(),body.end(),Point{x,y})==body.end())free.push_back({x,y});
  hasFood=!free.empty();if(hasFood)food=free.at(std::size_t(std::floor(random()*free.size())));
 }
 void reset(){body={{10,11},{9,11},{8,11}};direction={1,0};turns.clear();score=0;ended=false;won=false;placeFood();}
 void pause(){playing=false;}
 void end(bool win){pause();ended=true;won=win;}
 void resume(double time){if(ended)return;playing=true;last=time;carry=0;}
 void start(double time){pause();reset();resume(time);}
 void turn(int x,int y){
  if(!playing)return;Point previous=turns.empty()?direction:turns.back();
  if(turns.size()<2&&(x!=previous.x||y!=previous.y)&&(x!=-previous.x||y!=-previous.y))turns.push_back({x,y});
 }
 void step(){
  if(!turns.empty()){direction=turns.front();turns.pop_front();}
  Point head{body.front().x+direction.x,body.front().y+direction.y};bool growing=hasFood&&head==food;
  auto until=body.end()-(growing?0:1);
  if(head.x<0||head.y<0||head.x>=size||head.y>=size||std::find(body.begin(),until,head)!=until){end(false);return;}
  body.insert(body.begin(),head);if(!growing)body.pop_back();else{++score;best=std::max(best,score);placeFood();if(!hasFood){end(true);return;}}
 }
 void frame(double time,bool visible){
  if(!playing)return;if(!visible){pause();return;}
  carry+=std::min(250.,time-last);last=time;double speed=std::max(65,130-score*2);
  while(carry>=speed&&playing){carry-=speed;step();}
 }
 Json snapshot()const{
  auto point=[](Point p){return Json{{"x",p.x},{"y",p.y}};};Json b=Json::array(),q=Json::array();for(auto p:body)b.push_back(point(p));for(auto p:turns)q.push_back(point(p));
  return {{"body",b},{"food",hasFood?point(food):Json(nullptr)},{"direction",point(direction)},{"nextTurns",q},{"score",score},{"best",best},{"playing",playing},{"ended",ended},{"last",last},{"carry",carry}};
 }
};
}
