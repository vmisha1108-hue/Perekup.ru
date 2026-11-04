#include "calculator.hpp"
#include <iostream>
#include <stdexcept>
void check(bool b){if(!b)throw std::runtime_error("calculator check failed");}
std::string calculate(const std::string& input){perekup::Calculator c;for(char ch:input)c.key(std::string(1,ch));c.key("=");return c.display;}
int main(){
 check(calculate("2+3*4")=="14");check(calculate("(2+3)*4")=="20");check(calculate("0012+008")=="20");check(calculate("-1/3")=="-0.333333");check(calculate("0.1+0.2")=="0.3");check(calculate("1/0")=="Ошибка");check(calculate("(1+2")=="Ошибка");check(calculate("1..2")=="Ошибка");
 perekup::Calculator c;c.key("8");c.key("×");c.key("←");c.key("÷");c.key("2");c.key("=");check(c.display=="4");c.key("C");c.key("5");c.key("0");c.key("%");c.key("=");check(c.display=="0.5");c.key("+");c.key("1");c.key("=");check(c.display=="1.5");c.key("C");c.key("1");c.key("/");c.key("0");c.key("=");c.key("2");c.key("=");check(c.display=="2");
 check(calculate(std::string(200,'(')+"1"+std::string(200,')'))=="Ошибка");std::cout<<"Calculator arithmetic, percent, Unicode deletion and error recovery passed\n";
}
