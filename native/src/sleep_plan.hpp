#pragma once
#include <algorithm>
namespace perekup {
inline int maximumSleepHours(int localHour){return localHour>=22||localHour<9?8:3;}
inline int boundedSleepHours(int localHour,int requested){return std::clamp(requested,1,maximumSleepHours(localHour));}
}
