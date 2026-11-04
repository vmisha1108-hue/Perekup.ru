#pragma once
#include "chat_store.hpp"
namespace perekup {
// Opens an existing offer only; never invents a buyer or replaces a pending
// offer with caller-supplied prices. Caller persists the resulting snapshot.
inline std::string beginNativeSellChat(Json& state, const Json& car, const std::string& offerId) {
    if (state.at("marketRisks").at("seizures").size() >= 5) return "game-over";
    if (state.contains("chat") && state["chat"].is_object() && state["chat"].value("met",false) && !state["chat"].value("done",false)) return "meeting-active";
    Money carId = car.at("id");
    if (std::find(state.at("garage").begin(),state.at("garage").end(),Json(carId)) == state.at("garage").end()) return "not-owned";
    if (!state.at("listings").contains(std::to_string(carId))) return "not-listed";
    const Json* offer = nullptr;
    for (const auto& p : state.at("pending")) {
        if (p.value("carId",0LL) != carId) continue;
        if (p.value("type","") == "meet") return "meeting-pending";
        if (p.value("type","") == "ad" && p.value("mode","") == "sell" && p.value("id","") == offerId) offer = &p;
    }
    if (!offer || offerId.empty()) return "missing-offer";
    if (!offer->value("ready",false)) return "not-ready";
    Json draft = state;
    rememberNativeChat(draft);
    auto key = nativeChatKey("sell",carId,offerId);
    auto legacy = nativeChatKey("sell",carId);
    if (!draft["chatStore"].contains(key) && draft["chatStore"].contains(legacy)) key = legacy;
    if (draft["chatStore"].contains(key)) {
        const auto& saved = draft["chatStore"][key];
        if (saved.value("pid","") == offerId && !saved.value("done",false) && saved.contains("car") && saved["car"].at("id") == carId) {
            draft["chat"] = saved;
            rememberNativeChat(draft);
            state.swap(draft);
            return "restored";
        }
    }
    auto npc = offer->at("npc");npc["greeted"] = false;
    draft["chat"] = {{"mode","sell"},{"car",car},{"npc",npc},{"bid",offer->at("bid")},
        {"log",Json::array()},{"last",""},{"done",false},{"stage","talk"},{"price",nullptr},
        {"event",nullptr},{"meet",nullptr},{"note",nullptr},{"met",false},{"busyUsed",false},
        {"busyTimes",Json::array()},{"pid",offerId},{"trade",offer->value("trade",Json(nullptr))},
        {"listingPrice",offer->at("listingPrice")},{"maxBid",offer->at("maxBid")},
        {"tuningNote",offer->value("tuningNote","")}};
    rememberNativeChat(draft);
    state.swap(draft);
    return "opened";
}
}
