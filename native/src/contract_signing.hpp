#pragma once
#include "contracts.hpp"
#include "deals.hpp"
#include "career_sales.hpp"
#include "signed_meetings.hpp"
namespace perekup {
// Called after advancing the shared clock/ticking events. Both contract and
// economic state enter the same durable snapshot, preventing duplicate payment.
inline Json signContract(Json& live,Deals& deals,const Json& cars,const std::function<void(const Json&)>& persist,const Json& acquisition=nullptr){
 auto error=[](const std::string& text){return Json::array({{{"text",text}}});};
 if(!live.contains("chat")||!live["chat"].is_object())return error("Нет активной встречи.");const auto& chat=live["chat"];
 if(chat.contains("trade")&&chat["trade"].is_object())return error("Обмен нельзя провести как обычную продажу.");
 if(chat.value("done",false)||chat.value("stage","")!="contract")return error("Договор уже завершён или недоступен.");
 const Json* meeting=nullptr;for(const auto& p:live.at("pending"))if(p.value("id","")==chat.value("pid","")){meeting=&p;break;}
 if(!meeting||!meeting->contains("contract"))return error("Черновик договора не найден.");const auto& draft=meeting->at("contract");const auto& identity=live.at("playerIdentity");auto errors=contractErrors(draft,identity);if(!errors.empty())return errors;
 if(draft.at("carId")!=chat.at("car").at("id")||draft.at("price")!=chat.at("price")||draft.at("mode")!=chat.at("mode"))return error("Условия встречи изменились. Сделка не может быть подписана.");
 Money id=draft.at("carId"),price=draft.at("price");const auto mode=draft.at("mode").get<std::string>();if(mode!="buy"&&mode!="sell")return error("Некорректный тип договора.");
 for(const auto& old:live.at("contracts").at("records"))if(old.at("id")==draft.at("id"))return error("Этот договор уже подписан.");
 Json player={{"fullName",identity.at("nickname")},{"passport",contractNormal(draft.at("fields").value("passport",""))},{"address",contractNormal(draft.at("fields").value("address",""))},{"signature",identity.at("signature")}};
 Json cost=nullptr;auto k=std::to_string(id);if(live.at("purchasePrices").contains(k))cost=live.at("purchasePrices").at(k);
 Json record={{"version",1},{"id",draft.at("id")},{"number",draft.at("number")},{"mode",mode},{"carId",id},{"city",draft.at("city")},{"createdAt",draft.at("createdAt")},{"signedAt",live.at("gameMs")},{"price",price},{"purchasePrice",mode=="buy"?Json(price):cost},{"vehicle",draft.at("vehicle")},{"seller",mode=="buy"?draft.at("other"):player},{"buyer",mode=="buy"?player:draft.at("other")}};
 if(mode=="buy"){const auto& risks=live.at("marketRisks").at("vehicles");if(risks.contains(k)&&num(risks[k],"pickerPaid")>0){Money paid=Money(num(risks[k],"pickerPaid"));record["purchasePrice"]=price+paid;record["costIncludesExpenses"]=true;record["costBreakdown"]={{"vehicle",price},{"preparation",paid}};}}
 else {
  // Import acquisition costs retain their original breakdown.
  if(acquisition.is_object()&&acquisition.contains("costs")){record["costIncludesExpenses"]=true;record["costBreakdown"]=acquisition["costs"];}
  const auto& vehicles=live.at("career").at("vehicles");if(vehicles.contains(k)){const auto& v=vehicles[k];Money prep=Money(num(v,"repairPaid")),tuning=Money(num(v,"tuningPaid"));if((prep||tuning)&&cost.is_number_integer()){record["costIncludesExpenses"]=true;if(!record.contains("costBreakdown"))record["costBreakdown"]={{"vehicle",cost.get<Money>()-prep-tuning}};if(prep)record["costBreakdown"]["preparation"]=prep;if(tuning)record["costBreakdown"]["tuning"]=tuning;}if(v.contains("appearance"))record["vehicle"]["appearance"]=v["appearance"];}
 }
 auto plan=deals.plan(live,mode,id,price);if(!plan.ok)return error("Сделка отклонена: "+plan.error);
 Deals::commit(live,std::move(plan),[&](Json& staged,const Json& effects){applyCareerDealEffects(staged,effects,cars);auto& book=staged["contracts"];book["records"].insert(book["records"].begin(),record);if(book["records"].size()>100)book["records"].erase(book["records"].begin()+100,book["records"].end());book["profile"]=player;staged["chat"]["done"]=true;staged["chat"]["stage"]="done";staged["chat"]["meetingOutcome"]="success";staged["chat"]["signedContractId"]=record["id"];releaseSignedMeetings(staged);},persist);
 return Json::array();
}
}
