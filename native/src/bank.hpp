#pragma once
#include "json.hpp"
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <functional>
#include <string>
#include <vector>
namespace perekup {
using Json=nlohmann::json;
using Money=std::int64_t;
inline constexpr double day=86400000,month=30*day;
inline constexpr double collectorGrace=30*day;
inline constexpr Money safeInteger=9007199254740991LL;
inline double num(const Json& j,const char* key,double fallback=0){auto i=j.find(key);return i!=j.end()&&i->is_number()?i->get<double>():fallback;}
inline double jsRound(double n){
 // Adding .5 first rounds large odd integers upward in binary64.
 // Compare the fractional part instead, as ECMAScript Math.round does.
 if(!std::isfinite(n)||n==0)return n;
 double lower=std::floor(n);
 double rounded=(n-lower<.5)?lower:lower+1;
 return rounded==0?std::copysign(0.,n):rounded;
}
// Native implementation of bank.js domain rules. Clock, UI and collectors are external.
class Bank {
public:
 Money balance=100000;double now=0;bool gameOver=false;Json state;std::function<double()> random;
 static constexpr Money amounts[]={50000,100000,500000,1000000,10000000,100000000};
 static constexpr int terms[]={6,12,24,36};
 explicit Bank(std::function<double()> rng):random(std::move(rng)){reset();}
 void reset(){state={{"version",1},{"sequence",0},{"revision",0},{"knownBalance",balance},{"entries",Json::array()},{"loans",Json::array()},{"application",nullptr},{"nextApplicationAt",0},{"repaidCredits",0},{"missedPayments",0},{"selection",{{"amount",50000},{"months",12},{"microAmount",10000}}},{"microQuote",nullptr}};}
 static bool validAmount(Money a){return std::find(std::begin(amounts),std::end(amounts),a)!=std::end(amounts);}
 static bool validTerm(int m){return std::find(std::begin(terms),std::end(terms),m)!=std::end(terms);}
 static bool validMicro(Money a){return a>=10000&&a<=100000&&a%10000==0;}
 int draw(int lo,int hi){return lo+int(std::floor(random()*(hi-lo+1)));}
 void revision(){state["revision"]=num(state,"revision")+1;}
 double sequence(){double n=num(state,"sequence")+1;state["sequence"]=n;return n;}
 std::string id(char prefix){return std::string(1,prefix)+std::to_string(Money(sequence()));}
 Json* active(const std::string& kind){for(auto& l:state["loans"])if(l["kind"]==kind&&l["status"]=="active")return &l;return nullptr;}
 static double debtCents(const Json& l){return std::max(0.,num(l,"principalCents")+num(l,"interestCents")+num(l,"feesCents"));}
 static Money debt(const Json& l){return Money(std::max(0.,std::ceil((debtCents(l)-.000001)/100)));}
 static double overdueCents(const Json& l){if(l["status"]!="active"||!(num(l,"arrearsCents")>0))return 0;if(l["kind"]=="micro"||l["nextDueAt"].is_null())return debtCents(l);return std::min(debtCents(l),num(l,"arrearsCents")+num(l,"feesCents"));}
 Money overdue()const{Money n=0;for(const auto& l:state["loans"])n+=Money(std::ceil(overdueCents(l)/100));return n;}
 void record(Money amount,const std::string& label,const std::string& kind,double when){
  if(!amount&&kind!="opening")return;
  Json e={{"id",sequence()},{"amount",amount},{"label",label},{"kind",kind},{"when",when},{"balance",balance}};
  auto& entries=state["entries"];entries.insert(entries.begin(),e);if(entries.size()>500)entries.erase(entries.begin()+500,entries.end());state["knownBalance"]=balance;revision();
 }
 void syncBalance(){Money known=Money(num(state,"knownBalance",balance));if(known!=balance)record(balance-known,"Корректировка баланса","adjustment",now);}
 bool changeBalance(Money amount,const std::string& label,const std::string& kind,double when){
  if(gameOver||std::abs(double(amount))>safeInteger||amount>safeInteger-balance||amount< -balance)return false;
  syncBalance();balance+=amount;record(amount,label,kind,when);return true;
 }
 Json quote(Money amount,int months){
  if(!validAmount(amount)||!validTerm(months))return nullptr;
  double apr=20+(amount>=10000000?4:amount>=500000?2:0)+(active("micro")?4:0)+std::min(4.,num(state,"missedPayments"));
  apr=std::max(18.,apr-std::min(2.,num(state,"repaidCredits")));
  double rate=apr/100*30/365,installment=std::ceil(amount*rate/(1-std::pow(1+rate,-months))),remaining=amount,total=0;
  for(int i=0;i<months;i++){double due=remaining*(1+rate),payment=i==months-1?std::ceil(due-.000001):std::min(installment,std::ceil(due-.000001));total+=payment;remaining=std::max(0.,due-payment);}
  return {{"amount",amount},{"months",months},{"apr",apr},{"installment",installment},{"total",total},{"overpayment",total-amount}};
 }
 double chance(Money amount,double assets)const{
  double base=amount==50000?.90:amount==100000?.85:amount==500000?.75:amount==1000000?.65:amount==10000000?.40:.25,debts=0;
  for(const auto& l:state["loans"])if(l["status"]=="active")debts+=debt(l);
  return std::clamp(base+std::min(.25,std::max(0.,balance+assets-debts)/amount*.1)+std::min(.12,num(state,"repaidCredits")*.03)-std::min(.30,num(state,"missedPayments")*.05),.10,.98);
 }
 bool request(Money amount,int months,double assets=0){
  if(gameOver)return false;Json q=quote(amount,months);const auto& app=state["application"];
  if(q.is_null()||active("credit")||overdue()||now<num(state,"nextApplicationAt")||(!app.is_null()&&(app["status"]=="review"||app["status"]=="approved")))return false;
  double delay=draw(15,180)*60000.;bool approved=random()<chance(amount,assets);
  state["application"]={{"id",id('a')},{"quote",q},{"status","review"},{"submittedAt",now},{"decisionAt",now+delay},{"approved",approved}};revision();return true;
 }
 bool accept(){
  if(gameOver)return false;const Json app=state["application"];
  if(app.is_null()||app["status"]!="approved"||active("credit")||overdue())return false;
  Json q=app["quote"];Money amount=q["amount"];if(amount>safeInteger-balance)return false;
  state["loans"].push_back({{"id",id('l')},{"kind","credit"},{"status","active"},{"amount",amount},{"principalCents",amount*100.},{"interestCents",0},{"feesCents",0},{"feeTotalCents",0},{"arrearsCents",0},{"createdAt",now},{"accruedAt",now},{"nextDueAt",now+month},{"months",q["months"]},{"apr",q["apr"]},{"installment",q["installment"]},{"plannedTotal",q["total"]},{"period",0},{"paid",0},{"overdueAt",nullptr}});
  state["application"]=nullptr;revision();return changeBalance(amount,"Выдача банковского кредита","credit",now);
 }
 Json microQuote(Money amount){
  if(!validMicro(amount))return nullptr;
  if(state["microQuote"].is_null()||state["microQuote"]["amount"]!=amount){double mult=draw(200,300)/100.;state["microQuote"]={{"amount",amount},{"multiplier",mult},{"total",jsRound(amount*mult)},{"days",14}};}
  return state["microQuote"];
 }
 bool micro(Money amount){
  if(gameOver||active("micro")||!validMicro(amount)||amount>safeInteger-balance)return false;Json q=microQuote(amount);
  state["loans"].push_back({{"id",id('l')},{"kind","micro"},{"status","active"},{"amount",amount},{"principalCents",num(q,"total")*100},{"interestCents",0},{"feesCents",0},{"feeTotalCents",0},{"arrearsCents",0},{"createdAt",now},{"accruedAt",now},{"nextDueAt",now+14*day},{"dueAt",now+14*day},{"multiplier",q["multiplier"]},{"plannedTotal",q["total"]},{"paid",0},{"dueProcessed",false},{"overdueAt",nullptr}});
  revision();return changeBalance(amount,"Микрозайм: мгновенная выдача","micro",now);
 }
 static void accrue(Json& l,double until){
  if(l["status"]!="active"||until<=num(l,"accruedAt"))return;double elapsed=until-num(l,"accruedAt");
  if(l["kind"]=="credit")l["interestCents"]=num(l,"interestCents")+num(l,"principalCents")*num(l,"apr")/100*elapsed/(365*day);
  if(num(l,"arrearsCents")>0){double room=std::max(0.,num(l,"amount")*100*.10-num(l,"feeTotalCents")),fee=std::min(room,num(l,"arrearsCents")*.001*elapsed/day);l["feesCents"]=num(l,"feesCents")+fee;l["feeTotalCents"]=num(l,"feeTotalCents")+fee;}
  l["accruedAt"]=until;
 }
 bool pay(Json& l,Money amount,double when,bool automatic=false){
  if(gameOver||l["status"]!="active"||amount<=0||amount>balance||amount>safeInteger)return false;amount=std::min(amount,debt(l));if(!amount)return false;
  double feeBefore=num(l,"feesCents"),cents=amount*100.,part=std::min(cents,feeBefore);l["feesCents"]=feeBefore-part;cents-=part;
  part=std::min(cents,num(l,"interestCents"));l["interestCents"]=num(l,"interestCents")-part;cents-=part;l["principalCents"]=std::max(0.,num(l,"principalCents")-cents);
  l["arrearsCents"]=std::max(0.,num(l,"arrearsCents")-std::max(0.,amount*100.-feeBefore));l["paid"]=num(l,"paid")+amount;
  changeBalance(-amount,std::string(automatic?"Автоплатёж: ":"Погашение: ")+(l["kind"]=="credit"?"банковский кредит":"микрозайм"),"repayment",when);
  if(debtCents(l)<.000001){l["status"]="repaid";l["closedAt"]=when;l["arrearsCents"]=0;l["overdueAt"]=nullptr;if(l["kind"]=="credit")state["repaidCredits"]=num(state,"repaidCredits")+1;}else if(num(l,"arrearsCents")==0)l["overdueAt"]=nullptr;
  revision();return true;
 }
 bool collect(Json& l,double when){Money due=Money(std::ceil((overdueCents(l)-.000001)/100));return due>0&&balance>0?pay(l,std::min(balance,due),when,true):false;}
 void tick(){
  if(gameOver)return;syncBalance();auto& app=state["application"];
  if(!app.is_null()&&app["status"]=="review"&&now>=num(app,"decisionAt")){app["status"]=app["approved"].get<bool>()?"approved":"declined";if(!app["approved"].get<bool>())state["nextApplicationAt"]=num(app,"decisionAt")+6*3600000;revision();}
  for(int event=0;event<100;event++){
   Json* next=nullptr;
   for(auto& l:state["loans"])if(l["status"]=="active"&&!l["nextDueAt"].is_null()&&num(l,"nextDueAt")<=now&&(l["kind"]=="credit"||!l.value("dueProcessed",false)))if(!next||num(l,"nextDueAt")<num(*next,"nextDueAt"))next=&l;
   if(!next)break;double at=num(*next,"nextDueAt");for(auto& l:state["loans"])accrue(l,at);auto& l=*next;
   if(l["kind"]=="credit"){l["period"]=num(l,"period")+1;bool end=num(l,"period")>=num(l,"months");double total=num(l,"principalCents")+num(l,"interestCents");l["arrearsCents"]=std::min(total,end?total:num(l,"arrearsCents")+num(l,"installment")*100);l["nextDueAt"]=end?Json(nullptr):Json(at+month);}else{l["arrearsCents"]=l["principalCents"];l["dueProcessed"]=true;}
   collect(l,at);if(l["status"]=="active"&&num(l,"arrearsCents")>0){if(num(l,"overdueAt")==0)l["overdueAt"]=at;state["missedPayments"]=num(state,"missedPayments")+1;}revision();
  }
  for(auto& l:state["loans"])accrue(l,now);std::vector<std::size_t> indices;
  for(std::size_t i=0;i<state["loans"].size();i++)if(overdueCents(state["loans"][i])>0)indices.push_back(i);
  std::stable_sort(indices.begin(),indices.end(),[&](auto a,auto b){auto& l=state["loans"][a];auto& r=state["loans"][b];return num(l,"overdueAt",num(l,"dueAt"))<num(r,"overdueAt",num(r,"dueAt"));});
  for(auto i:indices)collect(state["loans"][i],now);
 }
};
}
