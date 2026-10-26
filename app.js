// ==========================================
// STOCK POINT 設定
// ==========================================

const SITE_CONFIG = {
    REPO_OWNER: "razupai",
    REPO_NAME: "STOCK-POINT",
    BRANCH: "main",
    INITIAL_POINTS: 5000
};

const $ = id => document.getElementById(id);

const number = value =>
    Number(value || 0).toLocaleString("ja-JP", {
        maximumFractionDigits: 2
    });

const points = value => `${number(value)} pt`;

const escapeHtml = value =>
    String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[char]));

// ==========================================
// GitHub データ取得
// ==========================================

function rawUrl(file) {
    return `https://raw.githubusercontent.com/${
        SITE_CONFIG.REPO_OWNER
    }/${SITE_CONFIG.REPO_NAME}/${
        SITE_CONFIG.BRANCH
    }/${file}`;
}

function repoUrl(path) {
    return `https://github.com/${
        SITE_CONFIG.REPO_OWNER
    }/${SITE_CONFIG.REPO_NAME}/${path}`;
}

async function getJson(file) {
    const response = await fetch(
        `${rawUrl(file)}?t=${Date.now()}`,
        { cache: "no-store" }
    );

    if (!response.ok) {
        throw new Error(
            `${file} の読み込みに失敗しました。`
        );
    }

    return response.json();
}

// ==========================================
// プレイヤーの資産計算
// ==========================================

function calculatePlayers(players, stocks) {
    const prices = Object.fromEntries(
        stocks.map(stock => [
            stock.id,
            Number(stock.price)
        ])
    );

    return Object.entries(players).map(
        ([username, player]) => {
            let stockValue = 0;

            for (const [stockId, holding] of
                Object.entries(player.holdings || {})) {

                stockValue +=
                    Number(holding.quantity || 0) *
                    (prices[stockId] || 0);
            }

            const cash = Number(
                player.points ??
                SITE_CONFIG.INITIAL_POINTS
            );

            const totalAssets = cash + stockValue;

            const initialPoints = Number(
                player.initialPoints ??
                SITE_CONFIG.INITIAL_POINTS
            );

            return {
                username,
                cash,
                stockValue,
                totalAssets,
                profit: totalAssets - initialPoints,
                holdings: player.holdings || {}
            };
        }
    ).sort(
        (a, b) => b.totalAssets - a.totalAssets
    );
}

// ==========================================
// 株価一覧
// ==========================================

function renderStocks(stocks) {
    $("stocksBody").innerHTML = stocks.map(stock => {
        const previous = Number(
            stock.previousPrice ?? stock.price
        );

        const current = Number(stock.price);
        const difference = current - previous;

        const percent = previous > 0
            ? difference / previous * 100
            : 0;

        const color = difference > 0
            ? "up"
            : difference < 0
                ? "down"
                : "neutral";

        const sign = difference > 0 ? "+" : "";

        return `
            <tr>
                <td>
                    <strong>${escapeHtml(stock.name)}</strong>
                </td>

                <td>${escapeHtml(stock.id)}</td>

                <td class="price">
                    ${points(current)}
                </td>

                <td class="${color}">
                    ${sign}${number(difference)}
                    (${sign}${percent.toFixed(2)}%)
                </td>

                <td>
                    <a
                        class="mini-button"
                        href="${repoUrl(
                            "issues/new?template=trade.yml"
                        )}"
                        target="_blank"
                        rel="noopener"
                    >
                        売買申請
                    </a>
                </td>
            </tr>
        `;
    }).join("");
}

// ==========================================
// ランキング
// ==========================================

function renderRanking(players) {
    if (players.length === 0) {
        $("rankingList").innerHTML =
            "<p>まだプレイヤーがいません。</p>";
        return;
    }

    $("rankingList").innerHTML = players
        .slice(0, 10)
        .map((player, index) => `
            <div class="rank-row">
                <div class="rank-number">
                    ${index + 1}
                </div>

                <div>
                    <div class="rank-name">
                        ${escapeHtml(player.username)}
                    </div>

                    <div class="rank-detail">
                        現金 ${points(player.cash)}
                    </div>
                </div>

                <div class="rank-assets">
                    ${points(player.totalAssets)}

                    <div class="${
                        player.profit >= 0 ? "up" : "down"
                    }">
                        ${player.profit >= 0 ? "+" : ""}
                        ${number(player.profit)} pt
                    </div>
                </div>
            </div>
        `)
        .join("");
}

// ==========================================
// 全プレイヤーの資産一覧
// ==========================================

function renderPlayers(players) {
    if (players.length === 0) {
        $("playersBody").innerHTML =
            "<tr><td colspan='5'>プレイヤーはいません。</td></tr>";
        return;
    }

    $("playersBody").innerHTML = players.map(player => `
        <tr>
            <td>${escapeHtml(player.username)}</td>

            <td>${points(player.cash)}</td>

            <td>${points(player.stockValue)}</td>

            <td>${points(player.totalAssets)}</td>

            <td class="${
                player.profit >= 0 ? "up" : "down"
            }">
                ${player.profit >= 0 ? "+" : ""}
                ${number(player.profit)} pt
            </td>
        </tr>
    `).join("");
}

// ==========================================
// 取引履歴
// ==========================================

function renderTransactions(transactions, stockMap) {
    const recent = [...transactions]
        .reverse()
        .slice(0, 20);

    if (recent.length === 0) {
        $("transactionsList").innerHTML =
            "<p>まだ取引履歴がありません。</p>";
        return;
    }

    $("transactionsList").innerHTML = recent.map(tx => {
        const actionLabel = tx.action === "BUY"
            ? "購入"
            : "売却";

        const stockName =
            stockMap[tx.stockId]?.name ||
            tx.stockName ||
            tx.stockId;

        const date = tx.timestamp
            ? new Date(tx.timestamp).toLocaleString("ja-JP")
            : "日時不明";

        const amount = tx.action === "BUY"
            ? -Number(tx.total)
            : Number(tx.total);

        return `
            <div class="transaction-row">
                <div class="trade-type ${escapeHtml(tx.action)}">
                    ${actionLabel}
                </div>

                <div>
                    <strong>
                        ${escapeHtml(tx.username)}
                    </strong>

                    <div>
                        ${escapeHtml(stockName)}
                        ${number(tx.quantity)}株
                    </div>

                    <small>${escapeHtml(date)}</small>
                </div>

                <div>
                    ${amount >= 0 ? "+" : ""}
                    ${number(amount)} pt
                </div>
            </div>
        `;
    }).join("");
}

// ==========================================
// 初期化
// ==========================================

async function init() {
    $("tradeLink").href = repoUrl(
        "issues/new?template=trade.yml"
    );

    if (
        SITE_CONFIG.REPO_OWNER ===
        "YOUR_GITHUB_USERNAME"
    ) {
        $("notice").textContent =
            "app.js のGitHubユーザー名を変更してください。";
        return;
    }

    try {
        const [stocks, players, transactions] =
            await Promise.all([
                getJson("stocks.json"),
                getJson("players.json"),
                getJson("transactions.json")
            ]);

        const calculatedPlayers =
            calculatePlayers(players, stocks);

        $("playerCount").textContent =
            number(calculatedPlayers.length);

        $("transactionCount").textContent =
            number(transactions.length);

        $("stockCount").textContent =
            number(stocks.length);

        renderStocks(stocks);
        renderRanking(calculatedPlayers);
        renderPlayers(calculatedPlayers);

        const stockMap = Object.fromEntries(
            stocks.map(stock => [
                stock.id,
                stock
            ])
        );

        renderTransactions(
            transactions,
            stockMap
        );

        $("notice").textContent =
            "共有市場のデータを読み込みました。";

        $("updatedAt").textContent =
            new Date().toLocaleString("ja-JP");

    } catch (error) {
        $("notice").textContent =
            error.message;

        console.error(error);
    }
}

init();
