#pragma once
#include "deals.hpp"
#include "contracts.hpp"
#include "career_sales.hpp"
#include "commerce.hpp"
#include "save_store.hpp"
#include "snapshot_writer.hpp"
#include "signed_meetings.hpp"
#include <memory>
#include <set>
namespace perekup {
// Application-owned snapshot and persistence boundary. Incomplete legacy import
// is deliberately not converted or overwritten during startup.
class Session {
 SaveStore store_;std::unique_ptr<SnapshotWriter> writer_;Json cities_,cars_;std::string home_;bool ready_=false;
 struct Creation {Json snapshot;std::shared_future<void> saved;};std::unique_ptr<Creation> creation_;
public:
 Json state;LoadStatus loadStatus=LoadStatus::Fresh;
 Session(fs::path root,Json cities,Json cars,std::string home):store_(std::move(root)),cities_(std::move(cities)),cars_(std::move(cars)),home_(std::move(home)){writer_=std::make_unique<SnapshotWriter>([this](const Json& snapshot){store_.save(snapshot);});}
 bool ready()const{return ready_;}
 void validate(const Json& s)const{
  if(!s.is_object()||s.value("nativeVersion",0)!=1)throw std::runtime_error("Unsupported native save version");
  auto integer=[&](const char* name,Money minimum,Money maximum){const auto& value=s.at(name);if(!value.is_number_integer()||value.get<double>()<minimum||value.get<double>()>maximum)throw std::runtime_error(std::string("Invalid field: ")+name);};
  integer("balance",0,safeInteger);integer("gameMs",1,8640000000000000LL);integer("deals",0,safeInteger);integer("garageCapacity",1,1000);
  if(!validIdentity(s.at("playerIdentity")))throw std::runtime_error("Invalid player identity");
  if(!s.at("garage").is_array())throw std::runtime_error("Invalid garage");std::set<Money> ids;for(const auto& id:s["garage"]){if(!id.is_number_integer()||!cars_.contains(std::to_string(id.get<Money>()))||!ids.insert(id.get<Money>()).second)throw std::runtime_error("Invalid garage car");}
  for(const char* name:{"bank","transport","career","contracts","commerce","marketRisks","purchasePrices","listings","chatStore"})if(!s.at(name).is_object())throw std::runtime_error(std::string("Invalid book: ")+name);
  for(const char* name:{"pending","retiredMarketCars"})if(!s.at(name).is_array())throw std::runtime_error(std::string("Invalid list: ")+name);
  if(!cities_.contains(s.at("transport").at("cityId").get<std::string>()))throw std::runtime_error("Invalid player city");
  for(const auto& field:std::vector<std::pair<const char*,const char*>>{{"bank","loans"},{"bank","entries"},{"contracts","records"},{"commerce","orders"},{"marketRisks","seizures"}})if(!s.at(field.first).at(field.second).is_array())throw std::runtime_error("Invalid saved list");
 }
 LoadResult load(){if(creating())throw std::logic_error("Creation is still pending");auto loaded=store_.load();loadStatus=loaded.status;if(loaded.status==LoadStatus::Loaded||loaded.status==LoadStatus::RecoveredPrevious){validate(loaded.document.at("state"));state=loaded.document.at("state");ready_=true;auto corrected=state;if(releaseSignedMeetings(corrected))commit(std::move(corrected));}return loaded;}
 void beginCreate(const std::string& nickname,const std::string& signature,Money now){if(loadStatus!=LoadStatus::Fresh||ready_||creation_)throw std::runtime_error("Existing save cannot be overwritten");Json identity={{"version",1},{"nickname",nickname},{"signature",signature}};if(!validIdentity(identity)||!identity["signature"].is_string())throw std::invalid_argument("Nickname and four uppercase letters required");Deals deals(cities_,cars_,home_,[]{return .5;});auto draft=deals.fresh(double(now));draft["nativeVersion"]=1;draft["gameMs"]=now;draft["playerIdentity"]=identity;draft["career"]=freshCareer(double(now));draft["contracts"]=freshContracts(identity);draft["commerce"]=freshCommerce();draft["onboardingComplete"]=false;draft["snakeBest"]=0;validate(draft);auto pending=std::make_unique<Creation>();pending->snapshot=std::move(draft);pending->saved=writer_->submit(pending->snapshot);creation_=std::move(pending);}
 bool creating()const{return bool(creation_);}
 bool creationReady()const{return creation_&&creation_->saved.wait_for(std::chrono::milliseconds(0))==std::future_status::ready;}
 bool finishCreate(){if(!creation_)throw std::logic_error("No creation pending");if(!creationReady())return false;try{creation_->saved.get();}catch(...){creation_.reset();throw;}state.swap(creation_->snapshot);creation_.reset();ready_=true;return true;}
 void create(const std::string& nickname,const std::string& signature,Money now){beginCreate(nickname,signature,now);creation_->saved.wait();finishCreate();}

 void commit(Json draft){if(!ready_)throw std::runtime_error("No active game");validate(draft);writer_->submit(draft).get();state.swap(draft);}
 std::shared_future<void> saveSnapshot(Json snapshot){if(!ready_)throw std::runtime_error("No active game");validate(snapshot);return writer_->submit(std::move(snapshot));}
 // Called from an explicit recovery action, never during ordinary startup.
 void preserveAndReset(){if(creating())throw std::logic_error("Creation is still pending");writer_.reset();try{store_.preserveBeforeReset();}catch(...){writer_=std::make_unique<SnapshotWriter>([this](const Json& snapshot){store_.save(snapshot);});throw;}writer_=std::make_unique<SnapshotWriter>([this](const Json& snapshot){store_.save(snapshot);});ready_=false;state=nullptr;loadStatus=LoadStatus::Fresh;}
};
}
