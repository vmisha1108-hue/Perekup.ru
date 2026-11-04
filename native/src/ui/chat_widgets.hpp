#pragma once
#include <QKeyEvent>
#include <QLineEdit>
#include <QLabel>
#include <QPainter>
#include <QResizeEvent>
#include <algorithm>
#include "os_shell.hpp"

class ChatMessageInput : public QLineEdit {
protected:
 void keyPressEvent(QKeyEvent* event) override {
  if(event->key()==Qt::Key_Return||event->key()==Qt::Key_Enter){
   event->accept();
   if(!event->isAutoRepeat())emit returnPressed();
   return;
  }
  QLineEdit::keyPressEvent(event);
 }
};

class ChatResizeGrip : public QSizeGrip {
public:
 explicit ChatResizeGrip(QWidget* parent):QSizeGrip(parent){
  setObjectName("chatResizeGrip");setFixedSize(18,18);
  setToolTip(QStringLiteral("Потяни, чтобы изменить размер окна"));
 }
protected:
 void paintEvent(QPaintEvent*) override {
  QPainter painter(this);painter.setRenderHint(QPainter::Antialiasing);
  painter.setPen(QPen(QColor("#7d9696"),1.5,Qt::SolidLine,Qt::RoundCap));
  for(int offset:{4,8,12})painter.drawLine(width()-3,height()-3-offset,width()-3-offset,height()-3);
 }
};

class SellerChatDialog : public OsDialog {
public:
 explicit SellerChatDialog(QWidget* parent=nullptr):OsDialog(parent){setMinimumSize(360,440);}
protected:
 void showEvent(QShowEvent* event) override {
  OsDialog::showEvent(event);
  for(auto button:findChildren<QPushButton*>()){button->setAutoDefault(false);button->setDefault(false);}
 }
 void keyPressEvent(QKeyEvent* event) override {
  // Return belongs to the message input, never to QDialog's default button.
  if(event->key()==Qt::Key_Return||event->key()==Qt::Key_Enter){event->accept();return;}
  OsDialog::keyPressEvent(event);
 }
 void resizeEvent(QResizeEvent* event) override {
  OsDialog::resizeEvent(event);
  for(auto label:findChildren<QLabel*>())
   if(label->objectName()=="playerBubble"||label->objectName()=="npcBubble")
    label->setMaximumWidth(std::max(220,width()-100));
 }
};
