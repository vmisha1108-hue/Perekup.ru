#pragma once
#include <algorithm>
#include <cstdint>
#include <functional>
#include <array>
#include <stdexcept>
namespace perekup {
class GameClock {
public:
 using Milliseconds=std::int64_t;
 static constexpr int normalSpeed=12,snakeSpeed=24;
 Milliseconds gameMs,lastRealMs;int speed=normalSpeed;
 bool startupResetPending=false,onboardingActive=false,gameOver=false;
 enum Stage {TransportStage,BankStage,CommerceStage,TuningStage,CareerStage,CollectorsStage,MeetingStage,ListingsStage,PendingStage,StageCount};
 std::array<std::function<void(Milliseconds)>,StageCount> ticks;
 GameClock(Milliseconds gameTime,Milliseconds realTime):gameMs(gameTime),lastRealMs(realTime){}
 bool paused()const{return startupResetPending||onboardingActive||gameOver;}
 void advance(Milliseconds now){auto delta=now>=lastRealMs?std::min<Milliseconds>(120000,now-lastRealMs):0;lastRealMs=now;if(paused())return;gameMs+=delta*speed;}
 void setSnakeActivity(Milliseconds now,bool playing){advance(now);speed=playing?snakeSpeed:normalSpeed;}
 // Old clock-focus entry point remains readable by older callers but no longer accelerates time.
 void setClockFocus(Milliseconds now,bool,bool,bool,bool,bool,bool){advance(now);speed=normalSpeed;}

 void tick(){if(paused())return;for(auto& callback:ticks)if(callback)callback(gameMs);}
 void update(Milliseconds realTime){advance(realTime);tick();}
 void waitUntil(Milliseconds target,Milliseconds realTime){if(paused())return;while(gameMs<target&&!paused()){gameMs=std::min(target,gameMs+15*60000);tick();}lastRealMs=realTime;}
};
}
