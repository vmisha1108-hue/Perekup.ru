#include "session.hpp"
#include "meeting_session.hpp"
#include "contract_signing.hpp"
#include "signature_reminder.hpp"
#include <iostream>
#define CHECK(x) do{if(!(x))throw std::runtime_error("Purchase journey failed at line "+std::to_string(__LINE__));}while(false)
int main(){using namespace perekup;
 Json car={{"id",1},{"name","Тестовый автомобиль"},{"price",50000},{"cityId","home"},{"seller",{{"name","Иван"},{"avatar","X"},{"personality","neutral"}}}},cars={{"1",car}},cities={{"home",{{"id","home"},{"name","Москва"}}}};
 auto root=fs::temp_directory_path()/("perekup-journey-"+std::to_string(std::chrono::steady_clock::now().time_since_epoch().count()));
 try{
 {Session s(root,cities,cars,"home");s.create("Игрок","TEST",3600000);auto draft=s.state;CHECK(beginNativeBuyChat(draft,car,[]{return .9;})=="opened");CHECK(negotiate(draft["chat"],50000,100000,[]{return .9;}).action=="agreed");CHECK(scheduleNativeMeeting(draft,5400000,30,"journey","Встреча",[]{return .9;})=="accepted");rememberNativeChat(draft);s.commit(draft);}
 {Session s(root,cities,cars,"home");CHECK(s.load().status==LoadStatus::Loaded);auto draft=s.state;draft["gameMs"]=5400000;CHECK(enterNativeMeeting(draft,"journey",[]{return .9;})=="entered");s.commit(draft);}
 {Session s(root,cities,cars,"home");CHECK(s.load().status==LoadStatus::Loaded);auto draft=s.state;CHECK(enterNativeMeeting(draft,"journey",[]{return .2;})=="restored");draft["gameMs"]=9000000;int inspections=0;CHECK(tickNativeMeeting(draft,[]{return .9;},[&](Json&,Money){++inspections;}));CHECK(inspections==1);Meeting meeting([]{return .9;});CHECK(meeting.agree(draft["chat"],[](Money){return true;}));auto vehicle=contractDocumentIds(1,true);vehicle["name"]=car["name"];vehicle["year"]=2000;vehicle["color"]="белый";vehicle["description"]="Тест";Json other={{"fullName","Иван"},{"passport","4501 123456"},{"address","Москва, дом 1"}};CHECK(beginContract(draft["chat"],draft["pending"][0],draft["contracts"],draft["playerIdentity"],cities["home"],vehicle,other,9000000));rememberNativeChat(draft);s.commit(draft);}
 {Session s(root,cities,cars,"home");CHECK(s.load().status==LoadStatus::Loaded);auto draft=s.state;auto reminder=remindContractSignature(draft,[&](const Json& saved){s.commit(saved);});CHECK(reminder.ok&&draft["balance"]==90000);draft=s.state;auto& contract=draft["pending"][0]["contract"];fillContractAssist(contract,draft["contracts"],draft["playerIdentity"]);CHECK(contract["fields"]["signature"]=="");contract["acknowledged"]=true;Deals deals(cities,cars,"home",[]{return .9;});CHECK(!signContract(draft,deals,cars,[](const Json&){throw std::runtime_error("Must not save invalid signature");}).empty());contract["fields"]["signature"]="TEST";CHECK(signContract(draft,deals,cars,[&](const Json& saved){s.commit(saved);}).empty());CHECK(s.state["balance"]==40000&&s.state["garage"]==Json::array({1}));}
 {Session s(root,cities,cars,"home");CHECK(s.load().status==LoadStatus::Loaded);CHECK(s.state["balance"]==40000&&s.state["garage"]==Json::array({1}));CHECK(s.state["contracts"]["records"].size()==1);Deals deals(cities,cars,"home",[]{return .9;});auto draft=s.state;CHECK(!signContract(draft,deals,cars,[](const Json&){throw std::runtime_error("Duplicate save");}).empty());CHECK(draft==s.state);}
 fs::remove_all(root);std::cout<<"PASS: purchase journey across four restarts, manual signature, reminder debit, one purchase, one contract\n";
 }catch(...){fs::remove_all(root);throw;}
}
