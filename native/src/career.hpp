#pragma once
#include "career_sales.hpp"
#include "garage_upgrades.hpp"
namespace perekup {
struct CareerLevel {const char* name;int sales;Money profit;int reputation;Money price;int places;};
inline constexpr CareerLevel careerLevels[]={{"Частный перекуп",0,0,0,0,0},{"Своя площадка",3,50000,50,150000,2},{"Автобизнес",10,300000,60,600000,5},{"Свой автосалон",25,1000000,75,2000000,10}};
inline Json nativeCarStory(const Json& car){
 if(car.value("newCar",false))return {{"title","Новый автомобиль"},{"text","Предпродажная подготовка выполнена. Проверьте выбранную комплектацию и VIN при выдаче."},{"defect",""},{"repair",0}};
 if((car.value("expanded",false)||car.value("aldanNew",false)||car.value("blagNew",false))&&car.contains("story"))return car.at("story");
 static const char* titles[]={"Продажа перед переездом","Семейный автомобиль","После долгой стоянки","Бережный владелец","Редкая комплектация","Рабочая лошадка"};
 static const char* texts[]={"Владелец переезжает и освобождает парковочное место. Быстрая сделка ему удобнее долгой переписки.","Машиной пользовались каждый день. На осмотре стоит проверить ходовую и следы бытовых повреждений.","Автомобиль некоторое время стоял без движения. Проверьте жидкости, аккумулятор и тормоза.","Владелец готов рассказать об обслуживании. Сверьте его рассказ с состоянием машины.","Автомобиль может заинтересовать ценителя марки. Подбор покупателя потребует терпения.","У машины заметные следы повседневной эксплуатации. Низкая цена требует внимательного осмотра."};
 auto seed=historySeed(car.at("id"));bool cheap=basePrice(car)<=100000;std::string defect=cheap?"Потёртости кузова; нужны расходники и обслуживание подвески.":seed%5==0?"Износ тормозов и подвески: требуется обслуживание.":"";
 return {{"title",titles[seed%6]},{"text",texts[seed%6]},{"defect",defect},{"repair",defect.empty()?0:Money(std::clamp(jsRound(basePrice(car)*.07/500)*500,6000.,90000.))}};
}
inline std::string careerCarBlockReason(const Json& s,Money id){
 auto k=std::to_string(id);if(s.at("marketRisks").at("seizures").size()>=5)return "Игра завершена.";
 if(std::find(s.at("garage").begin(),s.at("garage").end(),Json(id))==s.at("garage").end())return "Автомобиль больше не принадлежит вам.";
 const auto& t=s.at("transport");if(!t.at("trip").is_null())return "Диагностика недоступна во время поездки. Дождитесь прибытия.";
 if(!t.at("vehicles").contains(k))return "Не удалось определить местоположение автомобиля.";
 const auto& v=t.at("vehicles").at(k);if(v.value("place","")=="road"||v.value("place","")=="carrier")return "Автомобиль в пути. Дождитесь окончания перевозки.";
 if(v.at("cityId")!=t.at("cityId"))return "Вы и автомобиль находитесь в разных городах. Приезжайте к машине.";
 for(const auto& p:s.at("pending"))if(p.value("carId",0LL)==id&&p.value("type","")=="meet")return "По машине назначена встреча. Завершите или отмените её в календаре.";
 return "";
}
inline bool careerLocalCar(const Json& s,Money id){return careerCarBlockReason(s,id).empty();}

inline bool careerSpend(Json& d,Money price,const std::string& label){Bank b([]{return .5;});b.state=d.at("bank");b.balance=d.at("balance");b.now=num(d,"gameMs");if(!b.changeBalance(-price,label,"expense",b.now))return false;d["bank"]=b.state;d["balance"]=b.balance;return true;}
inline bool prepareNativeCar(Json& s,const Json& cars,Money id,const std::string& action,const std::function<void(const Json&)>& persist){
 auto k=std::to_string(id);if(!cars.contains(k)||!careerLocalCar(s,id))return false;Json d=s;auto& v=careerVehicle(d["career"],id);auto story=nativeCarStory(cars.at(k));Money price=0;
 if(action=="inspect"){if(v.value("inspected",false))return false;price=1500;v["inspected"]=true;}
 else if(action=="prepare"){price=Money(num(story,"repair"));if(!v.value("inspected",false)||v.value("repaired",false)||price<=0)return false;v["repaired"]=true;}
 else if(action=="mechanical"){auto& risks=d["marketRisks"]["vehicles"];if(!risks.contains(k))return false;auto& r=risks[k];if(!r.value("purchased",false)||!r.value("defect",false)||r.value("repaired",false))return false;price=Money(num(r,"repairCost"));if(price<=0)return false;r["repaired"]=true;}
 else return false;
 Money basis=d["purchasePrices"].contains(k)?d["purchasePrices"][k].get<Money>():Money(basePrice(cars.at(k)));if(price>safeInteger-basis)return false;
 if(!careerSpend(d,price,(action=="inspect"?"Диагностика: ":action=="prepare"?"Подготовка к продаже: ":"Ремонт скрытой поломки: ")+cars.at(k).value("name","")))return false;
 v["repairPaid"]=Money(num(v,"repairPaid"))+price;d["purchasePrices"][k]=basis+price;d["career"]["revision"]=num(d["career"],"revision")+1;persist(d);s.swap(d);return true;
}
inline Json nativeCareerEvent(int cycle){static const char* titles[]={"Спокойный рынок","Сезон поездок за город","Курс валют вырос","Покупатели ищут недорогие машины","Больше электромобилей в продаже","Сезонная распродажа"};static const char* texts[]={"Особых изменений нет. Подбирайте машины и выполняйте заказы.","Спрос на кроссоверы и внедорожники вырос. Рыночная оценка выше на 8%, отклики быстрее.","Новые заказы импорта дороже на 7% по валютной части. Подписанные поставки не пересчитываются.","Рыночная оценка машин до 300 тысяч выросла на 10%, спрос выше.","Рыночная оценка электромобилей ниже на 8%. Новые валютные расчёты импорта дешевле на 4%.","Новые автомобили в салоне дешевле на 3%. Старые договоры не пересчитываются."};int i=cycle%6;return {{"title",titles[i]},{"text",texts[i]}};}
inline void generateNativeCareerOrders(Json& s){auto& c=s["career"];int cycle=c.value("cycle",0),level=c.value("level",0);for(const auto& o:c["orders"])if(o.value("batch",-1)==cycle&&o.value("level",0)==level)return;
 static const char* types[]={"project","budget","family","import","model"};static const char* titles[]={"Первый автомобиль под восстановление","Недорогая машина на каждый день","Семейный автомобиль","Иномарка под заказ из-за границы","Нужна конкретно Audi A6"};static const Money budgets[]={140000,450000,2500000,6500000,3500000},fees[]={18000,30000,80000,160000,100000};static const int days[]={10,12,18,55,21};static const char* people[]={"Анна","Сергей","Марина","Павел","Ирина","Андрей"};
 for(int i=0;i<3;++i){int t=(cycle+i)%(level?5:2);std::string client=people[(cycle*3+i)%6];bool repeat=c["clients"].value(client,0)>0;Money fee=Money(jsRound(fees[t]*(level==3?1.2:1)))+(repeat?fees[t]/10:0)+(num(c,"reputation")>=75?fees[t]/10:0);Money sequence=Money(num(c,"sequence"))+1;c["sequence"]=sequence;c["orders"].push_back({{"id","client-"+std::to_string(sequence)},{"batch",cycle},{"level",level},{"type",types[t]},{"title",titles[t]},{"brand",t==4?"Audi":""},{"model",t==4?"A6":""},{"client",client},{"repeat",repeat},{"budget",budgets[t]},{"fee",fee},{"deadline",num(s,"gameMs")+days[t]*day},{"status","available"},{"cityId",s["transport"]["cityId"]}});}
 auto& orders=c["orders"];orders.erase(std::remove_if(orders.begin(),orders.end(),[&](const Json& o){return o.value("status","")!="active"&&o.value("batch",0)<cycle-4;}),orders.end());while(orders.size()>30)orders.erase(orders.begin());c["revision"]=num(c,"revision")+1;
}
inline void tickNativeCareer(Json& s){auto& c=s["career"];bool changed=false;for(auto& o:c["orders"])if((o.value("status","")=="active"||o.value("status","")=="available")&&num(s,"gameMs")>=num(o,"deadline")){if(o["status"]=="active")c["reputation"]=std::max(0.,num(c,"reputation")-3);o["status"]="expired";changed=true;}
 int cycle=std::max(0,int(std::floor((num(s,"gameMs")-num(c,"startedAt"))/(5*day))));if(cycle!=c.value("cycle",0)){c["cycle"]=cycle;auto e=nativeCareerEvent(cycle);e["when"]=s["gameMs"];c["news"].push_back(e);while(c["news"].size()>12)c["news"].erase(c["news"].begin());changed=true;}generateNativeCareerOrders(s);if(changed)c["revision"]=num(c,"revision")+1;
}
inline bool nativeCareerAction(Json& s,const std::string& action,const std::string& id,const Json& cities,const Json& cars,const std::string& home,const std::function<void(const Json&)>& persist){if(s.at("marketRisks").at("seizures").size()>=5)return false;Json d=s;tickNativeCareer(d);auto& c=d["career"];
 if(action=="upgrade"){int level=c.value("level",0);if(level>=3)return false;const auto& n=careerLevels[level+1];if(num(c,"sales")<n.sales||num(c,"profit")<n.profit||num(c,"reputation")<n.reputation||!careerSpend(d,n.price,std::string("Развитие бизнеса: ")+n.name))return false;int garageLevel=nativeGarageLevel(d);if(garageLevel<0)return false;c["level"]=level+1;d["garageLevel"]=garageLevel;d["garageCapacity"]=garagePlaces[garageLevel]+n.places;Transport t(cities,cars,home);t.state=d["transport"];t.garage=d["garage"];t.capacity=d["garageCapacity"];t.rebalance();d["transport"]=t.state;generateNativeCareerOrders(d);}
 else if(action=="hire"){if(c.value("level",0)<2||c.value("assistant",false)||!careerSpend(d,30000,"Подборщик: договор на сопровождение бизнеса"))return false;c["assistant"]=true;}
 else if(action=="claim"){bool found=false;for(auto& claim:c["complaints"])if(claim.value("id","")==id){if(claim.value("paid",false)||!careerSpend(d,claim.at("amount"),"Урегулирование претензии покупателя"))return false;claim["paid"]=true;c["profit"]=num(c,"profit")-num(claim,"amount");c["reputation"]=std::min(100.,num(c,"reputation")+4);found=true;break;}if(!found)return false;}
 else if(action=="accept"||action=="cancel"){bool found=false;for(auto& o:c["orders"])if(o.value("id","")==id){if(action=="accept"){int active=0;for(const auto& x:c["orders"])active+=x.value("status","")=="active";if(o["status"]!="available"||active>=2||num(d,"gameMs")>=num(o,"deadline"))return false;o["status"]="active";careerStep(c,"order");}else{if(o["status"]!="active")return false;o["status"]="cancelled";c["reputation"]=std::max(0.,num(c,"reputation")-3);}found=true;break;}if(!found)return false;}
 else return false;c["revision"]=num(c,"revision")+1;persist(d);s.swap(d);return true;
}
}
