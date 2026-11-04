#pragma once
#include "career.hpp"
#include "signature_reminder.hpp"
namespace perekup {
inline SignatureReminder remindNativeOrderSignature(Json& s,const std::string& context,const std::string& id,const Json& offers,const std::function<void(const Json&)>& persist){SignatureReminder out;auto fail=[&](const std::string& error){out.error=error;return out;};if(s.at("marketRisks").at("seizures").size()>=5||!validIdentity(s.at("playerIdentity"))||!s["playerIdentity"]["signature"].is_string())return fail("Напоминание недоступно.");std::string key;
 if(context=="client"){bool valid=false;for(const auto& order:s.at("career").at("orders"))if(order.value("id","")==id&&order.value("status","")=="active"&&num(s,"gameMs")<num(order,"deadline"))valid=true;if(!valid)return fail("Заказ уже недоступен.");key="client:"+id;}
 else if(context=="place"){if(!offers.contains(id)||offers.at(id).value("legacy",false))return fail("Поставка недоступна.");for(const auto& order:s.at("commerce").at("orders"))if(order.value("offerId","")==id)return fail("Договор уже подписан.");key="supply:"+id;}
 else if(context=="accept"){for(const auto& order:s.at("commerce").at("orders"))if(order.value("id","")==id&&order.value("stage","")=="ready")key="supply:"+order.at("offerId").get<std::string>();if(key.empty())return fail("Поставка ещё не готова к выдаче.");}
 else return fail("Нет активного договора.");
 if(s.contains("signatureReminders")&&s["signatureReminders"].contains(key)&&s["signatureReminders"][key].value("paid",false)){out.ok=true;out.signature=s["playerIdentity"]["signature"];return out;}
 Json d=s;if(!careerSpend(d,10000,"Штраф за напоминание подписи"))return fail("Для напоминания нужно 10 000 ₽.");if(!d.contains("signatureReminders"))d["signatureReminders"]=Json::object();d["signatureReminders"][key]={{"paid",true},{"amount",10000},{"when",s["gameMs"]}};auto signature=d["playerIdentity"]["signature"].get<std::string>();persist(d);s.swap(d);out.ok=true;out.charged=true;out.signature=signature;return out;
}
}
