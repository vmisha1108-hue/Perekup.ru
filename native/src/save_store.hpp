#pragma once
#include "json.hpp"
#include "vault.hpp"
#include <filesystem>
#include <fstream>
#include <atomic>
#include <chrono>
#ifndef _WIN32
#include <fcntl.h>
#include <unistd.h>
#include <cerrno>
#endif
namespace perekup {
namespace fs=std::filesystem;
using SaveJson=nlohmann::json;
enum class LoadStatus {Fresh,Loaded,RecoveredPrevious,LegacyAvailable,Corrupt};
struct LoadResult {LoadStatus status=LoadStatus::Fresh;SaveJson document;fs::path source;};
class SaveStore {
 fs::path folder_;
 static std::string suffix(){static std::atomic<unsigned long long> sequence{0};return std::to_string(std::chrono::steady_clock::now().time_since_epoch().count())+"-"+std::to_string(++sequence);}
 static bool valid(const SaveJson& d){if(!d.is_object()||d.value("version",0)!=1)return false;auto format=d.value("format","");if(format=="perekup-native")return d.contains("state")&&d["state"].is_object();if(format!="perekup-local-storage"||!d.contains("data")||!d["data"].is_object()||d["data"].size()>512)return false;for(auto it=d["data"].begin();it!=d["data"].end();++it)if(it.key().size()>256||!it.value().is_string()||it.value().get_ref<const std::string&>().size()>16*1024*1024)return false;return true;}
 static SaveJson decode(const std::string& bytes){try{std::string plain;if(!vault::open(bytes,plain))return nullptr;auto d=SaveJson::parse(plain);return valid(d)?d:SaveJson(nullptr);}catch(...){return nullptr;}}
public:
 explicit SaveStore(fs::path gameFolder):folder_(std::move(gameFolder)/"saves"){}
 const fs::path& folder()const{return folder_;}
 static std::string read(const fs::path& p){std::error_code ec;auto size=fs::file_size(p,ec);if(ec||size>vault::limit+36)return {};std::string bytes(size,'\0');std::ifstream f(p,std::ios::binary);if(!f.read(bytes.data(),static_cast<std::streamsize>(size)))return {};return bytes;}
 static void atomicWrite(const fs::path& p,const std::string& bytes){auto temp=p;temp+=".pending-"+suffix();
#ifdef _WIN32
 HANDLE file=CreateFileW(temp.c_str(),GENERIC_WRITE,0,nullptr,CREATE_NEW,FILE_ATTRIBUTE_NORMAL,nullptr);if(file==INVALID_HANDLE_VALUE)throw std::runtime_error("Cannot create save file");DWORD count=0;bool ok=WriteFile(file,bytes.data(),static_cast<DWORD>(bytes.size()),&count,nullptr)&&count==bytes.size()&&FlushFileBuffers(file);CloseHandle(file);if(!ok||!MoveFileExW(temp.c_str(),p.c_str(),MOVEFILE_REPLACE_EXISTING|MOVEFILE_WRITE_THROUGH)){DeleteFileW(temp.c_str());throw std::runtime_error("Cannot commit save file");}
#else
 int fd=::open(temp.c_str(),O_WRONLY|O_CREAT|O_EXCL,0600);if(fd<0)throw std::runtime_error("Cannot create save file");std::size_t offset=0;bool ok=true;while(offset<bytes.size()){auto n=::write(fd,bytes.data()+offset,bytes.size()-offset);if(n<0&&errno==EINTR)continue;if(n<=0){ok=false;break;}offset+=std::size_t(n);}if(ok)ok=::fsync(fd)==0;if(::close(fd)!=0)ok=false;if(!ok||::rename(temp.c_str(),p.c_str())!=0){::unlink(temp.c_str());throw std::runtime_error("Cannot commit save file");}int parent=::open(p.parent_path().c_str(),O_RDONLY|O_DIRECTORY);if(parent>=0){::fsync(parent);::close(parent);}
#endif
 }
 LoadResult load()const{bool any=false;for(const char* name:{"native-progress.dat","native-progress.previous.dat"}){auto p=folder_/name;if(!fs::exists(p))continue;any=true;auto d=decode(read(p));if(!d.is_null()&&d.value("format","")=="perekup-native")return {std::string(name)=="native-progress.dat"?LoadStatus::Loaded:LoadStatus::RecoveredPrevious,d,p};}if(any)return {LoadStatus::Corrupt,{},folder_};
 for(const char* name:{"progress.dat","progress.previous.dat"}){auto p=folder_/name;if(!fs::exists(p))continue;any=true;auto d=decode(read(p));if(!d.is_null()&&d.value("format","")=="perekup-local-storage")return {LoadStatus::LegacyAvailable,d,p};}return {any?LoadStatus::Corrupt:LoadStatus::Fresh,{},folder_};}
 void trace(const char* stage)const noexcept{try{std::ofstream log(folder_/"native-save.log",std::ios::app);if(log)log<<std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count()<<" "<<stage<<"\n";}catch(...){} }
 void save(const SaveJson& state,const SaveJson& legacy=SaveJson::object()){
  if(!state.is_object())throw std::invalid_argument("Save state must be an object");
  try{
   fs::create_directories(folder_);trace("save begin");
   SaveJson envelope={{"format","perekup-native"},{"version",1},{"state",state}};if(!legacy.empty())envelope["legacyStorage"]=legacy;
   trace("encrypt begin");auto bytes=vault::seal(envelope.dump());trace("encrypt complete");
   trace("verify memory begin");if(decode(bytes)!=envelope)throw std::runtime_error("Save verification failed");trace("verify memory complete");
   auto path=folder_/"native-progress.dat";auto previous=read(path);trace("verify previous begin");
   if(!decode(previous).is_null()){trace("backup write begin");atomicWrite(folder_/"native-progress.previous.dat",previous);trace("backup write complete");}
   trace("save write begin");atomicWrite(path,bytes);trace("save write complete");
   trace("verify disk begin");if(decode(read(path))!=envelope)throw std::runtime_error("Saved file could not be verified");trace("save complete");
  }catch(...){trace("save failed");throw;}
 }

 fs::path preserveBeforeReset(){fs::create_directories(folder_);auto recovery=folder_/("recovery-"+suffix());fs::create_directory(recovery);std::vector<fs::path> copied;for(const char* name:{"native-progress.dat","native-progress.previous.dat","progress.dat","progress.previous.dat","protected.v2"}){auto source=folder_/name;if(!fs::exists(source))continue;auto dest=recovery/name;fs::copy_file(source,dest);std::ifstream a(source,std::ios::binary),b(dest,std::ios::binary);if(!a||!b||fs::file_size(source)!=fs::file_size(dest))throw std::runtime_error("Recovery backup failed");std::array<char,65536> x{},y{};while(a){a.read(x.data(),x.size());b.read(y.data(),y.size());if(a.gcount()!=b.gcount()||!std::equal(x.begin(),x.begin()+a.gcount(),y.begin()))throw std::runtime_error("Recovery backup differs");}copied.push_back(source);}for(const auto& p:copied)fs::remove(p);return recovery;}
};
}
