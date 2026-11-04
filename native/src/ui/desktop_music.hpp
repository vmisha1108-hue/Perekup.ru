#pragma once
#include <QMediaPlayer>
#include "windows_media.hpp"
#include <QAudioOutput>
#include <QMediaMetaData>
#include <QMediaDevices>
#include <QAudioDevice>
#include <QDirIterator>
#include <QFileInfo>
#include <QImageReader>
#include <QJsonArray>
#include <QJsonObject>
#include <QStringDecoder>
#include <QRandomGenerator>
#include <QSet>
#include <QTimer>
#include <future>
#include <functional>
#include <filesystem>

struct DesktopTrack {
 QUrl url;QString title,artist,cover;bool builtin=false;
 QJsonObject json()const{return {{"url",url.toString()},{"title",title},{"artist",artist},{"cover",cover}};}
};
inline QString musicUrlError(const QUrl& u){
 if(!u.isValid()||u.host().isEmpty()||(u.scheme()!="https"&&u.scheme()!="http"))return QStringLiteral("Нужна полная ссылка http:// или https:// на аудио или радиопоток.");
 if(!u.userInfo().isEmpty())return QStringLiteral("Ссылка с логином или паролем не поддерживается.");
 auto host=u.host().toLower();for(const auto& domain:QStringList{"spotify.com","youtu.be","youtube.com","music.yandex.ru","music.yandex.com","vk.com","vk.ru","soundcloud.com","music.apple.com","itunes.apple.com","deezer.com","deezer.page.link","dzr.page.link"})
  if(host==domain||host.endsWith("."+domain))return QStringLiteral("Это страница музыкального сервиса. Сейчас поддерживаются прямые ссылки на аудио/радио; подключение этого сервиса ещё не добавлено.");
 return {};
}
inline QImage musicReadImage(const QString& path){if(path.isEmpty())return {};QImageReader reader(path);auto size=reader.size();if(!size.isValid()||size.width()>12000||size.height()>12000)return {};if(size.width()>640||size.height()>640)reader.setScaledSize(size.scaled(640,640,Qt::KeepAspectRatio));return reader.read();}
inline QString id3MusicText(QByteArray b){if(b.isEmpty())return {};int enc=static_cast<unsigned char>(b.at(0));b.remove(0,1);QString t;if(enc==3)t=QString::fromUtf8(b);else if(enc==1){QStringDecoder d(QStringDecoder::Utf16);t=d(b);}else if(enc==2){QStringDecoder d(QStringDecoder::Utf16BE);t=d(b);}else t=QString::fromLatin1(b);return t.remove(QChar(0)).trimmed().left(300);}
inline void readMusicTags(DesktopTrack& t){
 QFile f(t.url.toLocalFile());if(!f.open(QIODevice::ReadOnly))return;auto head=f.read(10);if(head.size()!=10||head.left(3)!="ID3")return;int version=static_cast<unsigned char>(head[3]);if(version!=3&&version!=4)return;if(static_cast<unsigned char>(head[5])&0xC0)return;
 auto sync=[](const QByteArray& b,int p){return ((int(static_cast<unsigned char>(b[p]))&127)<<21)|((int(static_cast<unsigned char>(b[p+1]))&127)<<14)|((int(static_cast<unsigned char>(b[p+2]))&127)<<7)|(int(static_cast<unsigned char>(b[p+3]))&127);};
 int size=sync(head,6);if(size<0||size>4*1024*1024)return;auto bytes=f.read(size);for(int p=0;p+10<=bytes.size();){auto key=bytes.mid(p,4);int n=version==4?sync(bytes,p+4):int((quint32(static_cast<unsigned char>(bytes[p+4]))<<24)|(quint32(static_cast<unsigned char>(bytes[p+5]))<<16)|(quint32(static_cast<unsigned char>(bytes[p+6]))<<8)|static_cast<unsigned char>(bytes[p+7]));if(n<=0||n>bytes.size()-p-10)break;auto data=bytes.mid(p+10,n);if(key=="TIT2"){auto v=id3MusicText(data);if(!v.isEmpty())t.title=v;}if(key=="TPE1"){auto v=id3MusicText(data);if(!v.isEmpty())t.artist=v;}p+=10+n;}
}
inline QList<DesktopTrack> scanMusicFolders(const QStringList& folders){
 QList<DesktopTrack> out;QSet<QString> seen;const QSet<QString> formats{"mp3","wav","flac","ogg","m4a","aac","opus"};
 for(const auto& folder:folders){QDirIterator it(folder,QDir::Files|QDir::Readable,QDirIterator::Subdirectories);while(it.hasNext()&&out.size()<5000){it.next();auto info=it.fileInfo();if(!formats.contains(info.suffix().toLower()))continue;auto path=info.canonicalFilePath();if(path.isEmpty())continue;auto key=path;
#ifdef Q_OS_WIN
 key=key.toLower();
#endif
 if(seen.contains(key))continue;seen.insert(key);DesktopTrack t{QUrl::fromLocalFile(path),info.completeBaseName(),QStringLiteral("Своя музыка"),{},false};readMusicTags(t);for(const auto& cover:QStringList{"cover.jpg","cover.png","folder.jpg"}){auto image=info.dir().filePath(cover);if(QFileInfo::exists(image)){t.cover=image;break;}}out.push_back(t);}}
 std::sort(out.begin(),out.end(),[](const auto& a,const auto& b){return QString::localeAwareCompare(a.title,b.title)<0;});return out;
}
class DesktopMusic:public QObject {
 QMediaPlayer player_;QAudioOutput output_;WindowsMedia external_;bool externalMode_=false;DesktopTrack externalTrack_;QTimer scanTimer_;std::future<QList<DesktopTrack>> scan_;bool scanning_=false,wantPlay_=false,suspended_=false,repeat_=false,shuffle_=false;int index_=0;QString error_;QStringList folders_;QList<DesktopTrack> tracks_,links_,builtins_;QImage cover_;QJsonObject overrides_;qint64 restorePosition_=0;QUrl restoreUrl_;bool resumeAfterScan_=false,restoring_=true;QString root_;QStringList playQueue_;QJsonArray history_;
 void tryRestorePosition(){if(restoring_||scanning_||restorePosition_<=0||!player_.isSeekable()||player_.duration()<=0)return;auto position=std::min(restorePosition_,player_.duration());restorePosition_=0;player_.setPosition(position);}
 void updateMetadata(){if(tracks_.isEmpty())return;auto md=player_.metaData();auto title=md.stringValue(QMediaMetaData::Title),artist=md.stringValue(QMediaMetaData::ContributingArtist);if(!title.isEmpty()&&!localTrack().builtin)tracks_[index_].title=title.left(300);if(!artist.isEmpty()&&!localTrack().builtin)tracks_[index_].artist=artist.left(300);auto art=md.value(QMediaMetaData::CoverArtImage).value<QImage>();if(art.isNull())art=md.value(QMediaMetaData::ThumbnailImage).value<QImage>();if(!art.isNull()&&!localTrack().builtin&&!overrides_.contains(localTrack().url.toString()))cover_=art.scaled(640,640,Qt::KeepAspectRatio,Qt::SmoothTransformation);changed();}
 QList<int> queueIndices() const {
     QList<int> indices;
     if (playQueue_.isEmpty()) {
         for (int i = 0; i < tracks_.size(); ++i) indices.append(i);
     } else {
         for (const auto& url : playQueue_)
             for (int i = 0; i < tracks_.size(); ++i)
                 if (tracks_[i].url.toString() == url) { indices.append(i); break; }
     }
     return indices;
 }
 void recordPlayback() {
     if (externalMode_ || localTrack().url.isEmpty()) return;
     const auto url = localTrack().url.toString();
     if (!history_.isEmpty() && history_.first().toObject().value("url").toString() == url) return;
     history_.prepend(localTrack().json());
     while (history_.size() > 100) history_.removeLast();
     if (onLibraryChanged) onLibraryChanged();
 }
 void changed(){if(onChanged)onChanged();}
 bool audioAvailable(){if(!QMediaDevices::audioOutputs().isEmpty())return true;wantPlay_=false;error_=QStringLiteral("Звуковое устройство не найдено. Подключите колонки или наушники и повторите.");changed();return false;}
 void load(int index,bool play){if(index<0||index>=tracks_.size())return;index_=index;error_.clear();cover_=musicReadImage(localTrack().cover);wantPlay_=play;player_.setSource(localTrack().url);tryRestorePosition();if(play&&!suspended_&&audioAvailable())player_.play();changed();if(onLibraryChanged)onLibraryChanged();}
public:
 std::function<void()> onChanged,onLibraryChanged;
 explicit DesktopMusic(QObject* parent=nullptr):QObject(parent){externalTrack_.title=QStringLiteral("Музыка Windows");externalTrack_.artist=QStringLiteral("Запустите музыку и выберите плеер");external_.onChanged=[this]{auto c=external_.current();externalTrack_.title=c.value("title").toString();if(externalTrack_.title.isEmpty())externalTrack_.title=QStringLiteral("Музыка Windows");externalTrack_.artist=c.value("artist").toString();if(externalTrack_.artist.isEmpty())externalTrack_.artist=external_.connected()?c.value("app").toString():QStringLiteral("Запустите музыку и выберите плеер");changed();};player_.setAudioOutput(&output_);output_.setVolume(.2);QObject::connect(&player_,&QMediaPlayer::metaDataChanged,this,[this]{updateMetadata();});QObject::connect(&player_,&QMediaPlayer::playbackStateChanged,this,[this](QMediaPlayer::PlaybackState state){if(state==QMediaPlayer::PlayingState)recordPlayback();changed();});QObject::connect(&player_,&QMediaPlayer::positionChanged,this,[this]{changed();});QObject::connect(&player_,&QMediaPlayer::durationChanged,this,[this]{tryRestorePosition();changed();});QObject::connect(&player_,&QMediaPlayer::seekableChanged,this,[this]{tryRestorePosition();});QObject::connect(&player_,&QMediaPlayer::mediaStatusChanged,this,[this](QMediaPlayer::MediaStatus status){if(status==QMediaPlayer::LoadedMedia)tryRestorePosition();if(status==QMediaPlayer::EndOfMedia){if(repeat_){player_.setPosition(0);if(wantPlay_&&!suspended_)player_.play();}else next();}changed();});QObject::connect(&player_,&QMediaPlayer::errorOccurred,this,[this](QMediaPlayer::Error,const QString& text){error_=text;wantPlay_=false;changed();});scanTimer_.setInterval(40);QObject::connect(&scanTimer_,&QTimer::timeout,this,[this]{if(!scan_.valid()||scan_.wait_for(std::chrono::milliseconds(0))!=std::future_status::ready)return;auto scanned=scan_.get();auto url=restoreUrl_.isEmpty()?localTrack().url:restoreUrl_;tracks_=builtins_;QSet<QUrl> included;for(const auto& t:tracks_)included.insert(t.url);for(const auto& t:scanned)if(!included.contains(t.url)){tracks_.append(t);included.insert(t.url);}tracks_.append(links_);for(auto& t:tracks_)if(overrides_.contains(t.url.toString()))t.cover=overrides_.value(t.url.toString()).toString();index_=0;for(int i=0;i<tracks_.size();++i)if(tracks_[i].url==url){index_=i;break;}scanning_=false;scanTimer_.stop();if(resumeAfterScan_){resumeAfterScan_=false;restoring_=false;load(index_,wantPlay_);}else if(player_.source()==url){cover_=musicReadImage(localTrack().cover);}else load(index_,false);restoreUrl_=QUrl();changed();if(onLibraryChanged)onLibraryChanged();});}
 void initialize(const QString& root,const QJsonObject& saved){root_=root;history_=saved.value("history").toArray();while(history_.size()>100)history_.removeLast();for(const auto& item:saved.value("queue").toArray())if(item.isString()&&playQueue_.size()<500)playQueue_.append(item.toString());builtins_={DesktopTrack{QUrl::fromLocalFile(root+"/assets/audio/mevison-background.wav"),QStringLiteral("Mevison"),QStringLiteral("Perekyp.ru"),root+"/assets/audio/mevison-cover.ico",true},DesktopTrack{QUrl::fromLocalFile(root+"/assets/audio/after-deal-perekyp.mp3"),QStringLiteral("После сделки"),QStringLiteral("PEREKYP.RU"),root+"/assets/audio/after-deal-perekyp-cover.jpg",true}};tracks_=builtins_;for(const auto& v:saved.value("folders").toArray())if(v.isString()&&!folders_.contains(v.toString()))folders_.push_back(v.toString());if(!saved.contains("folders"))folders_.push_back(root+"/Music");QDir().mkpath(root+"/Music");for(const auto& v:saved.value("links").toArray()){auto o=v.toObject();QUrl url(o.value("url").toString());if(musicUrlError(url).isEmpty())links_.append({url,o.value("title").toString(),o.value("artist").toString(),o.value("cover").toString(),false});}overrides_=saved.value("covers").toObject();repeat_=saved.value("repeat").toBool(true);shuffle_=saved.value("shuffle").toBool(false);restoreUrl_=QUrl(saved.value("current").toString());if(restoreUrl_.isLocalFile()){auto oldPath=QDir::fromNativeSeparators(restoreUrl_.toLocalFile());auto marker=oldPath.lastIndexOf("/assets/audio/");if(marker>=0){auto oldRoot=oldPath.left(marker);for(const auto& t:builtins_)if(QFileInfo(t.url.toLocalFile()).fileName()==QFileInfo(oldPath).fileName()){restoreUrl_=t.url;for(auto& folder:folders_)if(QDir::fromNativeSeparators(folder)==oldRoot+"/Music")folder=root+"/Music";break;}}}restorePosition_=saved.value("position").toVariant().toLongLong();resumeAfterScan_=true;load(0,false);rescan();if(saved.value("externalMode").toBool())setExternalMode(true,saved.value("externalSource").toString());}
 QJsonObject snapshot()const{QJsonArray dirs,links;for(const auto& f:folders_)dirs.append(f);for(const auto& t:links_)links.append(t.json());return {{"externalMode",externalMode_},{"externalSource",external_.preferred()},{"folders",dirs},{"links",links},{"current",restoring_&&!restoreUrl_.isEmpty()?restoreUrl_.toString():localTrack().url.toString()},{"position",double(restoring_?restorePosition_:player_.position())},{"repeat",repeat_},{"shuffle",shuffle_},{"covers",overrides_},{"history",history_},{"queue",QJsonArray::fromStringList(playQueue_)}};}
 const DesktopTrack& localTrack()const{static DesktopTrack empty;return tracks_.isEmpty()?empty:tracks_[std::clamp(index_,0,int(tracks_.size())-1)];}const QList<DesktopTrack>& tracks()const{return tracks_;}int index()const{return index_;}QStringList folders()const{return folders_;}QImage cover()const{return externalMode_?external_.cover():cover_;}bool scanning()const{return scanning_;}bool enabled()const{return externalMode_?external_.playing():wantPlay_;}bool showingTrack()const{return externalMode_?external_.connected():wantPlay_;}bool playing()const{return externalMode_?external_.playing():player_.playbackState()==QMediaPlayer::PlayingState;}bool buffering()const{return !externalMode_&&(player_.mediaStatus()==QMediaPlayer::LoadingMedia||player_.mediaStatus()==QMediaPlayer::BufferingMedia);}bool seekable()const{return externalMode_?external_.can("canSeek")&&external_.duration()>0:player_.isSeekable();}qint64 position()const{return externalMode_?external_.position():player_.position();}qint64 duration()const{return externalMode_?external_.duration():player_.duration();}QString errorString()const{return externalMode_?external_.error():error_;}std::string error()const{return errorString().toStdString();}int volume()const{return qRound(output_.volume()*100);}bool repeat()const{return repeat_;}bool shuffle()const{return shuffle_;}
 const DesktopTrack& current()const{return externalMode_?externalTrack_:localTrack();}
 bool externalMode()const{return externalMode_;}WindowsMedia& external(){return external_;}bool canToggle()const{return !externalMode_||external_.can("canToggle");}bool canNext()const{return !externalMode_||external_.can("canNext");}bool canPrevious()const{return !externalMode_||external_.can("canPrevious");}
 void setExternalMode(bool value,const QString& preferred={}){if(value==externalMode_&&external_.active())return;externalMode_=value;if(value){wantPlay_=false;player_.pause();external_.start(root_,preferred);}else external_.stop();changed();if(onLibraryChanged)onLibraryChanged();}
 void chooseExternal(const QString& id){external_.choose(id);if(onLibraryChanged)onLibraryChanged();}void refreshExternal(){if(externalMode_)external_.start(root_,external_.preferred());}
 int addTracks(const QList<DesktopTrack>& entries){int added=0;for(const auto& t:entries){auto before=tracks_.size();auto error=addLink(t.url.toString(),t.title);if(error.isEmpty()&&tracks_.size()>before){links_.last().artist=t.artist;tracks_.last().artist=t.artist;++added;}}return added;}
 void rescan(){if(scanning_)return;scanning_=true;auto folders=folders_;scan_=std::async(std::launch::async,[folders]{return scanMusicFolders(folders);});scanTimer_.start();changed();}
 bool addFolder(const QString& folder){if(scanning_||!QFileInfo(folder).isDir())return false;auto p=QFileInfo(folder).canonicalFilePath();if(!folders_.contains(p))folders_.push_back(p);rescan();return true;}
 void removeFolder(const QString& folder){if(scanning_)return;folders_.removeAll(folder);rescan();}
 QString addLink(const QString& raw,const QString& name){QUrl url(raw.trimmed());auto err=musicUrlError(url);if(!err.isEmpty())return err;for(const auto& t:tracks_)if(t.url==url)return QStringLiteral("Эта ссылка уже добавлена.");DesktopTrack t{url,name.trimmed().isEmpty()?url.fileName():name.trimmed(),QStringLiteral("Онлайн · ")+url.host(),{},false};if(t.title.isEmpty())t.title=url.host();links_.append(t);tracks_.append(t);changed();if(onLibraryChanged)onLibraryChanged();return {};}
 void removeLink(int index){if(index<1||index>=tracks_.size()||tracks_[index].url.isLocalFile())return;auto url=tracks_[index].url;for(int i=links_.size()-1;i>=0;--i)if(links_[i].url==url)links_.removeAt(i);if(index==index_)load(0,false);tracks_.removeAt(index);if(index<index_)--index_;changed();if(onLibraryChanged)onLibraryChanged();}
 void setCover(const QString& path){auto image=musicReadImage(path);if(image.isNull())return;overrides_[localTrack().url.toString()]=path;tracks_[index_].cover=path;cover_=image;changed();if(onLibraryChanged)onLibraryChanged();}
 QJsonArray history() const { return history_; }
 void select(int index) {
     playQueue_.clear();
     if (externalMode_) setExternalMode(false);
     resumeAfterScan_=false;
     restoring_=false;
     restoreUrl_=QUrl();
     restorePosition_=0;
     load(index,true);
 }
 bool selectQueue(const QStringList& urls, const QString& first) {
     if(urls.isEmpty()) return false;
     const auto previous=playQueue_;
     playQueue_=urls;
     const auto indices=queueIndices();
     if (indices.isEmpty()) { playQueue_=previous; return false; }
     int start=indices.first();
     for (int index : indices) if (tracks_[index].url.toString()==first) { start=index; break; }
     select(start);
     playQueue_=urls;
     if (onLibraryChanged) onLibraryChanged();
     return true;
 }
 void next() {
     if (externalMode_) { if(canNext()) external_.send("next"); return; }
     const auto queue=queueIndices();
     if (queue.isEmpty()) { wantPlay_=false; player_.stop(); changed(); return; }
     const auto current=queue.indexOf(index_);
     auto offset=(current+1)%queue.size();
     if (shuffle_ && queue.size()>1 && current>=0) {
         offset=QRandomGenerator::global()->bounded(int(queue.size()-1));
         if (offset>=current) ++offset;
     }
     if (queue[offset]==index_) {
         player_.setPosition(0);
         if (wantPlay_&&!suspended_) player_.play();
     } else load(queue[offset],wantPlay_);
 }
 void previous() {
     if (externalMode_) { if(canPrevious()) external_.send("previous"); return; }
     if (player_.position()>3000) { player_.setPosition(0); return; }
     const auto queue=queueIndices();
     if (!queue.isEmpty()) {
         const auto current=queue.indexOf(index_);
         load(queue[(std::max(current,qsizetype(0))+queue.size()-1)%queue.size()],wantPlay_);
     }
 }
 bool setEnabled(bool value,const std::filesystem::path&){if(externalMode_){if(value==external_.playing())return true;return canToggle()&&external_.send("toggle");}error_.clear();wantPlay_=value;if(value){if(!audioAvailable())return false;if(player_.source()!=localTrack().url)player_.setSource(localTrack().url);if(player_.error()!=QMediaPlayer::NoError){player_.setSource({});player_.setSource(localTrack().url);}if(!suspended_)player_.play();}else player_.pause();changed();if(onLibraryChanged)onLibraryChanged();return true;}
 bool setVolume(int v,const std::filesystem::path&){output_.setVolume(std::clamp(v,0,100)/100.);changed();return true;}void seek(qint64 ms){if(externalMode_){if(seekable())external_.send("seek",{},std::clamp(ms,qint64(0),duration())+external_.current().value("startMs").toVariant().toLongLong());return;}if(seekable())player_.setPosition(std::clamp(ms,qint64(0),duration()));}void setRepeat(bool v){repeat_=v;if(onLibraryChanged)onLibraryChanged();changed();}void setShuffle(bool v){shuffle_=v;if(onLibraryChanged)onLibraryChanged();changed();}void suspend(bool v){if(externalMode_)return;suspended_=v;if(v)player_.pause();else if(wantPlay_)player_.play();}void pump(){}void close(){external_.stop();wantPlay_=false;player_.stop();}~DesktopMusic(){onChanged={};onLibraryChanged={};external_.onChanged={};external_.stop();player_.stop();if(scan_.valid())scan_.wait();}
};
