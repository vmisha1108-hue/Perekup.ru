#pragma once
#include "bank.hpp"
namespace perekup {
inline constexpr int tutorialStepCount=9;
inline Json nativeTutorialProgress(const Json& s){if(s.contains("tutorialProgress")&&s.at("tutorialProgress").is_object()){const auto& p=s.at("tutorialProgress");auto status=p.contains("status")&&p["status"].is_string()?p["status"].get<std::string>():std::string();if(p.value("version",Json())==1&&(status=="active"||status=="done"||status=="skipped"))return {{"version",1},{"status",status},{"step",std::clamp(p.contains("step")&&p["step"].is_number_integer()?int(std::clamp(p["step"].get<Money>(),Money(0),Money(tutorialStepCount-1))):0,0,tutorialStepCount-1)}};}return {{"version",1},{"status",s.value("onboardingComplete",false)?"done":"active"},{"step",0}};}
inline bool nativeTutorialAction(Json& s,const std::string& action,int requested,const std::function<void(const Json&)>& persist){if(s.at("marketRisks").at("seizures").size()>=5)return false;Json d=s;auto progress=nativeTutorialProgress(d);if(action=="start"){progress["status"]="active";progress["step"]=std::clamp(requested,0,tutorialStepCount-1);}else if(action=="step"){if(progress["status"]!="active"||requested<0||requested>=tutorialStepCount)return false;progress["step"]=requested;}else if(action=="finish"||action=="skip"){if(progress["status"]!="active"||(action=="finish"&&progress["step"]!=tutorialStepCount-1))return false;progress["status"]=action=="finish"?"done":"skipped";}else return false;d["tutorialProgress"]=progress;d["onboardingComplete"]=progress["status"]!="active";persist(d);s.swap(d);return true;}
}

namespace perekup {
inline Json tutorialPurchaseIds(const Json& state) {
    Json ids = Json::array();
    for (const auto& record : state.at("contracts").at("records"))
        if (record.value("mode", "") == "buy") ids.push_back(record.at("id"));
    return ids;
}

inline bool tutorialPurchaseCompleted(const Json& state, const Json& baseline) {
    const auto current = tutorialPurchaseIds(state);
    return std::any_of(current.begin(), current.end(), [&](const Json& id) {
        return std::find(baseline.begin(), baseline.end(), id) == baseline.end();
    });
}
}
