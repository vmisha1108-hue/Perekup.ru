#pragma once
#include <QProcess>
#include <QTimer>
#include <QTemporaryDir>
#include <QSaveFile>
#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>
#include <QElapsedTimer>
#include <QDateTime>
#include <QFileInfo>
#include <QDir>
#include <algorithm>
#include <QImage>
#include <QCoreApplication>
#include <memory>
#include <functional>
#ifdef Q_OS_WIN
#include <windows.h>
#endif
class WindowsMedia:public QObject {
 QProcess process_;QTimer watchdog_;QElapsedTimer received_;QByteArray buffer_;std::unique_ptr<QTemporaryDir> commands_;QJsonObject state_;QImage cover_;QString artKey_,error_,preferred_;bool active_=false;quint64 sequence_=0;
 void clear(){state_={};cover_={};artKey_.clear();}
 void emitChange(){if(onChanged)onChanged();}
 void consume(){buffer_+=process_.readAllStandardOutput();if(buffer_.size()>4*1024*1024){buffer_.clear();error_=QStringLiteral("Слишком большой ответ плеера Windows");return;}while(buffer_.contains('\n')){auto cut=buffer_.indexOf('\n');auto line=buffer_.left(cut);buffer_.remove(0,cut+1);auto doc=QJsonDocument::fromJson(line);if(!doc.isObject()||doc.object().value("protocol").toInt()!=1)continue;ingest(doc.object());}}
public:
 std::function<void()> onChanged;
 explicit WindowsMedia(QObject* parent=nullptr):QObject(parent){QObject::connect(&process_,&QProcess::readyReadStandardOutput,this,[this]{consume();});QObject::connect(&process_,&QProcess::readyReadStandardError,this,[this]{process_.readAllStandardError();});QObject::connect(&process_,&QProcess::started,this,[this]{received_.start();send("select",preferred_);});QObject::connect(&process_,&QProcess::errorOccurred,this,[this](QProcess::ProcessError){if(active_){clear();error_=QStringLiteral("Не удалось запустить подключение к музыке Windows");emitChange();}});QObject::connect(&process_,qOverload<int,QProcess::ExitStatus>(&QProcess::finished),this,[this](int,QProcess::ExitStatus){if(active_){clear();error_=QStringLiteral("Подключение остановлено. Нажмите «Обновить плееры».");emitChange();}});watchdog_.setInterval(1000);QObject::connect(&watchdog_,&QTimer::timeout,this,[this]{if(active_&&received_.isValid()&&received_.elapsed()>12000){clear();error_=QStringLiteral("Плеер Windows не отвечает. Обновите подключение.");emitChange();}});}
 ~WindowsMedia(){onChanged={};stop();}
 QString commandDirectory()const{return commands_?commands_->path():QString();}
 bool active()const{return active_;}bool connected()const{return active_&&!state_.value("current").toObject().isEmpty();}QJsonArray sources()const{return state_.value("sources").toArray();}QJsonObject current()const{return state_.value("current").toObject();}QString selected()const{return state_.value("selected").toString();}QString preferred()const{return preferred_;}QString error()const{return error_;}QImage cover()const{return cover_;}bool playing()const{return connected()&&current().value("playing").toBool();}bool can(const char* key)const{return connected()&&current().value(key).toBool();}
 qint64 duration()const{return std::max(qint64(0),current().value("endMs").toVariant().toLongLong()-current().value("startMs").toVariant().toLongLong());}
 qint64 position()const{auto c=current();auto value=c.value("positionMs").toVariant().toLongLong()-c.value("startMs").toVariant().toLongLong();auto updated=c.value("updatedMs").toVariant().toLongLong();if(playing()&&updated>0)value+=std::clamp(QDateTime::currentMSecsSinceEpoch()-updated,qint64(0),qint64(12000));return std::clamp(value,qint64(0),duration()>0?duration():std::max(qint64(0),value));}
 void ingest(const QJsonObject& input){state_=input;error_=input.value("error").toString().isEmpty()?QString():QStringLiteral("Плеер не передал данные или не выполнил команду. Попробуйте обновить подключение.");auto c=current();auto key=c.value("artKey").toString();auto encoded=c.value("artBase64").toString();if(!connected()||key!=artKey_){artKey_=key;cover_={};}if(!encoded.isEmpty()&&encoded.size()<3*1024*1024){auto decoded=QImage::fromData(QByteArray::fromBase64(encoded.toLatin1()));if(!decoded.isNull())cover_=decoded.scaled(640,640,Qt::KeepAspectRatio,Qt::SmoothTransformation);}received_.restart();emitChange();}
 bool send(const QString& op,const QString& session={},qint64 position=0){if(!active_||!commands_||!commands_->isValid())return false;QJsonObject value{{"op",op},{"session",session.isEmpty()?selected():session},{"positionMs",double(position)},{"createdMs",double(QDateTime::currentMSecsSinceEpoch())}};if(op=="select")value["session"]=session;QSaveFile f(commands_->path()+QString("/%1.json").arg(++sequence_,10,10,QChar('0')));auto bytes=QJsonDocument(value).toJson(QJsonDocument::Compact);return f.open(QIODevice::WriteOnly)&&f.write(bytes)==bytes.size()&&f.commit();}
 void choose(const QString& id){preferred_=id;send("select",id);}
 void stop(){active_=false;watchdog_.stop();if(process_.state()!=QProcess::NotRunning){process_.kill();process_.waitForFinished(500);}commands_.reset();buffer_.clear();clear();error_.clear();emitChange();}
 void start(const QString& root,const QString& preferred={}){stop();active_=true;preferred_=preferred;QDir().mkpath(root+"/saves/windows-media");commands_=std::make_unique<QTemporaryDir>(root+"/saves/windows-media/run-XXXXXX");if(!commands_->isValid()){error_=QStringLiteral("Нет доступа к папке сохранений для подключения Windows");emitChange();return;}
#ifdef Q_OS_WIN
 auto script=root+"/tools/media/windows-media.ps1";if(!QFileInfo::exists(script)){error_=QStringLiteral("Не найден компонент подключения. Перенесите папку tools из обновления.");emitChange();return;}auto powershell=qEnvironmentVariable("SystemRoot","C:/Windows")+"/System32/WindowsPowerShell/v1.0/powershell.exe";process_.setProgram(powershell);process_.setArguments({"-NoLogo","-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-File",QDir::toNativeSeparators(script),"-CommandDirectory",QDir::toNativeSeparators(commands_->path()),"-OwnerPid",QString::number(QCoreApplication::applicationPid())});process_.setCreateProcessArgumentsModifier([](QProcess::CreateProcessArguments* args){args->flags|=CREATE_NO_WINDOW;});process_.start();received_.start();watchdog_.start();
#else
 Q_UNUSED(root);error_=QStringLiteral("Подключение внешнего плеера доступно в Windows 10/11.");
#endif
 emitChange();}
};
