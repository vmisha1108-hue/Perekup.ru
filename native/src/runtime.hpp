#pragma once
#include "transport.hpp"
#include "commerce.hpp"
namespace perekup {
struct RuntimeHooks {
 std::function<bool(Money)> inWorkshop=[](Money){return false;};
 std::function<double(const Json&)> buyerDelay;
 // Remaining systems are called in the original tickPending order.
 std::function<void(Json&)> tuning,career,collectors,meeting,listings,pending;
};
inline void tickRuntime(Json& state,Money now,const Json& cities,const Json& cars,const Json& offers,const std::string& home,const RuntimeHooks& hooks={}){
 if(state.at("marketRisks").at("seizures").size()>=5)return;
 Json draft=state;draft["gameMs"]=now;Bank bank([]{return .5;});bank.balance=draft.at("balance");bank.state=draft.at("bank");bank.now=double(now);
 Transport transport(cities,cars,home);transport.state=draft.at("transport");transport.garage=draft.at("garage");transport.capacity=draft.value("garageCapacity",1);transport.now=double(now);transport.balance=[&]{return bank.balance;};transport.spend=[&](Money amount,const std::string& label){return bank.changeBalance(-amount,label,"expense",double(now));};transport.workshop=hooks.inWorkshop;
 transport.resumeListing=[&](Money id,double at){auto key=std::to_string(id);if(draft["listings"].contains(key)){if(!hooks.buyerDelay)throw std::logic_error("Listing timer is not connected");draft["listings"][key]["nextBuyerAt"]=at+hooks.buyerDelay(draft["listings"][key]);}};
 transport.tick();bank.tick();Commerce commerce(bank,offers);commerce.state=draft.at("commerce");commerce.tick();draft["transport"]=transport.state;draft["bank"]=bank.state;draft["balance"]=bank.balance;draft["commerce"]=commerce.state;
 for(const auto& hook:{hooks.tuning,hooks.career,hooks.collectors,hooks.meeting,hooks.listings,hooks.pending})if(hook)hook(draft);
 state.swap(draft);
}
}
