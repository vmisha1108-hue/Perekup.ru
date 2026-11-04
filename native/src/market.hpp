#pragma once
#include "bank.hpp"
#include <regex>
namespace perekup {
// UTF-8 case folding for the ASCII and Cyrillic letters used in the catalogue.
inline std::string lowerCatalogue(std::string s){
 std::string out;for(std::size_t i=0;i<s.size();){unsigned char a=s[i];
  if(a<128){out+=char(a>='A'&&a<='Z'?a+32:a);++i;}
  else if(i+1<s.size()&&(a==0xd0||a==0xd1)){
   unsigned char b=s[i+1];unsigned cp=((a&31)<<6)|(b&63);if(cp>=0x410&&cp<=0x42f)cp+=32;else if(cp==0x401)cp=0x451;
   out+=char(0xc0|(cp>>6));out+=char(0x80|(cp&63));i+=2;
  }else{out+=s[i++];}
 }return out;
}
inline double basePrice(const Json& car){double b=num(car,"basePrice");return b?b:num(car,"price");}
inline Money estimateMarketPrice(const Json& car){
 double original=basePrice(car);if(num(car,"marketPrice"))return Money(num(car,"marketPrice"));
 std::string name=lowerCatalogue(car.value("name",std::string())),description=lowerCatalogue(car.value("desc",std::string())+" "+car.value("full",std::string()));
 static const std::regex yearPattern("(?:19|20)[0-9]{2}\\s*$");std::smatch match;bool hasYear=std::regex_search(name,match,yearPattern);int year=hasYear?std::stoi(match.str()):1990;
 if(original<=100000&&std::regex_search(description,std::regex("ремонт|проект|восстанов|не на ходу")))return Money(std::max(original,year>=2010?85000.:year>=2000?65000.:25000.));
 if(car.value("legend",false)||std::regex_search(name,std::regex("supra|skyline|chaser|mark ii|rx-7|evolution|ferrari|lamborghini|bugatti|911|зил|газ 51")))return Money(original);
 static const std::vector<std::pair<std::regex,double>> rules={
  {std::regex("camry"),1100000},{std::regex("corolla|avensis"),700000},{std::regex("rav4|cr-v|forester"),1150000},
  {std::regex("land cruiser(?! prado)"),2400000},{std::regex("prado"),2000000},{std::regex("cayenne|touareg"),1900000},
  {std::regex("escalade"),2400000},{std::regex("bmw.*(?:x6|x5)"),2000000},{std::regex("bmw|mercedes|lexus|audi"),1300000},
  {std::regex("solaris|rio|polo"),650000},{std::regex("focus|octavia|mazda 6|accord"),750000},{std::regex("logan|sandero|geely mk"),380000},
  {std::regex("nexia|matiz"),250000},{std::regex("yaris|fit|march|note|probox"),550000},{std::regex("лада|lada|ваз|vaz"),280000}};
 if(!hasYear)return Money(original);for(const auto& rule:rules)if(std::regex_search(name,rule.first)){
  double reference=rule.second*std::clamp(std::pow(1.075,year-2010),.32,3.5);
  return Money(jsRound(std::clamp(original,reference*.65,reference*1.8)/1000)*1000);
 }return Money(original);
}
inline Json marketSession(Json& cars,const Json& previous,const std::function<double()>& random){
 Json moods=Json::object();double movement=.98+random()*.04;
 for(auto& car:cars){
  if(!car.contains("basePrice")||!car["basePrice"].is_number())car["basePrice"]=car["price"];
  if(!car.contains("referenceMarketPrice")||!car["referenceMarketPrice"].is_number())car["referenceMarketPrice"]=estimateMarketPrice(car);
  car["marketPrice"]=car["referenceMarketPrice"];std::string key=std::to_string(car["id"].get<Money>());
  std::vector<std::string> choices;for(const std::string m:{"kind","neutral","evil"})if(!previous.contains(key)||previous[key]!=m)choices.push_back(m);
  std::string mood=choices.at(std::min(choices.size()-1,std::size_t(std::floor(random()*choices.size()))));
  car["seller"]["personality"]=mood;moods[key]=mood;double roll=random();double factor=mood=="kind"?.85+roll*.09:mood=="evil"?1.08+roll*.14:.97+roll*.06;
  car["marketPrice"]=std::clamp(jsRound(num(car,"marketPrice")*movement/500)*500,10000.,99000000.);
  car["price"]=std::clamp(jsRound(num(car,"marketPrice")*factor/500)*500,10000.,99000000.);
 }return moods;
}
inline Json priceAssessment(const Json& c,double ask){double market=num(c,"marketPrice");if(!market)market=num(c,"price");double ratio=ask/market;return ratio<.95?Json{{"label","Ниже рынка"},{"tone","below"}}:ratio>1.07?Json{{"label","Выше рынка"},{"tone","above"}}:Json{{"label","Хорошая цена"},{"tone","fair"}};}
inline Json rollMarketRisk(const Json& c,const std::function<double()>& random){
 bool stolen=random()<.03,defect=random()<.30;int type=int(std::floor(random()*6));
 static const double factors[]={.13,.11,.08,.045,.06,.07};static const Money minimum[]={18000,15000,12000,7000,9000,10000};
 double cost=std::max(double(minimum[type]),std::min(350000.,jsRound(basePrice(c)*factors[type]/500)*500));bool manual=random()<.05,picker=random()<.30;
 return {{"stolen",stolen},{"defect",defect},{"type",type},{"repairCost",cost},{"manualFound",manual},{"pickerFound",picker},{"manualChecked",false},{"pickerChecked",false},{"pickerPaid",0},{"purchased",false},{"discovered",false},{"repaired",false}};
}
// Inspection keeps the random result fixed and charges for professional inspection only once.
inline bool inspectMarketRisk(Json& risk,bool professional,const std::function<bool(Money)>& spend){
 if(risk.is_null()||risk.value("purchased",false))return false;
 const char* key=professional?"pickerChecked":"manualChecked";if(risk.value(key,false))return false;
 if(professional){if(!spend(3000))return false;risk["pickerPaid"]=3000;}
 risk[key]=true;if(risk.value("defect",false)&&risk.value(professional?"pickerFound":"manualFound",false))risk["discovered"]=true;
 return true;
}
}
