#include <QApplication>
#include <QMdiSubWindow>
#include <QKeyEvent>
#include <QEventLoop>
#include <iostream>
#include "ui/os_slider.hpp"
#include "ui/os_theme.hpp"
int main(int argc,char** argv){QApplication app(argc,argv);try{
 auto check=[](bool ok,const char* s){if(!ok)throw std::runtime_error(s);};OsSlider slider(Qt::Horizontal);slider.resize(300,32);slider.setRange(0,100);slider.show();app.processEvents();int released=0;QObject::connect(&slider,&QSlider::sliderReleased,[&]{++released;});
 auto mouse=[&](QEvent::Type type,int x){QPointF local(x,16);QMouseEvent e(type,local,slider.mapToGlobal(local.toPoint()),Qt::LeftButton,type==QEvent::MouseButtonRelease?Qt::NoButton:Qt::LeftButton,Qt::NoModifier);QApplication::sendEvent(&slider,&e);};
 mouse(QEvent::MouseButtonPress,150);check(slider.isSliderDown()&&slider.value()==50,"click seeks directly");mouse(QEvent::MouseMove,290);check(slider.value()==100,"drag reaches maximum");mouse(QEvent::MouseMove,-50);check(slider.value()==0,"drag clamps outside track");mouse(QEvent::MouseButtonRelease,80);check(!slider.isSliderDown()&&released==1&&slider.value()==25,"release commits exactly once");
 QKeyEvent key(QEvent::KeyPress,Qt::Key_Right,Qt::NoModifier);QApplication::sendEvent(&slider,&key);check(slider.value()==26,"keyboard step retained");
 slider.setLayoutDirection(Qt::RightToLeft);mouse(QEvent::MouseButtonPress,10);mouse(QEvent::MouseButtonRelease,10);check(slider.value()==100,"RTL reverses track");slider.setLayoutDirection(Qt::LeftToRight);slider.setInvertedAppearance(true);mouse(QEvent::MouseButtonPress,290);mouse(QEvent::MouseButtonRelease,290);check(slider.value()==0,"inverted appearance respected");slider.setEnabled(false);auto before=slider.value();mouse(QEvent::MouseButtonPress,10);mouse(QEvent::MouseButtonRelease,10);check(slider.value()==before&&released==3,"disabled control cannot change playback");
 for(bool dark:{true,false}){qApp->setProperty("osDark",dark);qApp->setProperty("osAccent",QColor(dark?"#8be0c7":"#14796f"));auto css=osThemeCss(dark);check(!css.contains('@'),"all theme tokens resolved");app.setStyleSheet(css);check(!slider.grab().isNull(),"slider renders in both themes");}
 std::cout<<"PASS V7 controls: direct seek, continuous drag, clamping, single release, keyboard, RTL/inversion, disabled state and both theme rendering\n";return 0;
 }catch(const std::exception& e){std::cerr<<e.what()<<'\n';return 1;}}
