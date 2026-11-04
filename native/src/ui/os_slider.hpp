#pragma once
#include <QSlider>
#include <QApplication>
#include <cmath>
#include <QPainter>
#include <QMouseEvent>
#include <QStyleOptionSlider>
#include <QToolTip>
#include <QTimer>
#include <QElapsedTimer>
// Shared horizontal control: the mouse and keyboard use the same QSlider state.
class OsSlider:public QSlider {
 QTimer motion_;QElapsedTimer clock_;qreal hover_=0,from_=0,target_=0;
 QRectF track()const{return QRectF(10,height()/2.-2,std::max(1,width()-20),4);}
 bool upsideDown()const{QStyleOptionSlider o;initStyleOption(&o);return o.upsideDown;}
 int at(qreal x)const{auto r=track();return QStyle::sliderValueFromPosition(minimum(),maximum(),qRound(x-r.left()),qRound(r.width()),upsideDown());}
 qreal position()const{auto r=track();return r.left()+QStyle::sliderPositionFromValue(minimum(),maximum(),sliderPosition(),qRound(r.width()),upsideDown());}
 void hoverTo(qreal value){from_=hover_;target_=value;clock_.restart();motion_.start();}
 QString valueText(int v)const{auto duration=property("durationMs").toLongLong();if(duration>0&&maximum()>minimum()){auto seconds=qRound64(double(v-minimum())/(maximum()-minimum())*duration)/1000;return QString("%1:%2").arg(seconds/60).arg(seconds%60,2,10,QChar('0'));}return QString::number(v)+property("valueSuffix").toString();}
 void hint(int v){QToolTip::showText(mapToGlobal(QPoint(qRound(position()),-8)),valueText(v),this);}
public:
 explicit OsSlider(Qt::Orientation orientation,QWidget* parent=nullptr):QSlider(orientation,parent){setMouseTracking(true);setMinimumHeight(30);setFocusPolicy(Qt::StrongFocus);motion_.setInterval(16);connect(&motion_,&QTimer::timeout,this,[this]{auto t=std::min(1.,clock_.elapsed()/140.);hover_=from_+(target_-from_)*(1-std::pow(1-t,3));if(t>=1)motion_.stop();update();});}
 QSize sizeHint()const override{return orientation()==Qt::Horizontal?QSize(180,30):QSlider::sizeHint();}
protected:
 void enterEvent(QEnterEvent* e)override{hoverTo(1);QSlider::enterEvent(e);}
 void leaveEvent(QEvent* e)override{if(!isSliderDown())hoverTo(0);QToolTip::hideText();QSlider::leaveEvent(e);}
 void mousePressEvent(QMouseEvent* e)override{if(orientation()!=Qt::Horizontal||e->button()!=Qt::LeftButton){QSlider::mousePressEvent(e);return;}if(!isEnabled())return;setFocus(Qt::MouseFocusReason);setSliderDown(true);setSliderPosition(at(e->position().x()));hint(sliderPosition());update();e->accept();}
 void mouseMoveEvent(QMouseEvent* e)override{if(orientation()!=Qt::Horizontal){QSlider::mouseMoveEvent(e);return;}if(isSliderDown())setSliderPosition(at(e->position().x()));if(isEnabled())hint(isSliderDown()?sliderPosition():at(e->position().x()));update();e->accept();}
 void mouseReleaseEvent(QMouseEvent* e)override{if(orientation()!=Qt::Horizontal||e->button()!=Qt::LeftButton){QSlider::mouseReleaseEvent(e);return;}if(isSliderDown()){setSliderPosition(at(e->position().x()));setSliderDown(false);}QToolTip::hideText();if(!underMouse())hoverTo(0);update();e->accept();}
 void paintEvent(QPaintEvent* e)override{if(orientation()!=Qt::Horizontal){QSlider::paintEvent(e);return;}bool dark=qApp->property("osDark").toBool();QColor accent=qApp->property("osAccent").value<QColor>();if(!accent.isValid())accent=QColor(dark?"#8be0c7":"#14796f");QPainter p(this);p.setRenderHint(QPainter::Antialiasing);auto r=track();p.setPen(Qt::NoPen);p.setBrush(QColor(dark?"#344248":"#d9e5e1"));p.drawRoundedRect(r,2,2);auto x=position();auto filled=upsideDown()?QRectF(x,r.y(),r.right()-x,r.height()):QRectF(r.x(),r.y(),x-r.x(),r.height());p.setBrush(isEnabled()?accent:QColor(dark?"#566168":"#a9b6b2"));p.drawRoundedRect(filled,2,2);qreal radius=isSliderDown()?8:5.5+hover_*1.5;if(hasFocus()){auto halo=accent;halo.setAlpha(55);p.setBrush(halo);p.drawEllipse(QPointF(x,r.center().y()),radius+4,radius+4);}p.setBrush(isEnabled()?accent:QColor(dark?"#566168":"#a9b6b2"));p.drawEllipse(QPointF(x,r.center().y()),radius,radius);}
};
