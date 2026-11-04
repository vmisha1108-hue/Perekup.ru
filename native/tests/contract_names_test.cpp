#include "contracts.hpp"
#include <cassert>
#include <iostream>
int main(){using namespace perekup;Json city={{"name","Алдан"}};for(auto name:{"Анна","Марина","Люба","Ольга","Елена","Мария","Наталья"}){auto p=contractOtherParty(Json{{"name",name}},city);assert(p["fullName"]==std::string("Соколова ")+name+" Александровна");}assert(contractOtherParty(Json{{"name","Сергей"}},city)["fullName"]=="Соколов Сергей Александрович");assert(contractOtherParty(Json{{"name","Анна Иванова"}},city)["fullName"]=="Соколова Анна Александровна");std::cout<<"PASS female and male NPC document names\n";}
