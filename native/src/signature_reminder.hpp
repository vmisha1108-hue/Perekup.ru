#pragma once
#include "identity.hpp"
namespace perekup {
struct SignatureReminder {bool ok=false;bool charged=false;std::string signature;std::string error;};
// Explicit paid reminder. Its receipt belongs to one draft and survives reloads.
// Return the secret only after persisting the debit and receipt together.
inline SignatureReminder remindContractSignature(Json& live,const std::function<void(const Json&)>& persist){
 SignatureReminder out;
 auto fail=[&](const std::string& error){out.error=error;return out;};
 if(live.at("marketRisks").at("seizures").size()>=5)return fail("Игра окончена.");
 if(!live.contains("chat")||!live["chat"].is_object())return fail("Нет активного договора.");
 const auto& chat=live["chat"];if(chat.value("done",false)||chat.value("stage","")!="contract")return fail("Нет активного договора.");
 const auto& identity=live.at("playerIdentity");if(!validIdentity(identity)||!identity["signature"].is_string())return fail("Сначала задайте подпись из четырёх заглавных латинских букв.");
 std::size_t index=0;for(;index<live.at("pending").size();index++)if(live["pending"][index].value("id","")==chat.value("pid",""))break;
 if(index==live["pending"].size()||!live["pending"][index].contains("contract"))return fail("Черновик договора не найден.");
 const auto& draft=live["pending"][index]["contract"];
 if(draft.at("carId")!=chat.at("car").at("id")||draft.at("price")!=chat.at("price")||draft.at("mode")!=chat.at("mode"))return fail("Условия договора изменились.");
 const auto receipt=draft.value("signatureReminder",Json::object());
 if(receipt.is_object()&&receipt.value("paid",false)&&receipt.value("amount",0LL)==10000&&receipt.value("contractId","")==draft.value("id","")){out.ok=true;out.signature=identity["signature"];return out;}
 Json staged=live;Bank bank([]{return .5;});bank.balance=staged.at("balance");bank.state=staged.at("bank");bank.now=num(staged,"gameMs");
 if(!bank.changeBalance(-10000,"Штраф за напоминание подписи: "+draft.value("number",""),"expense",bank.now))return fail("Для напоминания подписи нужно 10 000 ₽.");
 staged["balance"]=bank.balance;staged["bank"]=bank.state;staged["pending"][index]["contract"]["signatureReminder"]={{"paid",true},{"amount",10000},{"contractId",draft.at("id")},{"when",bank.now}};
 auto signature=identity["signature"].get<std::string>();persist(staged);live.swap(staged);out.ok=true;out.charged=true;out.signature=std::move(signature);return out;
}
}
