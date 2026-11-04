#pragma once
#include "negotiation.hpp"
namespace perekup {
inline std::string nativeChatKey(const std::string& mode, Money carId, const std::string& pid = "") {
    return mode + ":" + std::to_string(carId) + (mode == "sell" && !pid.empty() ? ":" + pid : "");
}
inline bool removeRetiredDialogueJobs(Json& state){bool changed=false;auto strip=[&](Json& chat){if(!chat.is_object())return;for(auto it=chat.begin();it!=chat.end();){if(it.key().rfind("pilot",0)==0){it=chat.erase(it);changed=true;}else ++it;}};if(state.contains("chat"))strip(state["chat"]);if(state.contains("chatStore")&&state["chatStore"].is_object())for(auto& chat:state["chatStore"])strip(chat);return changed;}
inline void rememberNativeChat(Json& state) {
    if (!state.contains("chat") || !state["chat"].is_object()) return;
    auto saved = state["chat"];
    if (!saved.contains("pid") || saved["pid"].is_null()) saved["pid"] = "";
    saved["carId"] = saved.at("car").at("id");
    auto key = nativeChatKey(saved.at("mode"), saved.at("carId"), saved.at("pid"));
    state["chatStore"][key] = std::move(saved);
}
}
