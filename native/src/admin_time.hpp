#pragma once
#include "bank.hpp"
namespace perekup {
struct AdminDayResult {Money advanced=0;bool completed=false;std::string blocked;};
inline AdminDayResult skipNativeDay(Json& state,const std::function<void(Json&,Money)>& tick){
 auto call=[](const Json& s){const auto& b=s.at("bank");return b.contains("collectors")&&b["collectors"].is_object()&&b["collectors"].contains("call")&&!b["collectors"]["call"].is_null();};
 if(call(state))return {0,false,"call"};
 if(state.at("marketRisks").at("seizures").size()>=5)return {0,false,"game-over"};
 Json draft=state;Money start=draft.at("gameMs"),target=start+Money(day);
 if(target>8640000000000000LL)throw std::overflow_error("Game date limit reached");
 std::string blocked;
 while(draft.at("gameMs").get<Money>()<target){Money next=std::min(target,draft.at("gameMs").get<Money>()+15*60000);tick(draft,next);if(draft.at("gameMs").get<Money>()!=next)throw std::logic_error("Day skip did not advance clock");if(call(draft)){blocked="call";break;}if(draft.at("marketRisks").at("seizures").size()>=5){blocked="game-over";break;}}
 Money advanced=draft.at("gameMs").get<Money>()-start;state.swap(draft);return {advanced,advanced==Money(day),blocked};
}
}
