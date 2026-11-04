#include "deal_inbox.hpp"
#include "buy_chat.hpp"
#include "game_clock.hpp"
#include "sleep_plan.hpp"
#include <cassert>
#include <iostream>
using namespace perekup;
int main(){
 GameClock clock(0,0);clock.update(5000);assert(clock.gameMs==60000);clock.setSnakeActivity(5000,true);clock.update(7500);assert(clock.gameMs==120000);clock.setSnakeActivity(7500,false);clock.update(12500);assert(clock.gameMs==180000);clock.onboardingActive=true;clock.update(22500);assert(clock.gameMs==180000);
 assert(maximumSleepHours(7)==8&&maximumSleepHours(8)==8&&maximumSleepHours(9)==3&&maximumSleepHours(21)==3&&maximumSleepHours(22)==8);assert(boundedSleepHours(14,8)==3&&boundedSleepHours(23,20)==8&&boundedSleepHours(10,0)==1);
 Json car={{"id",1},{"price",100000},{"seller",{{"name","Ольга"},{"personality","kind"}}}};
 Json chat={{"mode","buy"},{"stage","talk"},{"ask",100000},{"referencePrice",100000},{"car",car},{"npc",car["seller"]},{"log",Json::array()},{"pid",nullptr},{"met",false},{"done",false}};chat["npc"]["mood"]=72;
 auto rng=[]{return .5;};assert(negotiate(chat,10,200000,rng).action=="lowball-warning");chat=Json::parse(chat.dump());assert(negotiate(chat,10,200000,rng).action=="lowball-warning");assert(negotiate(chat,10,200000,rng).action=="closed");assert(chat["done"]==true&&chat["stage"]=="closed"&&chat["ask"]==100000&&!chat.contains("sellerConcessionRound"));assert(negotiate(chat,100000,200000,rng).action=="inactive");
 Json state={{"marketRisks",{{"seizures",Json::array()}}},{"garage",Json::array()},{"retiredMarketCars",Json::array()},{"pending",Json::array()},{"chat",nullptr},{"chatStore",{{"buy:1",chat}}}};
 assert(beginNativeBuyChat(state,car,rng)=="restored"&&state["chat"]["done"]==true);assert(state["chat"]["lowballAttempts"]==3);
 state["listings"]={{"2",{{"carId",2},{"price",250000}}},{"3",{{"carId",3},{"price",300000}}}};
 state["pending"]=Json::array({{{"id","buyer-1"},{"type","ad"},{"mode","sell"},{"carId",2},{"ready",true},{"bid",240000},{"npc",{{"name","Сергей"}}}},{{"id","not-yet"},{"type","ad"},{"mode","sell"},{"carId",2},{"ready",false},{"bid",230000},{"npc",{{"name","Анна"}}}}});
 auto before=state;auto inbox=nativeDealInbox(state);assert(state==before);assert(inbox["listings"].size()==2&&inbox["incoming"].size()==1&&inbox["outgoing"].size()==1);assert(inbox["listings"][0]["responses"]==1&&inbox["listings"][1]["responses"]==0);assert(inbox["outgoing"][0]["stage"]=="closed");
 state["pending"].push_back({{"id","meeting-4"},{"type","meet"},{"mode","buy"},{"carId",4},{"when",3600000},{"price",450000},{"npc",{{"name","Иван"}}}});inbox=nativeDealInbox(state);assert(inbox["outgoing"].size()==2);assert(inbox["outgoing"][1]["stage"]=="go"&&inbox["outgoing"][1]["id"]=="meeting-4");
 std::cout<<"PASS 5-second minute, snake x2, sleep limits, repeated lowball closure/reload, own ads and incoming/outgoing inbox isolation\n";
}
