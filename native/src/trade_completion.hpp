#pragma once
#include "meeting.hpp"
#include "deals.hpp"
#include "career_sales.hpp"
namespace perekup {
// Original exchanges complete without a DКП. Ownership, difference, parking
// debt and career accounting must all reach disk in one transaction.
inline std::string completeNativeTrade(Json& state, Deals& deals, const Json& cars,
                                      const std::function<void(const Json&)>& persist) {
    if (!state.contains("chat") || !state["chat"].is_object()) return "inactive";
    const auto& chat=state.at("chat");
    if (chat.value("done",false) || !chat.value("met",false) || chat.value("stage","")!="event" || !meetingHasTrade(chat) || !chat.at("event").is_null()) return "inactive";
    bool matched=false;
    for (const auto& p:state.at("pending")) if (p.value("id","")==chat.value("pid","") && p.value("type","")=="meet" && p.value("mode","")=="sell" && p.at("carId")==chat.at("car").at("id") && p.value("trade",Json(nullptr))==chat.at("trade")) matched=true;
    if (!matched) return "missing-meeting";
    Money id=chat.at("car").at("id"), price=chat.at("price"), incoming=chat.at("trade").at("carId"), value=chat.at("trade").at("value");
    if (incoming==id) return "invalid-exchange";
    auto plan=deals.plan(state,"trade",id,price,incoming,value);
    if (!plan.ok) return plan.error;
    Deals::commit(state,std::move(plan),[&](Json& staged,const Json& effects){
        applyCareerDealEffects(staged,effects,cars);
        auto& c=staged["chat"];c["done"]=true;c["stage"]="done";c["meetingOutcome"]="success";
        c["meetingResult"]="Обмен завершён. Автомобили и доплата переданы.";
    },persist);
    return "completed";
}
}
