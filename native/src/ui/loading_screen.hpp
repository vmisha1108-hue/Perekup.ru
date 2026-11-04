#pragma once
#include "ui_language.hpp"
#include <QWidget>
#include <QPainter>
#include <QTimer>
#include <QElapsedTimer>
#include <QVariantAnimation>
#include <QLinearGradient>
#include <QRadialGradient>
#include <functional>
#include <cmath>
#include <algorithm>
class LoadingScreen:public QWidget {
 QTimer timer;QElapsedTimer elapsed;QString message=QStringLiteral("Подготавливаем рабочий стол");double fade=1;
public:
 LoadingScreen(){setWindowFlags(Qt::FramelessWindowHint);setAttribute(Qt::WA_DeleteOnClose,false);elapsed.start();connect(&timer,&QTimer::timeout,this,[this]{update();});timer.start(16);}
 void setMessage(const QString& text){message=text;update();}
 void finish(std::function<void()> done){auto animation=new QVariantAnimation(this);animation->setDuration(420);animation->setStartValue(1.);animation->setEndValue(0.);animation->setEasingCurve(QEasingCurve::InOutCubic);connect(animation,&QVariantAnimation::valueChanged,this,[this](const QVariant& value){fade=value.toDouble();setWindowOpacity(fade);});connect(animation,&QVariantAnimation::finished,this,[this,done]{timer.stop();hide();done();});animation->start(QAbstractAnimation::DeleteWhenStopped);}
protected:
 void paintEvent(QPaintEvent*)override{
 QPainter p(this);p.setRenderHint(QPainter::Antialiasing);double seconds=elapsed.elapsed()/1000.;QLinearGradient background(0,0,width(),height());background.setColorAt(0,QColor("#101b24"));background.setColorAt(1,QColor("#1f3037"));p.fillRect(rect(),background);
 QPointF center(width()/2.,height()/2.);QRadialGradient light(center+QPointF(0,-65),std::max(width(),height())*.48);light.setColorAt(0,QColor(35,142,131,46));light.setColorAt(1,QColor(35,142,131,0));p.fillRect(rect(),light);
 double appear=std::min(1.,seconds/.65);appear=1-std::pow(1-appear,3);p.setOpacity(appear);p.translate(center+QPointF(0,(1-appear)*12));
 QRectF logo(-36,-134,72,72);QLinearGradient teal(logo.topLeft(),logo.bottomRight());teal.setColorAt(0,QColor("#249c90"));teal.setColorAt(1,QColor("#11675f"));p.setPen(Qt::NoPen);p.setBrush(teal);p.drawRoundedRect(logo,19,19);QFont font("Segoe UI",32,QFont::Bold);font.setItalic(true);p.setFont(font);p.setPen(QColor("#f3faf8"));p.drawText(logo,Qt::AlignCenter,"P");
 font=QFont("Segoe UI",19,QFont::DemiBold);font.setLetterSpacing(QFont::AbsoluteSpacing,3);p.setFont(font);p.drawText(QRectF(-250,-35,500,42),Qt::AlignCenter,"PEREKYP OS");font=QFont("Segoe UI",11);p.setFont(font);p.setPen(QColor("#9eafb7"));p.drawText(QRectF(-300,15,600,35),Qt::AlignCenter,(uiLanguageInstance()?uiLanguageInstance()->text(message):message)+QString(int(seconds*1.6)%4,'.'));
 QRectF track(-150,75,300,4);p.setPen(Qt::NoPen);p.setBrush(QColor("#34454e"));p.drawRoundedRect(track,2,2);p.save();p.setClipRect(track);double phase=std::fmod(seconds*.45,1.);double x=-260+phase*410;QLinearGradient pulse(x,0,x+110,0);pulse.setColorAt(0,QColor(101,214,192,0));pulse.setColorAt(.5,QColor("#75d8c2"));pulse.setColorAt(1,QColor(101,214,192,0));p.fillRect(QRectF(x,75,110,4),pulse);p.restore();
 }
};
