Qt 6.4.2 build inputs:
Apply 0001-raster-windows-guard.patch to qtbase source root.
Copy wintab/*.h to qtbase/src/3rdparty/wintab/. These headers come from the upstream Qt v6.4.2 tree and retain their unrestricted distribution notices.
Qt is built shared, Release, with Widgets; OpenGL/network/SQL/DBus/testlib/printsupport/ICU disabled. Bundled zlib/PCRE2/freetype/harfbuzz/png/jpeg are used. Qt Image Formats WebP uses bundled libwebp.
