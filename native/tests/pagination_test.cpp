#include "pagination.hpp"
#include <cassert>
#include <vector>
#include <iostream>
int main(){using namespace perekup;std::vector<int> seen(1037);for(std::size_t i=0;i<44;++i){auto p=pageWindow(1037,i);assert(p.end-p.begin<=24);for(auto n=p.begin;n<p.end;++n)++seen[n];}for(auto n:seen)assert(n==1);auto last=pageWindow(1037,999);assert(last.page==43&&last.end-last.begin==5);auto empty=pageWindow(0,43);assert(empty.begin==0&&empty.end==0&&empty.page==0);assert(pageWindow(5,43).page==0);std::cout<<"PASS every listing reachable once, 24-card limit, final five and filter page clamp\n";}
