// ========================================
// STOCK POINT 基本設定
// ========================================

const GAME_CONFIG = {
    // プレイヤーの初期ポイント
    INITIAL_POINTS: 5000,

    // 株価の更新間隔（時間）
    PRICE_UPDATE_HOURS: 1,

    // 1回の株価変動率（%）
    MIN_CHANGE_PERCENT: -10,
    MAX_CHANGE_PERCENT: 10,

    // 株価の最低値
    MIN_STOCK_PRICE: 10,

    // 売買手数料（%）
    TRADE_FEE_PERCENT: 0,

    // 情報公開設定
    PUBLIC_HOLDINGS: true,
    PUBLIC_TRANSACTIONS: true,
    PUBLIC_PROFIT: true,
    PUBLIC_RANKING: true
};

// 株式市場の銘柄
const STOCK_LIST = [
    {
        id: "ST001",
        name: "ネクストテクノロジー",
        initialPrice: 500
    },
    {
        id: "ST002",
        name: "グリーンエナジー",
        initialPrice: 800
    },
    {
        id: "ST003",
        name: "フューチャーAI",
        initialPrice: 1200
    },
    {
        id: "ST004",
        name: "セントラル交通",
        initialPrice: 350
    },
    {
        id: "ST005",
        name: "ライフサポート",
        initialPrice: 650
    },
    {
        id: "ST006",
        name: "クリエイトメディア",
        initialPrice: 1000
    }
];
