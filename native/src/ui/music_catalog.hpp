#pragma once

#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QNetworkAccessManager>
#include <QNetworkDiskCache>
#include <QNetworkReply>
#include <QUrlQuery>
#include <QSet>

inline bool catalogHost(const QUrl& url, const QString& domain) {
    const auto host = url.host().toLower();
    return url.scheme() == "https" && url.userInfo().isEmpty() &&
        (host == domain || host.endsWith("." + domain));
}

inline QUrl catalogSearchUrl(const QString& term, bool albums) {
    QUrl url("https://itunes.apple.com/search");
    QUrlQuery query;
    query.addQueryItem("term", term.trimmed().left(180));
    query.addQueryItem("media", "music");
    query.addQueryItem("entity", albums ? "album" : "song");
    query.addQueryItem("limit", "24");
    url.setQuery(query);
    return url;
}

inline QJsonArray catalogResults(const QByteArray& payload) {
    QJsonArray results;
    QSet<QString> seen;
    for (const auto& result : QJsonDocument::fromJson(payload).object().value("results").toArray()) {
        const auto item = result.toObject();
        const QUrl link(item.value("trackViewUrl").toString(item.value("collectionViewUrl").toString()));
        if (!catalogHost(link, "music.apple.com") && !catalogHost(link, "itunes.apple.com")) continue;
        const auto title = item.value("trackName").toString(item.value("collectionName").toString()).left(300);
        if (title.isEmpty() || seen.contains(link.toString())) continue;
        seen.insert(link.toString());
        const QUrl art(item.value("artworkUrl100").toString());
        results.append(QJsonObject{
            {"title", title},
            {"artist", item.value("artistName").toString().left(300)},
            {"album", item.value("collectionName").toString().left(300)},
            {"art", catalogHost(art, "mzstatic.com") ? art.toString() : QString()},
            {"url", link.toString()}
        });
        if (results.size() == 24) break;
    }
    return results;
}
