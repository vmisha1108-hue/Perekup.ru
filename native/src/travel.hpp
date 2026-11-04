#pragma once
#include "bank.hpp"
namespace perekup {
inline double distanceBetweenCities(const Json& a,const Json& b){
 if(a["id"]==b["id"])return 0;
 constexpr double rad=3.14159265358979323846/180.;
 double lat=(num(b,"lat")-num(a,"lat"))*rad,lon=(num(b,"lon")-num(a,"lon"))*rad;
 double h=std::sin(lat/2)*std::sin(lat/2)+std::cos(num(a,"lat")*rad)*std::cos(num(b,"lat")*rad)*std::sin(lon/2)*std::sin(lon/2);
 return 6371.0088*2*std::atan2(std::sqrt(std::min(1.,h)),std::sqrt(std::max(0.,1-h)));
}
inline bool ferryRoute(const Json& a,const Json& b){return a["name"]=="Калининград"||b["name"]=="Калининград";}
inline Money roadDistance(const Json& a,const Json& b){return Money(std::max(1.,jsRound(distanceBetweenCities(a,b)*(ferryRoute(a,b)?1.55:1.3))));}
inline std::string groupedRussian(Money amount){std::string text=std::to_string(amount),out;for(std::size_t i=0;i<text.size();i++){if(i&&(text.size()-i)%3==0)out+="\xc2\xa0";out+=text[i];}return out;}
inline Json routeOptions(const Json& from,const Json& target,bool drivingAvailable){
 Json out=Json::array();if(from.is_null()||target.is_null()||from["id"]==target["id"])return out;
 double road=roadDistance(from,target),direct=distanceBetweenCities(from,target);bool ferry=ferryRoute(from,target);
 std::string names=from["name"].get<std::string>()+" "+target["name"].get<std::string>();bool regional=names.find("Алдан")!=std::string::npos||names.find("Магдагачи")!=std::string::npos;
 out.push_back({{"mode","train"},{"label","🚆 Поезд"},{"price",std::ceil((800+road*2.4)/100)*100},{"hours",std::ceil(2+road/55+(ferry?36:0)+(regional?6:0))},{"note","С пересадками при необходимости. Самый недорогой общественный транспорт."}});
 out.push_back({{"mode","plane"},{"label","✈️ Самолёт"},{"price",std::ceil((4500+direct*5.5+(regional?3000:0))/100)*100},{"hours",std::ceil(3+direct/750+(regional?5:0))},{"note",regional?"Через ближайший аэропорт: трансфер включён в цену и время.":"Дорога в аэропорт и регистрация включены."}});
 if(road<=1500&&!ferry)out.push_back({{"mode","taxi"},{"label","🚕 Междугороднее такси"},{"price",std::ceil((700+road*40)/100)*100},{"hours",std::ceil(1+road/70)},{"note","От двери до двери. Доступно на маршрутах до 1 500 км."}});
 if(drivingAvailable)out.push_back({{"mode","drive"},{"label","🚗 Своим ходом"},{"price",std::ceil((road*6+(ferry?12000:0))/100)*100},{"hours",std::ceil(road/70+std::floor(road/700)*10+(ferry?36:0))},{"note",std::string("Топливо и дорожные расходы включены. Длинный путь учитывает отдых")+(ferry?" и паром":"")+". К пробегу: +"+groupedRussian(Money(road))+" км."}});
 for(auto& option:out){option["distance"]=road;option["duration"]=std::max(1.,num(option,"hours"))*3600000;}
 return out;
}
inline Json shippingQuote(const Json& from,const Json& home,bool moving){
 if(from.is_null()||from["id"]==home["id"]||moving)return nullptr;
 double distance=roadDistance(from,home);bool ferry=from["name"]=="Калининград";
 return {{"distance",distance},{"price",std::ceil((5000+distance*12+(ferry?12000:0))/100)*100},{"duration",(24+std::ceil(distance/700)*24+(ferry?36:0))*3600000}};
}
}
