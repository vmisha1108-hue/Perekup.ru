#pragma once
#include <QApplication>
#include <QMenu>
#include <QTimer>
#include <QLabel>
#include <QAbstractButton>
#include <QLineEdit>
#include <QComboBox>
#include <QCalendarWidget>
#include <QFile>
#include <QRegularExpression>
#include <QSignalBlocker>
#include "bank.hpp"
class UiLanguage:public QObject {
 QString language_="ru";QHash<QString,QString> messages_;struct Pattern{QRegularExpression regex;QString replacement;};QList<Pattern> patterns_;bool changing_=false;int generation_=0;
 static QString canonical(QString s){static const QRegularExpression whitespace("\\s+");return s.trimmed().replace(whitespace," ");}
 template<class Getter,class Setter>void field(QObject* object,const char* key,Getter getter,Setter setter){auto current=getter();auto state=object->property(key).toMap();if(state.value("last").toString()==current&&state.value("generation").toInt()==generation_&&state.contains("source"))return;auto source=state.contains("source")&&state.value("last").toString()==current?state.value("source").toString():current;auto translated=text(source);if(current!=translated)setter(translated);object->setProperty(key,QVariantMap{{"source",source},{"last",translated},{"generation",generation_}});}
public:
 explicit UiLanguage(QObject* parent=nullptr):QObject(parent){qApp->installEventFilter(this);auto timer=new QTimer(this);connect(timer,&QTimer::timeout,this,[this]{refresh();});timer->start(250);}
 QString language()const{return language_;}
 bool load(const QString& root){QFile file(root+"/data/locales/en.json");if(!file.open(QIODevice::ReadOnly))return false;try{auto bytes=file.readAll();auto j=perekup::Json::parse(bytes.constData(),bytes.constData()+bytes.size());for(auto it=j.at("messages").begin();it!=j.at("messages").end();++it)messages_[canonical(QString::fromStdString(it.key()))]=QString::fromStdString(it.value().get<std::string>());for(const auto& p:j.at("patterns")){QRegularExpression::PatternOptions options=QRegularExpression::UseUnicodePropertiesOption;if(p.value("flags","").find('i')!=std::string::npos)options|=QRegularExpression::CaseInsensitiveOption;QRegularExpression regex(QString::fromStdString(p.at("regex")),options);auto replacement=QString::fromStdString(p.at("replacement"));for(int n=9;n>=1;--n)replacement.replace("$"+QString::number(n),"\\"+QString::number(n));if(regex.isValid())patterns_.push_back({regex,replacement});}return true;}catch(...){return false;}}
 bool setLanguage(const QString& value){if(value!="ru"&&value!="en")return false;if(value=="en"&&messages_.isEmpty())return false;language_=value;++generation_;refresh();return true;}
 QString text(const QString& source)const{if(source.isEmpty())return source;auto key=canonical(source);if(language_=="ru"){static const QHash<QString,QString> defaults={{"Cancel",QStringLiteral("Отмена")},{"&Cancel",QStringLiteral("Отмена")},{"Yes",QStringLiteral("Да")},{"&Yes",QStringLiteral("Да")},{"No",QStringLiteral("Нет")},{"&No",QStringLiteral("Нет")},{"Open",QStringLiteral("Открыть")},{"Save",QStringLiteral("Сохранить")},{"Close",QStringLiteral("Закрыть")}};return defaults.value(key,source);}auto it=messages_.constFind(key);if(it!=messages_.cend())return *it;for(const auto& p:patterns_)if(p.regex.match(key).hasMatch())return QString(key).replace(p.regex,p.replacement);if(source.contains('\n')){auto lines=source.split('\n');for(auto& line:lines)line=text(line);return lines.join('\n');}if(key.startsWith(QStringLiteral("Следующая цель: ")))return "Next goal: "+text(key.mid(16));return source;}
 void apply(QWidget* widget){if(changing_||!widget||widget->property("noI18n").toBool())return;changing_=true;field(widget,"_langTitle",[&]{return widget->windowTitle();},[&](const QString& s){widget->setWindowTitle(s);});field(widget,"_langTip",[&]{return widget->toolTip();},[&](const QString& s){widget->setToolTip(s);});if(auto label=qobject_cast<QLabel*>(widget))field(label,"_langText",[&]{return label->text();},[&](const QString& s){label->setText(s);});if(auto b=qobject_cast<QAbstractButton*>(widget))field(b,"_langText",[&]{return b->text();},[&](const QString& s){b->setText(s);});if(auto input=qobject_cast<QLineEdit*>(widget))field(input,"_langPlaceholder",[&]{return input->placeholderText();},[&](const QString& s){input->setPlaceholderText(s);});if(auto combo=qobject_cast<QComboBox*>(widget)){QSignalBlocker blocker(combo);for(int i=0;i<combo->count();++i){auto current=combo->itemText(i);auto entry=combo->itemData(i,Qt::UserRole+79).toMap();if(entry.contains("source")&&entry.value("last").toString()==current&&entry.value("generation").toInt()==generation_)continue;auto source=entry.contains("source")&&entry.value("last").toString()==current?entry.value("source").toString():current;auto translated=text(source);if(translated!=current)combo->setItemText(i,translated);combo->setItemData(i,QVariantMap{{"source",source},{"last",translated},{"generation",generation_}},Qt::UserRole+79);}}if(auto calendar=qobject_cast<QCalendarWidget*>(widget)){QLocale locale(language_=="en"?QLocale::English:QLocale::Russian);if(calendar->locale().language()!=locale.language())calendar->setLocale(locale);}changing_=false;}
 void refresh(){if(changing_)return;for(auto widget:QApplication::allWidgets()){apply(widget);if(auto menu=qobject_cast<QMenu*>(widget))for(auto action:menu->actions())field(action,"_langText",[&]{return action->text();},[&](const QString& s){action->setText(s);});}}
protected:
 bool eventFilter(QObject* object,QEvent* event)override{if(event->type()==QEvent::Show||event->type()==QEvent::Paint||event->type()==QEvent::PolishRequest)if(auto widget=qobject_cast<QWidget*>(object))apply(widget);return QObject::eventFilter(object,event);}
};
inline UiLanguage*& uiLanguageInstance(){static UiLanguage* instance=nullptr;return instance;}
