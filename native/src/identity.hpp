#pragma once
#include "bank.hpp"
#include <codecvt>
#include <locale>
namespace perekup {
inline std::u32string codepoints(const std::string& s){return std::wstring_convert<std::codecvt_utf8<char32_t>,char32_t>{}.from_bytes(s);}
inline std::string utf8(const std::u32string& s){return std::wstring_convert<std::codecvt_utf8<char32_t>,char32_t>{}.to_bytes(s);}
inline bool whitespace(char32_t c){return c==9||c==10||c==11||c==12||c==13||c==32||c==0xa0||c==0x1680||(c>=0x2000&&c<=0x200a)||c==0x2028||c==0x2029||c==0x202f||c==0x205f||c==0x3000||c==0xfeff;}
inline std::string contractNormal(const std::string& s){std::u32string out;bool gap=false;for(auto c:codepoints(s)){if(whitespace(c)){gap=!out.empty();continue;}if(gap)out+=U' ';gap=false;out+=c;}return utf8(out);}
inline std::string contractCode(const std::string& s){std::u32string out;for(auto c:codepoints(s)){if(whitespace(c))continue;if(c>='a'&&c<='z')c-=32;else if(c>=U'а'&&c<=U'я')c-=32;else if(c==U'ё')c=U'Ё';out+=c;}return utf8(out);}
inline std::uint64_t hashStr(const std::string& s){std::uint32_t a=0xdeadbeef,b=0x41c6ce57;auto add=[&](std::uint32_t c){a=(a^c)*2654435761u;b=(b^c)*1597334677u;};for(auto c:codepoints(s)){if(c<=65535)add(c);else{c-=65536;add(0xd800+(c>>10));add(0xdc00+(c&1023));}}a=(a^(a>>16))*2246822507u^(b^(b>>13))*3266489909u;b=(b^(b>>16))*2246822507u^(a^(a>>13))*3266489909u;return (std::uint64_t(b&2097151)<<32)+a;}
inline bool validSignature(const Json& s){if(s.is_string()){auto str=s.get<std::string>();return str.size()==4&&std::all_of(str.begin(),str.end(),[](char c){return c>='A'&&c<='Z';});}if(!s.is_array()||s.empty()||s.size()>50)return false;double length=0;for(const auto& line:s){if(!line.is_array()||line.size()<2||line.size()>2500)return false;for(std::size_t i=0;i<line.size();i++){const auto& p=line[i];if(!p.is_array()||p.size()!=2)return false;for(const auto& v:p)if(!v.is_number()||!std::isfinite(v.get<double>())||v.get<double>()<0||v.get<double>()>1)return false;if(i)length+=std::hypot(p[0].get<double>()-line[i-1][0].get<double>(),p[1].get<double>()-line[i-1][1].get<double>());}}return length>.025;}
inline bool validNickname(const Json& v){if(!v.is_string())return false;try{auto s=codepoints(v.get<std::string>());while(!s.empty()&&whitespace(s.front()))s.erase(s.begin());while(!s.empty()&&whitespace(s.back()))s.pop_back();return s.size()>=2&&s.size()<=32&&std::all_of(s.begin(),s.end(),[](char32_t c){return c>=32&&c!=127&&c!='<'&&c!='>';});}catch(...){return false;}}
inline bool validIdentity(const Json& i){return i.is_object()&&i.contains("nickname")&&validNickname(i["nickname"])&&i.contains("signature")&&validSignature(i["signature"]);}
}
