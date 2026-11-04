#pragma once
#include <algorithm>
#include <cstddef>
namespace perekup {
struct PageWindow {std::size_t page,pages,begin,end,total;};
inline PageWindow pageWindow(std::size_t total,std::size_t requested,std::size_t size=24){size=std::max<std::size_t>(1,size);auto pages=total?1+(total-1)/size:1;auto page=std::min(requested,pages-1);auto begin=page*size;return {page,pages,begin,begin+std::min(size,total-begin),total};}
}
