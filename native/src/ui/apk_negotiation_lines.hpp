#pragma once
#include <array>
#include <QString>

// Complete lines recovered from the supplied APK. Gameplay decisions remain in negotiate().
inline QString importedNegotiationLine(const std::string& outcome, bool selling, unsigned variant) {
    static const std::array<QString, 2> agreed{
        QStringLiteral("Я согласен. По рукам, приезжайте!"),
        QStringLiteral("Договорились! Отличная цена, меня всё устраивает.")
    };
    static const std::array<QString, 4> counter{
        QStringLiteral("Согласен, это мой косяк. Уступаю."),
        QStringLiteral("Блин, ну ты и дотошный. Ладно, даю скидку."),
        QStringLiteral("Убедил, брат. Давай скину, только забирай."),
        QStringLiteral("Хорошо торгуешься! Договорились, скину.")
    };
    static const std::array<QString, 4> rejected{
        QStringLiteral("Ты вообще машину видел? За такие деньги это норма, без скидок."),
        QStringLiteral("Скажи спасибо, что вообще продаю. Без скидки."),
        QStringLiteral("Даже слушать не хочу, цена окончательная за этот момент."),
        QStringLiteral("Ищи дурака в другом месте, за это не скину.")
    };
    if (outcome == "agreed") return agreed[variant % agreed.size()];
    if (selling) return {};
    if (outcome == "counter") return counter[variant % counter.size()];
    if (outcome == "rejected") return rejected[variant % rejected.size()];
    return {};
}
