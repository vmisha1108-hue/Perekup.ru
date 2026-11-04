#include "bank.hpp"
#include <cassert>
#include <iostream>
int main(){using namespace perekup;Bank b([]{return .5;});b.balance=0;double expected[]={.90,.85,.75,.65,.40,.25};int i=0;for(auto amount:Bank::amounts){assert(std::abs(b.chance(amount,0)-expected[i++])<1e-12);}b.balance=100000;assert(b.chance(50000,0)==.98);b.state["missedPayments"]=6;b.balance=0;assert(std::abs(b.chance(1000000,0)-.35)<1e-12);b.state["missedPayments"]=0;b.now=1;assert(b.request(1000000,12));assert(b.state["application"]["approved"]==true);static_assert(collectorGrace==30*day);std::cout<<"PASS approval rates, cap, missed-payment penalty and accessible million-ruble application\n";}
