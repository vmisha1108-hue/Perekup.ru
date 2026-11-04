#pragma once
#include <QPainterPath>
#include <climits>
#include <QProxyStyle>
#include <QStyleFactory>
#include <QMouseEvent>
#include <QSizeGrip>
#include <QMenu>
#include <QStyleOptionToolButton>
#include <QScrollBar>
#include <QGraphicsOpacityEffect>
#include <QGraphicsDropShadowEffect>
#include <QPropertyAnimation>
#include <QVariantAnimation>
#include <QStyleOptionButton>
#include <QEnterEvent>
#include <QJsonArray>

class OsControlStyle:public QProxyStyle {
public:OsControlStyle():QProxyStyle(QStyleFactory::create("Fusion")){}
 void drawPrimitive(PrimitiveElement element,const QStyleOption* option,QPainter* painter,const QWidget* widget=nullptr)const override{if(element==PE_IndicatorArrowDown){painter->save();painter->setRenderHint(QPainter::Antialiasing);painter->setPen(QPen(option->state&State_Enabled?QColor("#526168"):QColor("#adb8b5"),1.5,Qt::SolidLine,Qt::RoundCap,Qt::RoundJoin));auto c=option->rect.center();QPainterPath path;path.moveTo(c.x()-4,c.y()-2);path.lineTo(c.x(),c.y()+2);path.lineTo(c.x()+4,c.y()-2);painter->drawPath(path);painter->restore();return;}QProxyStyle::drawPrimitive(element,option,painter,widget);}
};
// Resolution-independent native pictograms; the launcher uses the original P asset.
inline QIcon osIcon(const QString& id, QColor ink=QColor("#dce7e8")) {
 QPixmap image(80,80); image.fill(Qt::transparent); QPainter p(&image);
 p.setRenderHint(QPainter::Antialiasing);p.scale(2.5,2.5);
 p.setPen(QPen(ink,1.4,Qt::SolidLine,Qt::RoundCap,Qt::RoundJoin));p.setBrush(Qt::NoBrush);
 if(id=="market"||id=="commerce") {p.drawRoundedRect(QRectF(5,14,22,10),2,2);QPainterPath a;a.moveTo(8,14);a.lineTo(11,8);a.lineTo(22,8);a.lineTo(25,14);p.drawPath(a);p.drawLine(9,18,12,18);p.drawLine(21,18,24,18);p.drawLine(8,24,8,27);p.drawLine(24,24,24,27);}
 else if(id=="garage") {QPainterPath a;a.moveTo(5,27);a.lineTo(5,13);a.lineTo(16,5);a.lineTo(27,13);a.lineTo(27,27);a.moveTo(10,27);a.lineTo(10,16);a.lineTo(22,16);a.lineTo(22,27);p.drawPath(a);p.drawLine(10,20,22,20);p.drawLine(10,24,22,24);}
 else if(id=="calendar") {p.drawRoundedRect(QRectF(6,8,21,20),2,2);p.drawLine(6,14,27,14);p.drawLine(11,5,11,10);p.drawLine(22,5,22,10);p.drawLine(11,19,14,19);p.drawLine(19,19,22,19);p.drawLine(11,24,14,24);}
 else if(id=="calc") {p.drawRoundedRect(QRectF(8,4,17,25),2,2);p.drawRect(QRectF(11,8,11,5));for(int y=17;y<=25;y+=4)for(int x=12;x<=22;x+=5)p.drawPoint(x,y);}
 else if(id=="music"){p.drawEllipse(QRectF(6,19,8,6));p.drawLine(14,22,14,7);p.drawLine(14,7,27,4);p.drawLine(27,4,27,19);p.drawEllipse(QRectF(19,16,8,6));}
 else if(id=="clock") {p.drawEllipse(QRectF(5,5,23,23));p.drawLine(16,9,16,17);p.drawLine(16,17,22,20);}
 else if(id=="settings") {QPainterPath a;for(int n=0;n<24;++n){double angle=n*3.141592653589793/12;double r=(n%4==1||n%4==2)?13:10;QPointF pt(16+std::cos(angle)*r,16+std::sin(angle)*r);if(!n)a.moveTo(pt);else a.lineTo(pt);}a.closeSubpath();p.drawPath(a);p.drawEllipse(QRectF(11,11,10,10));}
 else if(id=="favorite"){QPainterPath a;a.moveTo(16,27);a.cubicTo(-2,14,5,1,16,11);a.cubicTo(27,1,34,14,16,27);p.drawPath(a);}
 else if(id=="bank") {QPainterPath a;a.moveTo(4,11);a.lineTo(16,5);a.lineTo(28,11);a.closeSubpath();p.drawPath(a);for(int x=8;x<=24;x+=8)p.drawLine(x,15,x,25);p.drawLine(4,28,28,28);}
 else if(id=="documents") {QPainterPath a;a.moveTo(9,4);a.lineTo(21,4);a.lineTo(27,10);a.lineTo(27,29);a.lineTo(9,29);a.closeSubpath();p.drawPath(a);p.drawLine(21,4,21,11);p.drawLine(21,11,27,11);p.drawLine(13,16,23,16);p.drawLine(13,21,23,21);}
 else if(id=="travel") {QPainterPath a;a.moveTo(4,7);a.lineTo(12,4);a.lineTo(21,8);a.lineTo(29,5);a.lineTo(29,26);a.lineTo(21,29);a.lineTo(12,25);a.lineTo(4,28);a.closeSubpath();p.drawPath(a);p.drawLine(12,4,12,25);p.drawLine(21,8,21,29);}
 else if(id=="business") {p.drawRoundedRect(QRectF(5,11,23,16),2,2);p.drawRect(QRectF(12,6,9,5));p.drawLine(5,18,28,18);p.drawLine(16,16,16,21);}
 else if(id=="snake") {QPainterPath a;a.moveTo(5,24);a.lineTo(20,24);a.cubicTo(28,24,28,16,20,16);a.lineTo(12,16);a.cubicTo(4,16,4,8,12,8);a.lineTo(25,8);p.drawPath(a);p.drawPoint(23,7);}
 else {p.drawEllipse(QRectF(6,6,20,20));p.drawLine(16,9,16,20);}
 return QIcon(image);
}
class OsShortcut:public QToolButton {
 QPoint pressPos,origin;bool dragged=false;QFrame* gridPreview=nullptr;
public:
 std::function<void(QPoint)> moved;
 void alignToGrid(){snapToGrid();}
 void clampToDesktop(){auto area=parentWidget()->size();move(std::clamp(x(),0,std::max(0,area.width()-width())),std::clamp(y(),0,std::max(0,area.height()-height()-82)));}
protected:
 void paintEvent(QPaintEvent*)override{QStyleOptionToolButton option;initStyleOption(&option);option.text.clear();option.icon=QIcon();QPainter painter(this);style()->drawComplexControl(QStyle::CC_ToolButton,&option,&painter,this);icon().paint(&painter,QRect((width()-32)/2,12,32,32));painter.setPen(QColor("#ecf1f0"));painter.setFont(font());painter.drawText(QRect(2,51,width()-4,height()-51),Qt::AlignHCenter|Qt::AlignTop|Qt::TextWordWrap,text());}
 void mousePressEvent(QMouseEvent* e)override{pressPos=e->globalPosition().toPoint();origin=pos();dragged=false;QToolButton::mousePressEvent(e);}
 void mouseMoveEvent(QMouseEvent* e)override{if(e->buttons()&Qt::LeftButton){auto delta=e->globalPosition().toPoint()-pressPos;if(delta.manhattanLength()>QApplication::startDragDistance())dragged=true;if(dragged){move(origin+delta);clampToDesktop();if(!gridPreview){gridPreview=new QFrame(parentWidget());gridPreview->setObjectName("iconGridPreview");gridPreview->setAttribute(Qt::WA_TransparentForMouseEvents);gridPreview->setStyleSheet("background:rgba(16,154,168,20);border:1px dashed #21acb5;border-radius:10px;");}gridPreview->setGeometry(QRect(gridTarget(),size()));gridPreview->show();raise();e->accept();return;}}QToolButton::mouseMoveEvent(e);}
 QPoint gridTarget()const{auto area=parentWidget()->size();int cols=std::max(1,(area.width()-24)/102),rows=std::max(1,(area.height()-78-82)/102);QPoint desired(std::clamp(qRound((x()-24)/102.),0,cols-1),std::clamp(qRound((y()-78)/102.),0,rows-1));QPoint best=desired;int distance=INT_MAX;for(int row=0;row<rows;++row)for(int col=0;col<cols;++col){QPoint candidate(24+col*102,78+row*102);bool taken=false;for(auto other:parentWidget()->findChildren<QToolButton*>(QRegularExpression("shortcut-.*"),Qt::FindDirectChildrenOnly))if(other!=this&&QRect(candidate,size()).intersects(other->geometry()))taken=true;int score=(col-desired.x())*(col-desired.x())+(row-desired.y())*(row-desired.y());if(!taken&&score<distance){distance=score;best=QPoint(col,row);}}return QPoint(24+best.x()*102,78+best.y()*102);}
 void snapToGrid(){move(gridTarget());}
 void mouseReleaseEvent(QMouseEvent* e)override{if(dragged){setDown(false);snapToGrid();if(gridPreview){gridPreview->deleteLater();gridPreview=nullptr;}if(moved)moved(pos());e->accept();return;}QToolButton::mouseReleaseEvent(e);}
};
// Same application frame as the reference OS; navigation scrolls existing native controls.
inline QWidget* osAppBody(const QString& id,const QString& title,QWidget* body){
 const QHash<QString,QString> descriptions={{"settings",QStringLiteral("Ваш профиль")},{"bank",QStringLiteral("Счета и финансы")},{"garage",QStringLiteral("Ваши автомобили")},{"business",QStringLiteral("Управление делами")},{"commerce",QStringLiteral("Автосалон и импорт")},{"calendar",QStringLiteral("Встречи и планы")},{"travel",QStringLiteral("Города и маршруты")},{"documents",QStringLiteral("Договоры и сделки")},{"garage-shop",QStringLiteral("Место для автомобилей")}};
 if(id=="meetings"){auto scroll=new QScrollArea;scroll->setWidgetResizable(true);scroll->setWidget(body);return scroll;}
 if(!descriptions.contains(id))return body;
 if(body->layout())body->layout()->setContentsMargins(id=="settings"?0:24,id=="settings"?0:24,id=="settings"?0:24,id=="settings"?0:24);auto frame=new QWidget;frame->setObjectName("osAppLayout");auto row=new QHBoxLayout(frame);row->setContentsMargins(0,0,0,0);row->setSpacing(0);auto side=new QWidget;side->setObjectName("appSidebar");side->setFixedWidth(156);auto nav=new QVBoxLayout(side);nav->setContentsMargins(12,24,12,16);nav->setSpacing(9);auto icon=new QLabel;icon->setPixmap(osIcon(id,QColor("#98c7bf")).pixmap(29,29));nav->addWidget(icon);auto label=new QLabel(title);label->setObjectName("appIdentity");label->setWordWrap(true);nav->addWidget(label);auto subtitle=new QLabel(descriptions.value(id));subtitle->setObjectName("appSubtitle");subtitle->setWordWrap(true);nav->addWidget(subtitle);nav->addSpacing(12);
 auto scroll=new QScrollArea;scroll->setWidgetResizable(true);scroll->setObjectName("appScroll");scroll->setWidget(body);
 auto navScroll=body->findChild<QScrollArea*>();if(!navScroll)navScroll=scroll;auto select=[side](QPushButton* active){for(auto b:side->findChildren<QPushButton*>()){b->setProperty("selected",b==active);b->style()->unpolish(b);b->style()->polish(b);}};auto overview=new QPushButton(QStringLiteral("Обзор"));overview->setProperty("sideNav",true);overview->setProperty("selected",true);nav->addWidget(overview);QObject::connect(overview,&QPushButton::clicked,frame,[navScroll,select,overview]{select(overview);navScroll->verticalScrollBar()->setValue(0);});
 for(auto heading:body->findChildren<QLabel*>("heading")){auto caption=heading->text();if(caption==QStringLiteral("Договоры купли-продажи"))caption=QStringLiteral("Договоры купли-\nпродажи");auto target=new QPushButton(caption);target->setProperty("sideNav",true);nav->addWidget(target);QObject::connect(target,&QPushButton::clicked,frame,[navScroll,heading,select,target]{select(target);auto point=heading->mapTo(navScroll->widget(),QPoint());navScroll->verticalScrollBar()->setValue(std::max(0,point.y()-16));});}
 nav->addStretch();auto signature=new QLabel("PEREKYP OS  ·");signature->setObjectName("appSignature");nav->addWidget(signature);row->addWidget(side);row->addWidget(scroll,1);return frame;
}
class OsCalendarView:public QWidget {
 QDate today,month,selected;bool english=false;QLabel* caption;QWidget* days;QGridLayout* grid;
 void rebuild(){auto locale=QLocale(english?QLocale::English:QLocale::Russian);auto name=locale.standaloneMonthName(month.month(),QLocale::LongFormat);if(!name.isEmpty())name[0]=name[0].toUpper();caption->setText(name+" "+QString::number(month.year()));while(auto item=grid->takeAt(0)){item->widget()->hide();item->widget()->deleteLater();delete item;}QStringList weekdays={QStringLiteral("Пн"),QStringLiteral("Вт"),QStringLiteral("Ср"),QStringLiteral("Чт"),QStringLiteral("Пт"),QStringLiteral("Сб"),QStringLiteral("Вс")};if(english)weekdays={"Mon","Tue","Wed","Thu","Fri","Sat","Sun"};for(int i=0;i<7;++i){auto label=new QLabel(weekdays[i]);label->setAlignment(Qt::AlignCenter);label->setObjectName("calendarWeekday");grid->addWidget(label,0,i);grid->setColumnStretch(i,1);}int offset=month.dayOfWeek()-1;for(int day=1;day<=month.daysInMonth();++day){auto date=QDate(month.year(),month.month(),day);auto b=new QPushButton(QString::number(day));b->setObjectName("calendarDay");b->setProperty("today",date==today);b->setProperty("chosen",date==selected);b->setMinimumSize(40,80);b->setSizePolicy(QSizePolicy::Expanding,QSizePolicy::Expanding);int cell=offset+day-1;grid->addWidget(b,cell/7+1,cell%7);QObject::connect(b,&QPushButton::clicked,this,[this,date]{selected=date;rebuild();});}int weeks=(offset+month.daysInMonth()+6)/7;days->setMinimumHeight(weeks*85+30);setMinimumHeight(weeks*85+30+60);}
public:explicit OsCalendarView(QDate date):today(date),month(date.year(),date.month(),1),selected(date){auto layout=new QVBoxLayout(this);layout->setContentsMargins(0,0,0,0);layout->setSpacing(22);auto row=new QHBoxLayout;auto prev=new QPushButton("‹");prev->setObjectName("calendarPrevious");prev->setProperty("secondary",true);prev->setFixedSize(38,38);row->addWidget(prev);caption=new QLabel;caption->setAlignment(Qt::AlignCenter);caption->setStyleSheet("font-weight:600;font-size:15px");row->addWidget(caption,1);auto next=new QPushButton("›");next->setObjectName("calendarNext");next->setProperty("secondary",true);next->setFixedSize(38,38);row->addWidget(next);auto now=new QPushButton(QStringLiteral("Сегодня"));now->setObjectName("calendarToday");now->setProperty("secondary",true);now->setFixedHeight(38);row->addWidget(now);layout->addLayout(row);days=new QWidget;grid=new QGridLayout(days);grid->setContentsMargins(0,0,0,0);grid->setSpacing(5);layout->addWidget(days);QObject::connect(prev,&QPushButton::clicked,this,[this]{month=month.addMonths(-1);rebuild();});QObject::connect(next,&QPushButton::clicked,this,[this]{month=month.addMonths(1);rebuild();});QObject::connect(now,&QPushButton::clicked,this,[this]{month=QDate(today.year(),today.month(),1);selected=today;rebuild();});rebuild();}
 void setEnglish(bool value){if(english!=value){english=value;rebuild();}}QDate shownMonth()const{return month;}QDate selectedDate()const{return selected;}void setToday(QDate value){if(value==today)return;today=value;rebuild();}
};

class OsSkyline:public QWidget {
public:OsSkyline(){setFixedHeight(75);}
protected:void paintEvent(QPaintEvent*)override{QPainter p(this);p.setOpacity(.5);p.setPen(QPen(QColor("#a7c1c2"),1));int base=height()-8;for(int i=0;i<8;++i){int x=3+i*18,h=15+(i*17)%46;p.drawRect(x,base-h,14,h);for(int y=base-h+6;y<base-3;y+=8)p.drawLine(x+4,y,x+9,y);}p.drawLine(0,base,width(),base);}
};
class OsClockFace:public QWidget {
public:
 QTime value;OsClockFace(){setMinimumSize(180,180);setMaximumHeight(240);}
protected:
 void paintEvent(QPaintEvent*)override{QPainter p(this);p.setRenderHint(QPainter::Antialiasing);auto side=std::min(width(),height())-10;p.translate(width()/2.,height()/2.);p.scale(side/220.,side/220.);p.setPen(QPen(QColor("#dce1de"),1.5));p.setBrush(qApp->property("osDark").toBool()?QColor("#273133"):QColor(Qt::white));p.drawEllipse(QPointF(),104,104);for(int n=0;n<60;++n){p.save();p.rotate(n*6);p.setPen(QPen(QColor(n%5?"#bcc9c5":"#526168"),n%5?1:2));p.drawLine(0,-94,0,n%5?-91:-85);p.restore();}auto hand=[&](double angle,int length,const QColor& color,int thickness){p.save();p.rotate(angle);p.setPen(QPen(color,thickness,Qt::SolidLine,Qt::RoundCap));p.drawLine(0,9,0,-length);p.restore();};hand(value.hour()*30+value.minute()/2.,52,qApp->property("osDark").toBool()?QColor("#e6eeeb"):QColor("#263036"),5);hand(value.minute()*6,76,QColor("#14796f"),3);p.setPen(Qt::NoPen);p.setBrush(QColor("#14796f"));p.drawEllipse(QPointF(),4,4);}
};
class OsTaskButton:public QPushButton {
 QVariantAnimation hover;double lift=0;
 void animate(double value){hover.stop();hover.setStartValue(lift);hover.setEndValue(value);hover.start();}
public:OsTaskButton(){hover.setDuration(140);hover.setEasingCurve(QEasingCurve::OutCubic);connect(&hover,&QVariantAnimation::valueChanged,this,[this](QVariant value){lift=value.toDouble();update();});}
protected:
 void enterEvent(QEnterEvent* e)override{animate(-2);QPushButton::enterEvent(e);}void leaveEvent(QEvent* e)override{animate(0);QPushButton::leaveEvent(e);}
 void paintEvent(QPaintEvent*)override{QStyleOptionButton option;initStyleOption(&option);option.icon=QIcon();option.text.clear();QPainter painter(this);style()->drawControl(QStyle::CE_PushButton,&option,&painter,this);icon().paint(&painter,QRect((width()-iconSize().width())/2,(height()-iconSize().height())/2+qRound(lift),iconSize().width(),iconSize().height()));if(property("running").toBool()){painter.setRenderHint(QPainter::Antialiasing);painter.setPen(QPen(QColor("#5cb9a9"),2,Qt::SolidLine,Qt::RoundCap));painter.drawLine(QPointF((width()-14)/2.,height()-3),QPointF((width()+14)/2.,height()-3));}}
};
inline void osAnimateRect(QMdiSubWindow* window,QRect target,std::function<void()> finished={}){
 if(auto running=window->findChild<QPropertyAnimation*>("windowMotion")){running->stop();running->deleteLater();}window->setProperty("osAnimating",true);auto animation=new QPropertyAnimation(window,"geometry",window);animation->setObjectName("windowMotion");animation->setDuration(190);animation->setEasingCurve(QEasingCurve::OutCubic);animation->setStartValue(window->geometry());animation->setEndValue(target);QObject::connect(animation,&QPropertyAnimation::finished,window,[window,finished]{window->setProperty("osAnimating",false);if(finished)finished();});animation->start(QAbstractAnimation::DeleteWhenStopped);
}
inline void osMinimizeWindow(QMdiSubWindow* window){if(window->property("osAnimating").toBool())return;auto original=window->geometry();window->setProperty("osMinRestoreRect",original);auto area=window->parentWidget()->size();osAnimateRect(window,QRect(area.width()/2-90,area.height()-85,180,70),[window,original]{window->hide();window->setGeometry(original);});}
inline void osRestoreWindow(QMdiSubWindow* window){if(window->isVisible()){window->showNormal();return;}auto original=window->property("osMinRestoreRect").toRect();if(!original.isValid())original=window->geometry();auto area=window->parentWidget()->size();window->setGeometry(area.width()/2-90,area.height()-85,180,70);window->show();osAnimateRect(window,original);}
inline void osToggleMaximize(QMdiSubWindow* window){bool expanded=window->property("osExpanded").toBool();QRect target;if(expanded)target=window->property("osRestoreRect").toRect();else{window->setProperty("osRestoreRect",window->geometry());auto size=window->parentWidget()->size();target=QRect(8,60,std::max(320,size.width()-16),std::max(240,size.height()-144));}window->setProperty("osExpanded",!expanded);osAnimateRect(window,target);for(auto grip:window->findChildren<QSizeGrip*>())grip->setVisible(expanded);}
class OsWindowControl:public QPushButton {
 QString symbol;
public:OsWindowControl(const QString& kind):symbol(kind){setCursor(Qt::PointingHandCursor);}
protected:void paintEvent(QPaintEvent* e)override{QPushButton::paintEvent(e);QPainter p(this);p.setRenderHint(QPainter::Antialiasing);p.setPen(QPen(QColor(qApp->property("osDark").toBool()||underMouse()&&objectName()=="osClose"?"#dbe6e8":"#35474d"),1.2,Qt::SolidLine,Qt::RoundCap));auto c=rect().center();if(symbol=="min")p.drawLine(c.x()-6,c.y()+2,c.x()+6,c.y()+2);else if(symbol=="max")p.drawRect(QRect(c.x()-5,c.y()-5,10,10));else{p.drawLine(c.x()-5,c.y()-5,c.x()+5,c.y()+5);p.drawLine(c.x()+5,c.y()-5,c.x()-5,c.y()+5);}}
};
class OsDialogHeader:public QWidget {
 QDialog* dialog;QPoint offset;bool dragging=false;
public:explicit OsDialogHeader(QDialog* parent):QWidget(parent),dialog(parent){setObjectName("osTitleBar");setFixedHeight(43);auto row=new QHBoxLayout(this);row->setContentsMargins(16,0,8,0);auto emblem=new QLabel;emblem->setPixmap(osIcon("documents").pixmap(20,20));row->addWidget(emblem);auto title=new QLabel(dialog->windowTitle().isEmpty()?QStringLiteral("Perekyp"):dialog->windowTitle());title->setAttribute(Qt::WA_TransparentForMouseEvents);row->addWidget(title,1);connect(dialog,&QWidget::windowTitleChanged,title,&QLabel::setText);auto close=new OsWindowControl("close");close->setObjectName("osClose");close->setFixedSize(34,30);row->addWidget(close);connect(close,&QPushButton::clicked,dialog,&QDialog::reject);}
protected:
 void mousePressEvent(QMouseEvent* e)override{if(e->button()==Qt::LeftButton){dragging=true;offset=e->globalPosition().toPoint()-dialog->pos();}}
 void mouseMoveEvent(QMouseEvent* e)override{if(dragging&&(e->buttons()&Qt::LeftButton))dialog->move(e->globalPosition().toPoint()-offset);}
 void mouseReleaseEvent(QMouseEvent*)override{dragging=false;}
};
class OsDialog:public QDialog {
 bool decorated=false;
public:explicit OsDialog(QWidget* parent=nullptr):QDialog(parent,Qt::Dialog|Qt::FramelessWindowHint){setProperty("osDialog",true);}
protected:void showEvent(QShowEvent* event)override{if(!decorated&&windowType()!=Qt::Popup&&layout()){decorated=true;auto content=new QWidget(this);content->setObjectName("dialogContent");content->setLayout(layout());auto outer=new QVBoxLayout(this);outer->setContentsMargins(1,1,1,1);outer->setSpacing(0);outer->addWidget(new OsDialogHeader(this));outer->addWidget(content,1);}QDialog::showEvent(event);}
};
class OsTitleBar:public QWidget {
 QMdiSubWindow* window;QPoint offset;bool moving=false;
public:
 explicit OsTitleBar(QMdiSubWindow* w,const QString& title,const QIcon& icon):window(w){
  setObjectName("osTitleBar");setFixedHeight(43);auto row=new QHBoxLayout(this);row->setContentsMargins(12,0,4,0);row->setSpacing(8);
  auto emblem=new QLabel;emblem->setPixmap(icon.pixmap(20,20));emblem->setAttribute(Qt::WA_TransparentForMouseEvents);row->addWidget(emblem);
  auto label=new QLabel(title);label->setAttribute(Qt::WA_TransparentForMouseEvents);row->addWidget(label,1);
  auto control=[&](const QString& text,const QString& name,auto action){auto b=new OsWindowControl(name=="osMinimize"?"min":name=="osMaximize"?"max":"close");b->setObjectName(name);b->setFixedSize(29,28);row->addWidget(b);connect(b,&QPushButton::clicked,w,action);return b;};
  auto min=control(QString::fromUtf8("−"),"osMinimize",[w]{osMinimizeWindow(w);});min->setToolTip(QStringLiteral("Свернуть"));
  auto max=control(QString::fromUtf8("□"),"osMaximize",[w]{osToggleMaximize(w);});max->setToolTip(QStringLiteral("Развернуть / восстановить"));
  auto close=control(QString::fromUtf8("×"),"osClose",[w]{w->close();});close->setToolTip(QStringLiteral("Закрыть"));
 }
protected:
 void mousePressEvent(QMouseEvent* e)override{if(e->button()==Qt::LeftButton&&!window->property("osExpanded").toBool()){moving=true;offset=e->globalPosition().toPoint()-window->mapToGlobal(QPoint());e->accept();}}
 void mouseMoveEvent(QMouseEvent* e)override{if(moving&&(e->buttons()&Qt::LeftButton)){auto point=window->parentWidget()->mapFromGlobal(e->globalPosition().toPoint()-offset);point.setX(std::clamp(point.x(),-window->width()+120,window->parentWidget()->width()-120));point.setY(std::clamp(point.y(),0,std::max(0,window->parentWidget()->height()-100)));window->move(point);e->accept();}}
 void mouseReleaseEvent(QMouseEvent*)override{moving=false;}
 void mouseDoubleClickEvent(QMouseEvent* e)override{if(e->button()==Qt::LeftButton){moving=false;osToggleMaximize(window);}}
};
class OsWindowFrame:public QWidget {
 QSizeGrip* grip;
public:explicit OsWindowFrame(QMdiSubWindow* window){grip=new QSizeGrip(window);grip->setParent(this);grip->setFixedSize(13,13);grip->show();}
protected:void resizeEvent(QResizeEvent* event)override{QWidget::resizeEvent(event);grip->move(std::max(0,width()-14),std::max(0,height()-14));grip->raise();}
};
inline QWidget* osWindowBody(QMdiSubWindow* window,QWidget* body,const QString& title,const QIcon& icon){
 auto frame=new OsWindowFrame(window);frame->setObjectName("osWindow");auto layout=new QVBoxLayout(frame);layout->setContentsMargins(1,1,1,1);layout->setSpacing(0);layout->addWidget(new OsTitleBar(window,title,icon));layout->addWidget(body,1);
 return frame;
}
inline QString osStyleSheet(){return QString::fromUtf8(R"CSS(
QWidget{font-family:'Segoe UI';font-size:12px;color:#27343a;}
QMdiArea{border:0;} QMdiSubWindow{background:#f4f6f3;border:1px solid #77878b;border-radius:8px;}
QWidget#osWindow{background:#f4f6f3;border-radius:8px;}
QWidget#osTitleBar{background:#242f38;border-top-left-radius:7px;border-top-right-radius:7px;}
QWidget#osTitleBar QLabel{color:#dce6e7;font-size:12px;}
QWidget#osTitleBar QPushButton{color:#c5d3d8;background:transparent;font-size:20px;padding:0;border-radius:4px;}
QWidget#osTitleBar QPushButton:hover{background:#40515d;}QWidget#osTitleBar QPushButton#osClose:hover{background:#ac484e;color:white;}
QPushButton{background:#177c72;color:white;border:0;border-radius:6px;padding:7px 12px;}
QPushButton:hover{background:#218e82;}QPushButton:pressed{background:#116359;}
QPushButton:focus{border:1px solid #6bb9ae;}QPushButton:disabled{background:#d6dcd9;color:#747e79;}
QLineEdit,QComboBox,QSpinBox{padding:8px;border:1px solid #dce3df;border-radius:5px;background:white;selection-background-color:#177c72;}
QComboBox{padding-right:30px;min-height:20px;}
QComboBox::drop-down{width:26px;border:0;background:transparent;}
QComboBox::down-arrow{width:12px;height:8px;}
QLineEdit:focus,QComboBox:focus{border:1px solid #40968d;}
QTextEdit,QCalendarWidget{background:#fff;border:1px solid #e1e6e2;}
QScrollArea{border:0;background:transparent;}QScrollArea>QWidget>QWidget{background:#f4f6f3;}
QFrame#card{border:1px solid #dce3df;border-radius:7px;background:white;}
QLabel#price{color:#16796f;font-size:19px;font-weight:600;}
QLabel#heading{font-size:23px;font-weight:600;padding-bottom:9px;}
QWidget#sidebar{background:#252f38;border-bottom-left-radius:6px;}
QWidget#sidebar QLabel{color:#c8d5da;padding:12px 0;}
QWidget#sidebar QPushButton[sideLink=true]{background:transparent;text-align:left;color:#bdcdd3;}
QWidget#sidebar QPushButton[sideLink=true]:hover{background:#35434d;}
QLabel#desktopBrand{color:#d1e4e9;font-size:13px;font-weight:600;letter-spacing:3px;}
QWidget#desktopShortcuts{background:transparent;}
QToolButton[desktopShortcut=true]{color:#f4f8f9;background:transparent;border:1px solid transparent;border-radius:9px;padding:8px;font-size:12px;}
QToolButton[desktopShortcut=true]:hover,QToolButton[desktopShortcut=true]:focus{background:rgba(82,119,138,125);border:1px solid rgba(210,235,244,100);}
QWidget#dock{background:#202d38;border:1px solid #4a5a67;border-radius:13px;}
QWidget#dock QLabel{color:#d8e3e7;font-size:11px;}
QWidget#dock QPushButton{background:transparent;padding:2px;border:0;border-radius:7px;}
QWidget#dock QPushButton:hover{background:#3b4c59;}
QWidget#dock QPushButton[taskButton=true][running=true]{}
QWidget#dock QPushButton[taskButton=true][active=true]{background:#354b58;}
QWidget#dock QPushButton#launcherP{font-size:27px;font-style:italic;font-weight:700;color:#e2f4f1;}
QWidget#dock QPushButton#dockMusic{font-size:24px;color:#cddde4;}
QMenu{background:#24323e;color:#e1eaee;border:1px solid #4a5a67;border-radius:9px;padding:9px;}
QWidget#appMenuGrid{background:transparent;}
QWidget#appMenuGrid QLabel{color:#b8d3cf;font-size:11px;letter-spacing:2px;padding:8px;}
QWidget#appMenuGrid QPushButton{background:transparent;text-align:left;color:#e3eceb;font-size:12px;}
QWidget#appMenuGrid QPushButton:hover{background:#3a4a55;}
QMenu::item{padding:9px 28px 9px 12px;border-radius:5px;}
QMenu::item:selected{background:#177c72;}
QMenu::separator{height:1px;background:#47545e;margin:6px 0;}
QSlider::groove:horizontal{height:5px;background:#d5e2df;border-radius:2px;}
QSlider::sub-page:horizontal{background:#177c72;border-radius:2px;}
QSlider::handle:horizontal{background:#177c72;width:16px;margin:-6px 0;border:2px solid white;border-radius:9px;}
QScrollBar:vertical{background:#eef1ee;width:10px;margin:0;}QScrollBar::handle:vertical{background:#bbc9c5;min-height:25px;border-radius:5px;}QScrollBar::add-line:vertical,QScrollBar::sub-line:vertical{height:0;}

QWidget#appSidebar{background:#242c35;}
QWidget#appSidebar QLabel{color:#cbd5d8;}
QLabel#appIdentity{font-size:13px;font-weight:600;}
QLabel#appSubtitle{font-size:10px;color:#91a3a8;}
QLabel#appSignature{font-size:9px;color:#819a9c;letter-spacing:1px;}
QWidget#appSidebar QPushButton{background:transparent;text-align:left;color:#becbce;padding:10px 9px;font-size:11px;}
QWidget#appSidebar QPushButton:hover{background:#34414a;}
QWidget#appSidebar QPushButton[selected=true]{background:#19796f;color:white;}
QFrame#settingsCard{background:white;border:1px solid #dce1de;border-radius:6px;}
QWidget#calculator QPushButton{background:white;color:#263036;border:1px solid #dce1de;font-size:18px;padding:8px;}
QWidget#calculator QPushButton[operation=true]{background:#e5f1ed;color:#14796f;}
QWidget#calculator QPushButton[equal=true]{background:#19796f;color:white;}
QWidget#calculator QLabel#calcDisplay{background:white;border:1px solid #dce1de;border-radius:6px;font-size:34px;padding:18px;}
QDialog#startupWelcome,QDialog#profileWelcome,QDialog#tutorialDialog{background:#f7f8f5;border:1px solid #dce1de;border-radius:9px;}
QLabel#eyebrow{color:#14796f;font-size:10px;letter-spacing:1.8px;}
QLabel#welcomeTitle{font-size:28px;font-weight:600;padding:12px 0;}
QDialog#musicControls{background:#25303a;border:1px solid #687880;border-radius:9px;}
QDialog#musicControls QLabel{color:#e3eceb;}
QProgressBar#tutorialProgress{background:#dce6e1;border:0;border-radius:2px;min-height:3px;max-height:3px;}
QProgressBar#tutorialProgress::chunk{background:#19796f;border-radius:2px;}

QWidget{color:#27363c;font-size:13px;}
QMdiSubWindow{background:#f8f8f5;border:1px solid #48626b;border-radius:9px;}
QWidget#osWindow{background:#f8f8f5;border:1px solid #243d46;border-radius:8px;}
QWidget#osTitleBar{background:qlineargradient(x1:0,y1:0,x2:1,y2:1,stop:0 #18292f,stop:1 #101c22);border-bottom:1px solid #344950;border-top-left-radius:7px;border-top-right-radius:7px;}
QWidget#osTitleBar QLabel{color:#f0f4f4;font-size:15px;font-weight:600;}
QWidget#osTitleBar QPushButton{background:transparent;border:0;padding:0;}
QWidget#osTitleBar QPushButton:hover{background:#344a52;}
QWidget#osTitleBar QPushButton#osClose:hover{background:#9f4149;}
QDialog[osDialog=true]{background:#f8f8f5;border:1px solid #48626b;border-radius:8px;}
QWidget#dialogContent{background:#f8f8f5;border-bottom-left-radius:7px;border-bottom-right-radius:7px;}
QWidget#sidebar,QWidget#appSidebar{background:qlineargradient(x1:0,y1:0,x2:1,y2:1,stop:0 #172a30,stop:1 #102027);}
QWidget#sidebar QLabel,QWidget#appSidebar QLabel{color:#c4d4d9;}
QWidget#sidebar QPushButton,QWidget#appSidebar QPushButton{background:transparent;color:#e0e9eb;text-align:left;font-size:12px;border:0;border-radius:0;padding:11px 9px;}
QWidget#sidebar QPushButton[selected=true],QWidget#appSidebar QPushButton[selected=true]{background:#29454e;border-left:3px solid #20bfca;color:white;}
QWidget#sidebar QPushButton:hover,QWidget#appSidebar QPushButton:hover{background:#29414a;}
QPushButton{background:qlineargradient(x1:0,y1:0,x2:0,y2:1,stop:0 #198c98,stop:1 #007b88);color:white;border:1px solid #087d89;border-radius:6px;padding:7px 12px;}
QPushButton:hover{background:#159aa5;}
QPushButton:pressed{background:#006c78;}
QPushButton:disabled{background:#e2e7e5;color:#8b9796;border-color:#e2e7e5;}
QLineEdit,QComboBox{background:#f2f3f1;border:1px solid #dce1df;border-radius:7px;padding:8px 12px;}
QComboBox{padding-right:32px;}
QLineEdit:focus,QComboBox:focus{border-color:#29a9b4;}
QTextEdit{background:#fbfcfa;border:1px solid #e0e6e3;border-radius:7px;padding:10px;}
QFrame#card,QFrame#commerceCard,QFrame#settingsCard{background:#fbfcfa;border:1px solid #e1e5e2;border-radius:8px;}
QLabel#price{color:#00818d;font-size:20px;font-weight:600;}
QLabel#heading{font-size:22px;font-weight:600;color:#24343a;}
QLabel#desktopBrand{color:#cfdee4;font-size:15px;font-weight:500;letter-spacing:4px;}
QWidget#dock{background:qlineargradient(x1:0,y1:0,x2:0,y2:1,stop:0 #1b3038,stop:1 #10212a);border:1px solid #4b6974;border-radius:12px;}
QWidget#dock QPushButton{background:transparent;border:0;}
QWidget#dock QPushButton[taskButton=true][active=true]{background:#163c46;border:1px solid #19aab8;}
QWidget#appMenuGrid QPushButton{background:transparent;border:0;color:#e3ecef;}
QWidget#appMenuGrid QPushButton:hover{background:#29434d;}
QMenu{background:#142932;color:#e4edef;border-color:#48626b;}
QProgressBar#tutorialProgress::chunk{background:#13a3b0;}
QLabel#wallet{background:#e9eeeb;border:1px solid #dce4df;border-radius:7px;padding:8px 14px;color:#006e7c;font-weight:600;}
QFrame#stagePanel,QLabel#contractHelp{background:#eef2f0;border:1px solid #d9e1de;border-radius:7px;padding:14px;}
QProgressBar#sellerMood{background:#edf2ef;border:0;border-radius:3px;}
QProgressBar#sellerMood::chunk{background:#2dc987;border-radius:3px;}
QGroupBox{border:1px solid #d9e1de;border-radius:7px;margin-top:20px;padding:16px 12px 12px;font-weight:600;}
QGroupBox::title{subcontrol-origin:margin;subcontrol-position:top left;left:12px;padding:0 4px;color:#526168;}

/* Approved application references, October 28: flat slate, teal, ivory. */
QWidget#osTitleBar{background:#242c35;border-bottom:0;}
QWidget#osTitleBar QLabel{font-size:13px;font-weight:500;color:#e2e8e9;}
QWidget#sidebar,QWidget#appSidebar{background:#242c35;}
QWidget#sidebar QPushButton,QWidget#appSidebar QPushButton{font-size:11px;color:#c4cfd2;border:0;border-radius:5px;padding:11px 9px;}
QWidget#sidebar QPushButton[selected=true],QWidget#appSidebar QPushButton[selected=true]{background:#157d73;border:0;color:white;}
QWidget#sidebar QPushButton:hover,QWidget#appSidebar QPushButton:hover{background:#34454b;}
QWidget#appSidebar QLabel#appIdentity{font-size:13px;color:#c7d2d5;font-weight:600;}
QWidget#appSidebar QLabel#appSubtitle{font-size:10px;color:#94a6ac;}
QWidget#appSidebar QLabel#appSignature{font-size:9px;color:#8aabad;}
QPushButton{background:#147d73;border:1px solid #147d73;border-radius:7px;color:white;padding:9px 14px;}
QPushButton:hover{background:#198d80;}QPushButton:pressed{background:#10695f;}
QPushButton:disabled{background:#99bfb9;color:#f7faf8;border-color:#99bfb9;}
QPushButton[secondary=true]{background:white;color:#52636b;border:1px solid #d9dfdc;}
QPushButton[secondary=true]:hover{background:#e7f0ed;}
QPushButton[textLink=true]{background:transparent;color:#147d73;border:0;text-align:left;padding:2px 0;font-size:12px;}
QLineEdit,QComboBox{background:white;border-color:#d9dfdc;}
QLabel#muted{color:#798992;font-size:12px;}
QLabel#heading{font-size:21px;color:#2b373d;padding-bottom:3px;}
QLabel#price{color:#147d73;}
QFrame#financeCard{background:#eff2f0;border:1px solid #d9dfdc;border-radius:6px;}
QFrame#documentCard{background:white;border:1px solid #d9dfdc;border-radius:5px;}
QFrame#routeCard{background:#f1f3f0;border:1px solid #d4dcd8;border-radius:17px;}
QLabel#routePrice{color:#34cbb7;font-size:24px;font-weight:700;}
QLabel#accountBalance{font-size:38px;font-weight:700;color:#29343a;padding:6px 0;}
QWidget#calculator QPushButton{border-radius:5px;font-size:18px;padding:5px;}
QWidget#calculator QPushButton[clear=true]{background:#f4eeec;border-color:#ebd5d0;color:#c44945;}
QWidget#calculator QPushButton[operation=true]{background:#e2efeb;border-color:#bddad3;color:#147d73;}
QWidget#calculator QPushButton[equal=true]{background:#147d73;color:white;border-color:#147d73;}
QWidget#calculator QLabel#calcDisplay{padding:18px;font-size:34px;font-weight:500;}
QPushButton#calendarDay{background:white;color:#34424a;border:1px solid #d9dfdc;border-radius:5px;font-weight:400;font-size:12px;}
QPushButton#calendarDay:hover{background:#edf5f1;}
QPushButton#calendarDay[today=true],QPushButton#calendarDay[chosen=true]{background:#e1eeea;border-color:#147d73;color:#147d73;font-weight:700;}
QLabel#calendarWeekday{font-size:11px;color:#78878d;min-height:24px;}
QLabel#sleepStatus{font-size:12px;color:#798992;}
QFrame[frameShape="4"]{color:#d9dfdc;max-height:1px;border:0;background:#d9dfdc;}
QPushButton#passportToggle{background:#eff2f0;color:#147d73;text-align:left;padding:16px;border-color:#d9dfdc;}
)CSS");}
