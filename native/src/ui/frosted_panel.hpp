#pragma once
// Cached separable box blur of the wallpaper strip. Text and controls stay sharp.
inline QImage osFrostedStrip(const QImage& input,int radius=10){
 if(input.isNull())return {};auto source=input.convertToFormat(QImage::Format_RGB32);int w=source.width(),h=source.height(),span=radius*2+1;QImage horizontal(w,h,QImage::Format_RGB32),result(w,h,QImage::Format_RGB32);
 for(int y=0;y<h;++y){auto src=reinterpret_cast<const QRgb*>(source.constScanLine(y));auto dst=reinterpret_cast<QRgb*>(horizontal.scanLine(y));int red=0,green=0,blue=0;for(int k=-radius;k<=radius;++k){auto c=src[std::clamp(k,0,w-1)];red+=qRed(c);green+=qGreen(c);blue+=qBlue(c);}for(int x=0;x<w;++x){dst[x]=qRgb(red/span,green/span,blue/span);auto before=src[std::clamp(x-radius,0,w-1)],after=src[std::clamp(x+radius+1,0,w-1)];red+=qRed(after)-qRed(before);green+=qGreen(after)-qGreen(before);blue+=qBlue(after)-qBlue(before);}}
 for(int x=0;x<w;++x){int red=0,green=0,blue=0;for(int k=-radius;k<=radius;++k){auto c=reinterpret_cast<const QRgb*>(horizontal.constScanLine(std::clamp(k,0,h-1)))[x];red+=qRed(c);green+=qGreen(c);blue+=qBlue(c);}for(int y=0;y<h;++y){reinterpret_cast<QRgb*>(result.scanLine(y))[x]=qRgb(red/span,green/span,blue/span);auto before=reinterpret_cast<const QRgb*>(horizontal.constScanLine(std::clamp(y-radius,0,h-1)))[x],after=reinterpret_cast<const QRgb*>(horizontal.constScanLine(std::clamp(y+radius+1,0,h-1)))[x];red+=qRed(after)-qRed(before);green+=qGreen(after)-qGreen(before);blue+=qBlue(after)-qBlue(before);}}
 return result;
}
