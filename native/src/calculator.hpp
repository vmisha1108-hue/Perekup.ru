#pragma once
#include <cmath>
#include <string>
#include <stdexcept>
#include <sstream>
#include <iomanip>
#include <locale>
namespace perekup {
// Small arithmetic grammar; deliberately does not execute scripts.
class ArithmeticParser {
 const std::string& text; size_t pos=0; int depth=0;
 void spaces(){while(pos<text.size()&&text[pos]==' ')++pos;}
 bool take(char c){spaces();if(pos<text.size()&&text[pos]==c){++pos;return true;}return false;}
 double primary(){
  if(++depth>128)throw std::runtime_error("Expression too deep");
  double value;
  if(take('+'))value=primary();else if(take('-'))value=-primary();
  else if(take('(')){value=sum();if(!take(')'))throw std::runtime_error("Missing parenthesis");}
  else{spaces();size_t start=pos;bool digit=false,dot=false;while(pos<text.size()){char c=text[pos];if(c>='0'&&c<='9'){digit=true;++pos;}else if(c=='.'&&!dot){dot=true;++pos;}else break;}if(!digit)throw std::runtime_error("Expected number");if(pos<text.size()&&(text[pos]=='e'||text[pos]=='E')){++pos;if(pos<text.size()&&(text[pos]=='+'||text[pos]=='-'))++pos;size_t exponent=pos;while(pos<text.size()&&text[pos]>='0'&&text[pos]<='9')++pos;if(pos==exponent)throw std::runtime_error("Invalid exponent");}std::istringstream input(text.substr(start,pos-start));input.imbue(std::locale::classic());if(!(input>>value))throw std::runtime_error("Invalid number");}
  --depth;return value;
 }
 double product(){double v=primary();for(;;){if(take('*'))v*=primary();else if(take('/'))v/=primary();else return v;}}
 double sum(){double v=product();for(;;){if(take('+'))v+=product();else if(take('-'))v-=product();else return v;}}
public:
 explicit ArithmeticParser(const std::string& s):text(s){}
 double evaluate(){if(text.size()>4096)throw std::runtime_error("Expression too long");double v=sum();spaces();if(pos!=text.size()||!std::isfinite(v))throw std::runtime_error("Invalid expression");return v;}
};
class Calculator {
 std::string expression;
 static void replace(std::string& s,const std::string& from,const std::string& to){size_t p=0;while((p=s.find(from,p))!=std::string::npos){s.replace(p,from.size(),to);p+=to.size();}}
public:
 std::string history,display="0";
 void key(const std::string& key){
  if(key=="="){history=expression+" =";try{auto input=expression;replace(input,"×","*");replace(input,"÷","/");replace(input,"−","-");double v=ArithmeticParser(input).evaluate();v=std::floor(v*1000000.+0.5)/1000000.;if(!std::isfinite(v))throw std::runtime_error("Overflow");if(v==0)v=0;std::ostringstream output;output.imbue(std::locale::classic());output<<std::setprecision(15)<<v;display=expression=output.str();}catch(...){display="Ошибка";expression.clear();}return;}
  if(key=="C")expression.clear();else if(key=="←"){if(!expression.empty()){size_t p=expression.size()-1;while(p>0&&(static_cast<unsigned char>(expression[p])&0xc0)==0x80)--p;expression.erase(p);}}
  else if(expression.size()<4090){if(key=="%")expression+="/100";else if(key=="×"||key=="÷"||key=="−"||key=="00"||(key.size()==1&&std::string("0123456789.+-*/()").find(key[0])!=std::string::npos))expression+=key;}
  history=expression;display=expression.empty()?"0":expression;
 }
};
}
