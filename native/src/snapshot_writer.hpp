#pragma once
#include "json.hpp"
#include <condition_variable>
#include <deque>
#include <future>
#include <mutex>
#include <thread>
#include <functional>
namespace perekup {
// One writer owns disk ordering. It never reads or mutates live game state.
// Every queued snapshot gets its own completion or exception, including on exit.
class SnapshotWriter {
 struct Job {nlohmann::json snapshot;std::promise<void> completion;};
 std::function<void(const nlohmann::json&)> write_;std::mutex mutex_;std::condition_variable changed_;std::deque<Job> jobs_;bool stopping_=false;std::thread worker_;
 void run(){for(;;){Job job;{std::unique_lock<std::mutex> lock(mutex_);changed_.wait(lock,[&]{return stopping_||!jobs_.empty();});if(jobs_.empty()&&stopping_)return;job=std::move(jobs_.front());jobs_.pop_front();}try{write_(job.snapshot);job.completion.set_value();}catch(...){job.completion.set_exception(std::current_exception());}}}
public:
 explicit SnapshotWriter(std::function<void(const nlohmann::json&)> write):write_(std::move(write)),worker_([this]{run();}){}
 SnapshotWriter(const SnapshotWriter&)=delete;SnapshotWriter& operator=(const SnapshotWriter&)=delete;
 ~SnapshotWriter(){{std::lock_guard<std::mutex> lock(mutex_);stopping_=true;}changed_.notify_all();if(worker_.joinable())worker_.join();}
 std::shared_future<void> submit(nlohmann::json snapshot){Job job{std::move(snapshot),{}};auto result=job.completion.get_future().share();{std::lock_guard<std::mutex> lock(mutex_);if(stopping_)throw std::runtime_error("Save queue is stopping");jobs_.push_back(std::move(job));}changed_.notify_one();return result;}
};
}
