#pragma once
#include "identity.hpp"
namespace perekup {
// NPC document identity uses matching feminine surname and patronymic.
inline Json contractOtherParty(const Json& npc,const Json& city){
 auto name=npc.value("name","");auto first=name.substr(0,name.find_first_of(" \t\r\n"));
 static const std::vector<std::string> femaleNames={"Анна","Марина","Люба","Любовь","Светлана","Ольга","Елена","Наталья","Наталия","Ирина","Юлия","Татьяна","Мария","Анастасия","Екатерина","Дарья","Ксения","Виктория","Алина","Полина","Софья","София","Валентина","Галина","Надежда","Людмила"};
 bool female=std::find(femaleNames.begin(),femaleNames.end(),first)!=femaleNames.end();
 auto chars=codepoints(first);bool valid=chars.size()>=3;
 for(std::size_t i=0;i<chars.size();++i){auto c=chars[i];if(i==0)valid=valid&&((c>=0x410&&c<=0x42f)||c==0x401);else valid=valid&&((c>=0x430&&c<=0x44f)||c==0x451);}
 if(!valid)first=female?"Анна":"Сергей";
 auto n=std::uint32_t(hashStr("party:"+name));
 return {{"fullName",std::string(female?"Соколова ":"Соколов ")+first+(female?" Александровна":" Александрович")},
 {"passport",std::to_string(1000+n%9000)+" "+std::to_string(100000+n%900000)},
 {"address","г. "+city.value("name","")+", ул. Автомобильная, д. "+std::to_string(1+n%70)}};
}
inline Json contractDocumentIds(Money id,bool moscow){std::uint32_t seed=std::uint32_t(hashStr("vehicle-documents:"+std::to_string(id)));const std::string chars="ABCDEFGHJKLMNPRSTUVWXYZ0123456789";std::string vin="XGM";for(int i=0;i<14;i++){seed=seed*1664525u+1013904223u;vin+=chars[seed%chars.size()];}auto serial=std::to_string(100000+id%900000),region=moscow?std::string("77"):std::to_string(10+id%89);return {{"vin",vin},{"plate","А"+std::to_string(100+id%900)+"МР "+region},{"pts",region+" ТА "+serial},{"sts",region+" 01 "+serial}};}
inline Json contractErrors(const Json& draft,const Json& identity){auto errors=Json::array();const auto& f=draft.at("fields");const auto& vehicle=draft.at("vehicle");auto add=[&](const char* field,const std::string& text){Json e={{"text",text}};if(*field)e["field"]=field;errors.push_back(e);};
 if(!validIdentity(identity)||f.value("fullName","")!=identity.value("nickname",""))add("fullName","Ник должен совпадать с выбранным при первом входе.");auto passport=contractCode(f.value("passport",""));if(passport.size()!=10||!std::all_of(passport.begin(),passport.end(),[](char c){return c>='0'&&c<='9';}))add("passport","В паспорте нужны 4 цифры серии и 6 цифр номера. Например: 4501 123456.");std::size_t length=0;for(auto c:codepoints(contractNormal(f.value("address",""))))length+=c>65535?2:1;if(length<8)add("address","Допишите адрес регистрации персонажа: город, улицу и дом.");
 for(const auto& pair:{std::pair<const char*,const char*>{"vin","VIN"},{"plate","Госномер"},{"pts","ПТС"},{"sts","СТС"}})if(contractCode(f.value(pair.first,""))!=contractCode(vehicle.value(pair.first,"")))add(pair.first,std::string(pair.second)+" не совпадает с игровыми документами автомобиля. Сверьте поле или воспользуйтесь помощью.");
 if(!validIdentity(identity))add("signature","Для договора нужна сохранённая подпись игрока.");
 else if(!identity["signature"].is_string())add("signature","Задайте подпись из четырёх заглавных латинских букв в профиле игрока.");
 else {auto entered=f.value("signature","");if(!validSignature(Json(entered)))add("signature","Введите подпись: четыре заглавные латинские буквы A–Z.");else if(entered!=identity["signature"].get<std::string>())add("signature","Подпись не совпадает. Вспомните её или воспользуйтесь платным напоминанием за 10 000 ₽.");}if(!draft.value("acknowledged",false))add("confirm","Подтвердите, что проверили данные и согласны с условиями сделки.");return errors;
}
inline Json defaultContractProfile(const Json& identity){return {{"fullName",validIdentity(identity)?identity.value("nickname",""):"Игрок"},{"passport","4501 123456"},{"address","г. Москва, ул. Игровая, д. 7, кв. 12"}};}
inline Json freshContracts(const Json& identity){return {{"version",1},{"sequence",0},{"profile",defaultContractProfile(identity)},{"records",Json::array()}};}
inline bool beginContract(Json& chat,Json& meeting,Json& book,const Json& identity,const Json& city,const Json& vehicle,const Json& other,double now){if(chat.value("done",false)||!chat.value("met",false)||!meeting.contains("flow"))return false;if(!meeting.contains("contract")){Money sequence=book.value("sequence",0LL)+1;book["sequence"]=sequence;auto number=std::to_string(sequence);if(number.size()<5)number=std::string(5-number.size(),'0')+number;auto nickname=validIdentity(identity)?identity.value("nickname",""):"";meeting["contract"]={{"version",1},{"id","dkp-"+meeting.at("id").get<std::string>()},{"number","ДКП-"+number},{"mode",chat.at("mode")},{"carId",chat.at("car").at("id")},{"price",chat.at("price")},{"cityId",city.at("id")},{"city",city.at("name")},{"createdAt",now},{"other",other},{"vehicle",vehicle},{"fields",{{"fullName",nickname},{"signature",""},{"passport",""},{"address",""},{"vin",""},{"plate",""},{"pts",""},{"sts",""}}},{"acknowledged",false}};}
 meeting["price"]=meeting["contract"]["price"];meeting["flow"]["stage"]="contract";meeting["flow"]["event"]=nullptr;chat["stage"]="contract";chat["price"]=meeting["price"];chat["event"]=nullptr;return true;}
inline void fillContractAssist(Json& draft,const Json& book,const Json& identity){for(const char* key:{"fullName","passport","address"})draft["fields"][key]=book.at("profile").at(key);if(validIdentity(identity))draft["fields"]["fullName"]=identity["nickname"];for(const char* key:{"vin","plate","pts","sts"})draft["fields"][key]=draft.at("vehicle").at(key);draft["fields"]["signature"]="";draft["acknowledged"]=false;}
}
