#pragma once
#include <QMap>
#include <QPointer>
// Presentation-only tokens. Gameplay and save format are deliberately not involved.
inline QString osThemeCss(bool dark,const QString& accent=QString()){
 QString css=QString::fromUtf8(R"CSS(
QListWidget#musicTrackList{background:@card;border:1px solid @line;border-radius:9px;padding:6px;outline:0;}
QListWidget#musicTrackList::item{border-radius:7px;color:@text;padding:5px;}
QListWidget#musicTrackList::item:selected{background:@surface;color:@accent;}
QListWidget#musicTrackList::item:hover{background:@surface;}
QTabWidget#marketDealsTabs::pane{border:0;background:transparent;}
QTabWidget#marketDealsTabs QTabBar::tab{background:@card;color:@text;border:1px solid @line;border-radius:12px;padding:9px 12px;margin-right:6px;margin-bottom:10px;}
QTabWidget#marketDealsTabs QTabBar::tab:selected{background:@accent;color:@onAccent;border-color:@accent;}
QWidget#marketDealsPage QScrollArea{border:0;background:transparent;}
QWidget{font-family:'Segoe UI','Arial',sans-serif;font-size:12px;color:@text;}
QMdiSubWindow,QWidget#osWindow,QDialog[osDialog=true]{background:@window;border:1px solid @line;border-radius:14px;}
QWidget#dialogContent,QScrollArea>QWidget>QWidget{background:@window;}
QWidget#osTitleBar{background:@window;border-bottom:1px solid @line;border-top-left-radius:8px;border-top-right-radius:8px;}
QWidget#osTitleBar QLabel{color:@text;font-size:14px;font-weight:400;}
QWidget#osTitleBar QPushButton{border:0;background:transparent;}
QWidget#osTitleBar QPushButton:hover{background:@surface;}
QWidget#osTitleBar QPushButton#osClose:hover{background:#a44247;}
QWidget#sidebar,QWidget#appSidebar{background:@window;}
QWidget#sidebar QLabel,QWidget#appSidebar QLabel{color:@secondary;}
QWidget#sidebar QPushButton,QWidget#appSidebar QPushButton{background:transparent;border:0;color:@secondary;text-align:left;font-size:11px;border-radius:10px;padding:10px 8px;}
QWidget#sidebar QPushButton[selected=true],QWidget#appSidebar QPushButton[selected=true]{background:@surface;color:@accent;}
QWidget#sidebar QPushButton:hover,QWidget#appSidebar QPushButton:hover{background:@surface;}
QToolButton{background:@card;color:@text;border:1px solid @line;border-radius:10px;padding:5px;}
QPushButton{background:@accent;border:1px solid @accent;color:@onAccent;border-radius:10px;padding:9px 14px;font-size:12px;}
QPushButton:hover{background:@hover;border-color:@hover;}
QPushButton:pressed{padding-top:10px;padding-bottom:8px;}
QPushButton:focus,QToolButton:focus{border:1px solid @accent;}
QPushButton:checked{background:@surface;color:@accent;border-color:@accent;}
QPushButton:disabled{background:@line;border-color:@line;color:@muted;}
QPushButton[secondary=true]{background:@card;color:@secondary;border:1px solid @line;}
QPushButton[secondary=true]:hover{background:@surface;}
QPushButton[textLink=true]{background:transparent;border:0;color:@accent;padding:2px 0;text-align:left;}
QLineEdit,QComboBox,QSpinBox{background:@field;color:@text;border:1px solid @line;border-radius:10px;padding:8px 10px;selection-background-color:@accent;selection-color:@onAccent;}
QLineEdit:focus,QComboBox:focus{border-color:@accent;}
QComboBox QAbstractItemView{background:@field;color:@text;border:1px solid @line;selection-background-color:@accent;selection-color:@onAccent;outline:0;}
QComboBox QAbstractItemView::item{background:@field;color:@text;}
QComboBox QAbstractItemView::item:selected{background:@accent;color:@onAccent;}
QTextEdit{background:@card;color:@text;border:1px solid @line;border-radius:12px;padding:10px;}
QScrollArea{background:transparent;border:0;}
QFrame#card,QFrame#commerceCard,QFrame#settingsCard,QFrame#documentCard,QFrame#garageCard{background:@card;border:1px solid @line;border-radius:12px;}
QFrame#card:hover,QFrame#commerceCard:hover{border-color:@accent;}
QFrame#financeCard,QFrame#stagePanel,QFrame#routeCard{background:@surface;border:1px solid @line;border-radius:12px;}
QWidget#marketCardBody{background:transparent;}
QLabel#marketTitle{font-size:14px;font-weight:600;color:@text;}
QLabel#marketCity,QLabel#marketDescription{font-size:10px;color:@muted;}
QLabel#heading{font-size:22px;color:@text;font-weight:600;}
QLabel#price{font-size:19px;color:@accent;font-weight:600;}
QLabel#musicElapsed,QLabel#musicDuration,QLabel#muted,QLabel#appSubtitle,QLabel#calendarWeekday,QLabel#sleepStatus{color:@muted;}
QLabel#eyebrow,QLabel#clockTime{color:@accent;}
QLabel#accountBalance{font-size:38px;font-weight:700;color:@text;}
QLabel#wallet{background:@surface;color:@accent;border:1px solid @line;border-radius:12px;}
QLabel#contractHelp{background:@surface;color:@secondary;border:1px solid @line;border-radius:12px;padding:14px;}
QWidget#calculator QPushButton{background:@card;color:@text;border:1px solid @line;border-radius:10px;font-size:18px;}
QWidget#calculator QPushButton[operation=true]{background:@surface;color:@accent;}
QWidget#calculator QPushButton[equal=true]{background:@accent;color:@onAccent;border-color:@accent;}
QWidget#calculator QPushButton[clear=true]{background:@warning;color:@danger;border-color:@warningLine;}
QWidget#calculator QLabel#calcDisplay{background:@field;color:@text;border:1px solid @line;}
QPushButton#calendarDay{background:@card;color:@text;border:1px solid @line;border-radius:10px;font-size:12px;}
QPushButton#calendarDay[today=true],QPushButton#calendarDay[chosen=true]{background:@surface;color:@accent;border-color:@accent;font-weight:600;}
QPushButton#passportToggle{background:@surface;color:@accent;text-align:left;border:1px solid @line;padding:16px;}
QGroupBox{border:1px solid @line;border-radius:12px;color:@text;}
QGroupBox::title{color:@secondary;}
QScrollBar:vertical{background:@window;width:7px;}
QScrollBar::handle:vertical{background:@line;border-radius:3px;min-height:28px;}
QScrollBar::handle:vertical:hover{background:@muted;}
QScrollBar::add-line:vertical,QScrollBar::sub-line:vertical{height:0;}
QScrollBar::add-page:vertical,QScrollBar::sub-page:vertical{background:transparent;}
QCheckBox{spacing:9px;padding:4px 0;}
QCheckBox::indicator{width:16px;height:16px;border:1px solid @line;border-radius:5px;background:@field;}
QCheckBox::indicator:checked{background:@accent;border:3px solid @field;}
QCheckBox::indicator:hover{border-color:@accent;}
QToolTip{background:@card;color:@text;border:1px solid @line;padding:7px;border-radius:7px;}
QPushButton#musicPlayPause{min-width:102px;border-radius:18px;font-weight:600;}
QPushButton#musicPrevious,QPushButton#musicNext{background:@surface;color:@text;border-color:@line;min-width:54px;}
QPushButton#musicShuffle,QPushButton#musicRepeat{background:transparent;color:@muted;border-color:transparent;}
QPushButton#musicShuffle:checked,QPushButton#musicRepeat:checked{background:@surface;color:@accent;border-color:@line;}
QWidget#musicApp QLabel#musicPlaybackStatus{color:@muted;}
QProgressBar#sellerMood,QProgressBar#tutorialProgress{background:@surface;border:0;border-radius:4px;}
QProgressBar#sellerMood::chunk,QProgressBar#tutorialProgress::chunk{background:@accent;border-radius:4px;}
QWidget#topPanel{background:transparent;border:0;}
QWidget#topPanel QLabel{color:#e4ecec;font-size:12px;background:transparent;}
QWidget#topPanel QPushButton{color:#e4ecec;border:1px solid rgba(198,208,212,45);background:rgba(36,46,57,100);border-radius:16px;padding:0;font-size:20px;}
QWidget#topPanel QLabel#desktopBrand{font-size:16px;font-weight:500;letter-spacing:3px;}
QWidget#dock{background:rgba(36,46,57,240);border:1px solid #53636f;border-radius:10px;}
QWidget#dock QPushButton{background:transparent;border:0;}
QWidget#dock QPushButton:hover{background:#374a54;}
QWidget#dock QPushButton#dockMusic{color:@secondary;font-size:21px;}
QWidget#dock QPushButton[taskButton=true][active=true]{background:rgba(92,185,169,30);border:0;}
QLabel#desktopHint{background:transparent;color:#bac8ce;font-size:11px;}
QMenu{background:#242e39;color:#e4ecec;border:1px solid #465059;border-radius:9px;}
QWidget#appMenuGrid{background:transparent;}
QWidget#appMenuGrid QPushButton{background:transparent;color:#e4ecec;border:0;text-align:left;}
QWidget#appMenuGrid QPushButton:hover{background:#19796f;}
QWidget#appMenuGrid QLabel{background:transparent;color:@secondary;font-size:11px;letter-spacing:2px;}
QWidget#dock QPushButton#launcherP{color:#e4ecec;font-size:27px;font-style:italic;font-weight:700;}
)CSS");
 QMap<QString,QString> values={{"@text",dark?"#edf4f2":"#263036"},{"@secondary",dark?"#c1d0ce":"#526168"},{"@muted",dark?"#96aaa9":"#748086"},{"@field",dark?"#111b21":"#ffffff"},{"@surface",dark?"#1e2b31":"#f0f2f1"},{"@card",dark?"#172128":"#ffffff"},{"@line",dark?"#304148":"#dce1de"},{"@window",dark?"#10191f":"#f7f8f5"},{"@accent",dark?"#8be0c7":"#14796f"},{"@onAccent",dark?"#102e27":"#ffffff"},{"@hover",dark?"#a5edda":"#21877d"},{"@warningLine",dark?"#85505a":"#e7b3bf"},{"@warning",dark?"#42232e":"#fff0f3"},{"@danger",dark?"#ffc7cf":"#a72d41"}};
 if(QColor(accent).isValid()){values["@accent"]=accent;values["@hover"]=QColor(accent).lighter(112).name();}
 // Long names first: @warningLine must be replaced before @warning.
 QStringList keys=values.keys();std::sort(keys.begin(),keys.end(),[](const QString& a,const QString& b){return a.size()>b.size();});for(const auto& key:keys)css.replace(key,values[key]);return css;
}
inline void osThemeInlineWidgets(bool dark){
 for(auto widget:QApplication::allWidgets()){
  auto current=widget->styleSheet();auto applied=widget->property("_osThemeApplied");auto base=widget->property("_osThemeBase");if(!applied.isValid()||current!=applied.toString()){base=current;widget->setProperty("_osThemeBase",base);}auto style=base.toString();
  if(dark&&!widget->property("paperDocument").toBool()){
   const QMap<QString,QString> colors={{"#263036","#edf4f2"},{"#27343a","#edf4f2"},{"#27363c","#edf4f2"},{"#2b373d","#edf4f2"},{"#24343a","#edf4f2"},{"#526168","#c1d0ce"},{"#52636b","#c1d0ce"},{"#748086","#96aaa9"},{"#798992","#96aaa9"},{"#dce3df","#304148"},{"#dce1de","#304148"},{"#f7f8f5","#10191f"},{"#f7f9f6","#10191f"},{"#eef2f0","#1e2b31"},{"#14796f","#8be0c7"},{"#147d74","#8be0c7"},{"#00818d","#8be0c7"}};
   for(auto it=colors.begin();it!=colors.end();++it)style.replace(it.key(),it.value(),Qt::CaseInsensitive);style.replace("background:white","background:#172128",Qt::CaseInsensitive).replace("background: white","background:#172128",Qt::CaseInsensitive);
  }
  if(current!=style)widget->setStyleSheet(style);widget->setProperty("_osThemeApplied",style);
 }
}
// Stores only window geometry; a timer avoids writing settings on every mouse event.
class OsWindowMemory:public QObject {
 QTimer timer;QPointer<QMdiSubWindow> window;std::function<void(QRect)> write;
public:OsWindowMemory(QMdiSubWindow* w,std::function<void(QRect)> callback):QObject(w),window(w),write(std::move(callback)){timer.setSingleShot(true);timer.setInterval(650);w->installEventFilter(this);QObject::connect(&timer,&QTimer::timeout,this,[this]{if(window&&!window->property("osExpanded").toBool()&&!window->property("osAnimating").toBool())write(window->geometry());});}
protected:bool eventFilter(QObject* o,QEvent* e)override{if(e->type()==QEvent::Move||e->type()==QEvent::Resize)timer.start();if(e->type()==QEvent::Close&&window&&!window->property("osExpanded").toBool())write(window->property("osAnimating").toBool()?window->property("osRestoreRect").toRect():window->geometry());return QObject::eventFilter(o,e);}
};
inline QString osBubbleCss(bool dark){return dark?QStringLiteral("QLabel#playerBubble{background:#245348;color:#a4ead9;border:1px solid #397467;border-radius:14px;font-size:12px;}QLabel#npcBubble{background:#172128;color:#edf4f2;border:1px solid #304148;border-radius:14px;font-size:12px;}QLabel#speakerAvatar{background:#1e2b31;border-radius:18px;}"):QStringLiteral("QLabel#playerBubble{background:#d8ebe4;color:#264c43;border:1px solid #c5dfd5;border-radius:14px;font-size:12px;}QLabel#npcBubble{background:white;color:#263036;border:1px solid #dce1de;border-radius:14px;font-size:12px;}QLabel#speakerAvatar{background:#f0f2f1;border-radius:18px;}");}
