#pragma once
// Presentation widgets for the compact listings reference. No game rules or prices.
class MarketFavoriteButton:public QPushButton {
public:MarketFavoriteButton(){setObjectName("favoriteToggle");setCheckable(true);setFixedSize(26,24);setCursor(Qt::PointingHandCursor);setToolTip(QStringLiteral("В избранное"));setAccessibleName(QStringLiteral("В избранное"));}
protected:void paintEvent(QPaintEvent*)override{QPainter p(this);p.setRenderHint(QPainter::Antialiasing);p.translate((width()-24)/2.,(height()-24)/2.);QColor color=isChecked()?QColor("#14796f"):QColor(qApp->property("osDark").toBool()?"#b0c4bd":"#8fa5a0");p.setPen(QPen(color,1.4,Qt::SolidLine,Qt::RoundCap,Qt::RoundJoin));p.setBrush(isChecked()?QBrush(color):Qt::NoBrush);QPainterPath path;path.moveTo(12,20);path.cubicTo(8,17,3,13,3,8);path.cubicTo(3,2,10,2,12,7);path.cubicTo(14,2,21,2,21,8);path.cubicTo(21,13,16,17,12,20);p.drawPath(path);if(hasFocus()){p.setPen(QPen(color,.8,Qt::DotLine));p.setBrush(Qt::NoBrush);p.drawRoundedRect(QRectF(0,0,23,23),4,4);}}
};
class MarketTitleLabel:public QLabel {
public:using QLabel::QLabel;
protected:void paintEvent(QPaintEvent*)override{QPainter p(this);p.setPen(palette().color(QPalette::WindowText));p.setFont(font());p.drawText(rect(),Qt::AlignLeft|Qt::AlignVCenter,fontMetrics().elidedText(text(),Qt::ElideRight,width()));}
};
class MarketCard:public QFrame {
 QWidget* photo=nullptr;
 void reflow(){if(!photo)return;int h=qRound(width()/1.42);if(photo->height()!=h)photo->setFixedHeight(h);if(height()!=h+166)setFixedHeight(h+166);}
public:MarketCard(){setObjectName("card");resize(240,335);setMinimumWidth(190);setSizePolicy(QSizePolicy::Expanding,QSizePolicy::Fixed);}
 void setPhoto(QWidget* image){photo=image;photo->setMinimumWidth(0);reflow();}
protected:void resizeEvent(QResizeEvent* e)override{QFrame::resizeEvent(e);reflow();}
};
