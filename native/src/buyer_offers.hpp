#pragma once
#include "listings.hpp"

namespace perekup {
// Dependencies remain explicit: career/collector timing and tuning must not be
// silently replaced with neutral values when these systems are integrated.
struct NativeBuyerHooks {
    std::function<double()> random;
    std::function<std::string()> newId;
    std::function<Json(const Json&, const Json&)> tuningEffect;
    std::function<double(const Json&)> delay;
    std::function<bool(Money)> moving;
};
inline const Json& nativeBuyers() {
    static const Json buyers = Json::parse(R"([
      {"name":"Сергей","avatar":"🧔‍♂️","personality":"kind"},
      {"name":"Анна","avatar":"👩‍🦰","personality":"kind"},
      {"name":"Игорь","avatar":"👨‍🦲","personality":"neutral"},
      {"name":"Марина","avatar":"👩‍💼","personality":"neutral"},
      {"name":"Гоша","avatar":"🧑‍🎤","personality":"evil"},
      {"name":"Ринат","avatar":"🧔","personality":"evil"},
      {"name":"Павел","avatar":"👨‍🔧","personality":"neutral"},
      {"name":"Люба","avatar":"👵","personality":"kind"}
    ])");
    return buyers;
}
inline double nativeBuyerDraw(const NativeBuyerHooks& hooks) {
    double x = hooks.random();
    if (!std::isfinite(x) || x < 0 || x >= 1)
        throw std::invalid_argument("Buyer random draw must be in [0,1)");
    return x;
}
inline Json makeNativeBuyerOffer(Json& listing, const Json& car,
                                const Json& tradeCars, const Json& state,
                                double arrivedAt, const NativeBuyerHooks& hooks) {
    Json pool = Json::array();
    for (const auto& b : nativeBuyers())
        if (b.at("name") != listing.value("lastBuyerName", "")) pool.push_back(b);
    Json buyer = pool.at(static_cast<std::size_t>(nativeBuyerDraw(hooks)*pool.size()));
    double kind = nativeBuyerDraw(hooks), price = num(listing, "price"), bid;
    if (kind < .15)
        bid = std::min(double(safeInteger), std::max(price+1, jsRound(price*(1.01+nativeBuyerDraw(hooks)*.09))));
    else if (kind < .50) bid = price;
    else bid = std::max(1., jsRound(price*(.75+nativeBuyerDraw(hooks)*.20)));
    auto effect = hooks.tuningEffect(car, buyer);
    double amount = effect.at("amount").get<double>();
    if (!std::isfinite(amount)) throw std::invalid_argument("Invalid tuning effect");
    bid = std::clamp(bid+amount, 1., double(safeInteger));
    Json offered = nullptr;
    if (kind >= .50 && kind < .75) {
        Json swaps = Json::array();
        for (const auto& swap : tradeCars) {
            const auto& id = swap.at("id");
            bool used = std::find(state.at("garage").begin(), state.at("garage").end(), id) != state.at("garage").end();
            for (const auto& p : state.at("pending"))
                if (p.contains("trade") && p["trade"].is_object() && p["trade"].at("carId") == id) used = true;
            double value = num(swap, "marketPrice");
            if (!used && id != listing.at("carId") && value >= price*.30 && value <= price*1.60) swaps.push_back(swap);
        }
        if (!swaps.empty()) {
            const auto& swap = swaps.at(static_cast<std::size_t>(nativeBuyerDraw(hooks)*swaps.size()));
            offered = {{"carId",swap.at("id")},{"value",swap.at("marketPrice")}};
        }
    }
    std::string id = hooks.newId(); // Original generates the ID before drawing mood.
    if (id.empty()) throw std::invalid_argument("Empty buyer offer ID");
    for (const auto& p : state.at("pending"))
        if (p.value("id", "") == id) throw std::invalid_argument("Duplicate buyer offer ID");
    auto personality = buyer.at("personality").get<std::string>();
    double mood = personality == "kind" ? 72 : personality == "evil" ? 30 : 50;
    buyer["mood"] = std::clamp(mood+std::floor(nativeBuyerDraw(hooks)*17)-8, 5., 95.);
    Json result = {{"id",id},{"type","ad"},{"mode","sell"},{"carId",listing.at("carId")},
        {"npc",buyer},{"listingPrice",price},{"bid",bid},{"tuningNote",effect.at("text")},
        {"trade",offered},{"maxBid",std::min(double(safeInteger),std::max(bid,jsRound(bid*1.05)))},
        {"readyAt",arrivedAt},{"ready",true}};
    listing["lastBuyerName"] = buyer.at("name");
    return result;
}
inline bool tickNativeListings(Json& state, const Json& cars, const Json& tradeCars,
                               const NativeBuyerHooks& hooks) {
    Json draft = state;
    bool changed = false;
    double now = num(draft,"gameMs");
    auto nextDelay = [&](const Json& listing) {
        double delay = hooks.delay(listing);
        if (!std::isfinite(delay) || delay < 60000) throw std::invalid_argument("Invalid buyer delay");
        return delay;
    };
    for (auto it = draft["listings"].begin(); it != draft["listings"].end();) {
        auto& listing = it.value();
        Money id = listing.at("carId");
        if (!cars.contains(it.key()) || std::find(draft.at("garage").begin(),draft.at("garage").end(),Json(id)) == draft.at("garage").end()) {
            it = draft["listings"].erase(it); changed = true; continue;
        }
        bool paused = hooks.moving(id);
        std::size_t count = 0;
        for (const auto& p : draft.at("pending")) if (p.value("carId",0LL) == id) {
            if (p.value("type","") == "meet") paused = true;
            if (p.value("type","") == "ad") ++count;
        }
        if (!paused && num(listing,"nextBuyerAt") <= now) {
            while (count < 3 && num(listing,"nextBuyerAt") <= now) {
                double arrived = num(listing,"nextBuyerAt");
                auto offer = makeNativeBuyerOffer(listing,cars.at(it.key()),tradeCars,draft,arrived,hooks);
                draft["pending"].push_back(std::move(offer));
                ++count;
                listing["nextBuyerAt"] = arrived+nextDelay(listing);
                changed = true;
            }
            if (num(listing,"nextBuyerAt") <= now) {
                listing["nextBuyerAt"] = now+nextDelay(listing);
                changed = true;
            }
        }
        ++it;
    }
    if (changed) state.swap(draft);
    return changed;
}
}
