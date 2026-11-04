#pragma once
#include <cstdint>
#include <array>
#include <cmath>
#include <vector>
#include <fstream>
#include <string>
#include <algorithm>
#include <stdexcept>
#include <filesystem>
#ifdef _WIN32
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>
#include <mmsystem.h>
#endif
namespace perekup {
struct WaveTrack {
 unsigned rate=0,channels=0;std::vector<std::int16_t> samples;
 static std::uint16_t u16(const std::vector<unsigned char>& b,std::size_t p){if(p+2>b.size())throw std::runtime_error("Truncated WAV");return b[p]|(std::uint16_t(b[p+1])<<8);}
 static std::uint32_t u32(const std::vector<unsigned char>& b,std::size_t p){return u16(b,p)|(std::uint32_t(u16(b,p+2))<<16);}
 static bool tag(const std::vector<unsigned char>& b,std::size_t p,const char* value){return p+4<=b.size()&&std::equal(b.begin()+p,b.begin()+p+4,value);}
 static WaveTrack decode(const std::vector<unsigned char>& b){if(b.size()<12||!tag(b,0,"RIFF")||!tag(b,8,"WAVE")||u32(b,4)>b.size()-8)throw std::runtime_error("Invalid WAV header");WaveTrack out;bool format=false,found=false;for(std::size_t p=12;p+8<=b.size();){auto n=u32(b,p+4);std::size_t data=p+8;if(n>b.size()-data)throw std::runtime_error("Truncated WAV chunk");if(tag(b,p,"fmt ")){if(n<16||u16(b,data)!=1||u16(b,data+14)!=16)throw std::runtime_error("PCM16 WAV required");out.channels=u16(b,data+2);out.rate=u32(b,data+4);if((out.channels!=1&&out.channels!=2)||out.rate<8000||out.rate>192000||u16(b,data+12)!=out.channels*2||u32(b,data+8)!=out.rate*out.channels*2)throw std::runtime_error("Unsupported WAV format");format=true;}else if(tag(b,p,"data")){if(n%2||found)throw std::runtime_error("Invalid WAV data");out.samples.reserve(n/2);for(std::size_t i=0;i<n;i+=2)out.samples.push_back(static_cast<std::int16_t>(u16(b,data+i)));found=true;}p=data+n+(n&1);}if(!format||!found||out.samples.empty()||out.samples.size()%out.channels)throw std::runtime_error("Incomplete WAV");return out;}
 static WaveTrack load(const std::filesystem::path& path){std::ifstream f(path,std::ios::binary);if(!f)throw std::runtime_error("Music file is missing");return decode(std::vector<unsigned char>(std::istreambuf_iterator<char>(f),{}));}
 double seconds()const{return rate&&channels?double(samples.size())/(rate*channels):0;}
 std::vector<std::int16_t> scaled(double gain)const{if(!std::isfinite(gain)||gain<0||gain>1)throw std::invalid_argument("Invalid music gain");auto output=samples;for(auto& sample:output)sample=std::int16_t(std::round(sample*gain));return output;}
};
class NativeMusic {
 bool enabled_=false,suspended_=false,opened_=false;int volume_=20;std::string error_;WaveTrack track_;std::size_t cursor_=0;
#ifdef _WIN32
 HWAVEOUT device_=nullptr;
 struct Buffer{WAVEHDR header{};std::vector<std::int16_t> samples;bool prepared=false,queued=false;};std::array<Buffer,3> buffers_;
 bool check(MMRESULT result){if(result==MMSYSERR_NOERROR)return true;wchar_t text[256]{};waveOutGetErrorTextW(result,text,256);int count=WideCharToMultiByte(CP_UTF8,0,text,-1,nullptr,0,nullptr,nullptr);if(count>1){std::vector<char> bytes(count);WideCharToMultiByte(CP_UTF8,0,text,-1,bytes.data(),count,nullptr,nullptr);error_=bytes.data();}else error_="Audio device error: "+std::to_string(result);return false;}
#endif
public:
 NativeMusic()=default;NativeMusic(const NativeMusic&)=delete;NativeMusic& operator=(const NativeMusic&)=delete;
 ~NativeMusic(){close();}int volume()const{return volume_;}bool setVolume(int value,const std::filesystem::path&){volume_=std::clamp(value,0,100);return true;}
 bool enabled()const{return enabled_;}bool playing()const{return opened_&&enabled_&&!suspended_;}const std::string& error()const{return error_;}
 void close(){
#ifdef _WIN32
  if(device_){waveOutReset(device_);for(auto& b:buffers_)if(b.prepared)waveOutUnprepareHeader(device_,&b.header,sizeof(b.header));waveOutClose(device_);}device_=nullptr;for(auto& b:buffers_){b.header={};b.prepared=false;b.queued=false;b.samples.clear();}
#endif
  opened_=false;enabled_=false;track_={};cursor_=0;
 }
 void pump(){
#ifdef _WIN32
  if(!playing())return;
  for(auto& b:buffers_){if(b.queued&&!(b.header.dwFlags&WHDR_DONE))continue;for(auto& sample:b.samples){sample=static_cast<std::int16_t>(std::round(track_.samples[cursor_]*double(volume_)/100.0));cursor_=(cursor_+1)%track_.samples.size();}if(!check(waveOutWrite(device_,&b.header,sizeof(b.header)))){close();return;}b.queued=true;}
#endif
 }
 bool setEnabled(bool value,const std::filesystem::path& path){error_.clear();if(!value){
#ifdef _WIN32
  if(device_&&!check(waveOutPause(device_))){close();error_.clear();return true;}
#endif
  enabled_=false;return true;}
  if(!opened_){try{track_=WaveTrack::load(path);
#ifdef _WIN32
   WAVEFORMATEX format{};format.wFormatTag=WAVE_FORMAT_PCM;format.nChannels=WORD(track_.channels);format.nSamplesPerSec=track_.rate;format.wBitsPerSample=16;format.nBlockAlign=WORD(track_.channels*2);format.nAvgBytesPerSec=format.nSamplesPerSec*format.nBlockAlign;
   if(!check(waveOutOpen(&device_,WAVE_MAPPER,&format,0,0,CALLBACK_NULL))){device_=nullptr;close();return false;}
   for(auto& b:buffers_){b.samples.resize((track_.rate/25)*track_.channels);b.header.lpData=reinterpret_cast<char*>(b.samples.data());b.header.dwBufferLength=DWORD(b.samples.size()*sizeof(std::int16_t));if(!check(waveOutPrepareHeader(device_,&b.header,sizeof(b.header)))){close();return false;}b.prepared=true;}
#else
   error_="Playback is available in the Windows build.";close();return false;
#endif
   opened_=true;
  }catch(const std::exception& e){error_=e.what();close();return false;}}
  enabled_=true;
#ifdef _WIN32
  if(!check(suspended_?waveOutPause(device_):waveOutRestart(device_))){close();return false;}
#endif
  pump();return error_.empty();
 }
 void suspend(bool value){suspended_=value;
#ifdef _WIN32
  if(device_&&enabled_)check(value?waveOutPause(device_):waveOutRestart(device_));
#endif
 }
};
}
