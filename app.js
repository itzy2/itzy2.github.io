"use strict";

// ==========================================
// STOCK POINT 設定
// ==========================================

const SITE_CONFIG = {
    REPO_OWNER: "itzy2",
    REPO_NAME: "STOCK-POINT",
    BRANCH: "main",
    INITIAL_POINTS: 5000
};

const $ = id => document.getElementById(id);

const number = value => {
    const n = Number(value ?? 0);

    return Number.isFinite(n)
        ? n.toLocaleString("ja-JP", {
            maximumFractionDigits: 2
        })
        : "0";
};

const points = value => `${number(value)} pt`;

const escapeHtml = value =>
    String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[char]));

function showNotice(message, isError = false) {
    const notice = $("notice");

    if (!notice) {
        console.error(message);
        return;
    }

    notice.textContent = message;
    notice.classList.toggle("error", isError);
}

// ==========================================
// GitHub URL
// ==========================================

function rawUrl(file) {
    return `https://raw.githubusercontent.com/` +
        `${SITE_CONFIG.REPO_OWNER}/` +
        `${SITE_CONFIG.REPO_NAME}/` +
        `${SITE_CONFIG.BRANCH}/` +
        file.split("/").map(encodeURIComponent).join("/");
}

function repoUrl(path) {
    return `https://github.com/` +
        `${SITE_CONFIG.REPO_OWNER}/` +
        `${SITE_CONFIG.REPO_NAME}/${path}`;
}

// ==========================================
// JSON取得
// ==========================================

async function getJson(file) {
    const url = `${rawUrl(file)}?t=${Date.now()}`;

    let response;

    try {
        response = await fetch(url, {
            cache: "no-store"
        });
    } catch (error) {
        throw new Error(
            `${file} に接続できませんでした。` +
            "ネットワーク接続やURLを確認してください。"
        );
    }

    if (!response.ok) {
        throw new Error(
            `${file} の取得に失敗しました。` +
            ` HTTP ${response.status}。` +
            ` URL: ${url}`
        );
    }

    try {
        return await response.json();
    } catch (error) {
        throw new Error(
            `${file} の内容が正しいJSON形式ではありません。`
        );
    }
}

// ==========================================
// データ形式の検証
// ==========================================

function validateStocks(stocks) {
    if (!Array.isArray(stocks)) {
        throw new Error(
            "stocks.json は配列形式である必要があります。"
        );
    }

    for (const stock of stocks) {
        if (
            !stock ||
            typeof stock.id !== "string" ||
            typeof stock.name !== "string" ||
            !Number.isFinite(Number(stock.price))
        ) {
            throw new Error(
                "stocks.json の銘柄データに不足や誤りがあります。"
            );
        }
    }

    return stocks;
}

function validatePlayers(players) {
    if (
        !players ||
        Array.isArray(players) ||
        typeof players !== "object"
    ) {
        throw new Error(
            "players.json はオブジェクト形式である必要があります。"
        );
    }

    for (const [username, player] of Object.entries(players)) {
        if (
            !player ||
            typeof player !== "object" ||
            Array.isArray(player)
        ) {
            throw new Error(
                `players.json の ${username} のデータ形式が正しくありません。`
            );
        }

        if (
            player.points !== undefined &&
            !Number.isFinite(Number(player.points))
        ) {
            throw new Error(
                `${username} の points が数値ではありません。`
            );
        }

        if (
            player.holdings !== undefined &&
            (
                !player.holdings ||
                typeof player.holdings !== "object" ||
                Array.isArray(player.holdings)
            )
        ) {
            throw new Error(
                `${username} の holdings はオブジェクト形式にしてください。`
            );
        }
    }

    return players;
}

function validateTransactions(transactions) {
    if (!Array.isArray(transactions)) {
        throw new Error(
            "transactions.json は配列形式である必要があります。"
        );
    }

    return transactions;
}

// ==========================================
// 資産計算
// ==========================================

function calculatePlayers(players, stocks) {
    const prices = Object.fromEntries(
        stocks.map(stock => [
            stock.id,
            Number(stock.price)
        ])
    );

    return Object.entries(players)
        .map(([username, player]) => {
            let stockValue = 0;

            for (
                const [stockId, holding]
                of Object.entries(player.holdings || {})
            ) {
                const quantity =
                    typeof holding === "number"
                        ? holding
                        : Number(holding.quantity || 0);

                stockValue +=
                    quantity * (prices[stockId] || 0);
            }

            const cash = Number(
                player.points ?? SITE_CONFIG.INITIAL_POINTS
            );

            const initialPoints = Number(
                player.initialPoints ??
                SITE_CONFIG.INITIAL_POINTS
            );

            const totalAssets = cash + stockValue;

            return {
                username,
                cash,
                stockValue,
                totalAssets,
                profit: totalAssets - initialPoints,
                holdings: player.holdings || {}
            };
        })
        .sort((a, b) => b.totalAssets - a.totalAssets);
}

// ==========================================
// 株価一覧
// ==========================================

function renderStocks(stocks) {
    const body = $("stocksBody");

    if (!body) return;

    if (stocks.length === 0) {
        body.innerHTML = `
            <tr>
                <td colspan="5">登録されている銘柄はありません。</td>
            </tr>
        `;
        return;
    }

    body.innerHTML = stocks.map(stock => {
        const current = Number(stock.price);
        const previous = Number(
            stock.previousPrice ?? stock.price
        );

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
                <td>${escapeHtml(stock.id)}</td>
                <td><strong>${escapeHtml(stock.name)}</strong></td>
                <td class="price">${points(current)}</td>
                <td>${points(previous)}</td>
                <td class="${color}">
                    ${sign}${number(difference)}
                    (${sign}${percent.toFixed(2)}%)
                </td>
            </tr>
        `;
    }).join("");
}

// ==========================================
// 資産ランキング
// ==========================================

function renderRanking(players) {
    const list = $("rankingList");

    if (!list) return;

    if (players.length === 0) {
        list.innerHTML = `
            <li class="empty-state">
                まだプレイヤーがいません。
            </li>
        `;
        return;
    }

    list.innerHTML = players
        .slice(0, 10)
        .map((player, index) => `
            <li class="rank-row">
                <div>
                    <span class="ranking-rank">
                        ${index + 1}位
                    </span>
                    <strong>
                        ${escapeHtml(player.username)}
                    </strong>
                </div>

                <div>
                    <strong>${points(player.totalAssets)}</strong>
                    <div class="${
                        player.profit >= 0 ? "up" : "down"
                    }">
                        損益 ${player.profit >= 0 ? "+" : ""}${
                            number(player.profit)
                        } pt
                    </div>
                </div>
            </li>
        `)
        .join("");
}

// ==========================================
// 全プレイヤー一覧
// ==========================================

function renderPlayers(players) {
    const body = $("playersBody");

    if (!body) return;

    if (players.length === 0) {
        body.innerHTML = `
            <tr>
                <td colspan="5">
                    プレイヤーはいません。
                </td>
            </tr>
        `;
        return;
    }

    body.innerHTML = players.map(player => `
        <tr>
            <td>${escapeHtml(player.username)}</td>
            <td>${points(player.cash)}</td>
            <td>${points(player.stockValue)}</td>
            <td>${points(player.totalAssets)}</td>
            <td class="${
                player.profit >= 0 ? "up" : "down"
            }">
                ${player.profit >= 0 ? "+" : ""}${
                    number(player.profit)
                } pt
            </td>
        </tr>
    `).join("");
}

// ==========================================
// 取引履歴
// ==========================================

function renderTransactions(transactions, stockMap) {
    const list = $("transactionsList");

    if (!list) return;

    const recent = [...transactions]
        .reverse()
        .slice(0, 20);

    if (recent.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                まだ取引履歴がありません。
            </div>
        `;
        return;
    }

    list.innerHTML = recent.map(tx => {
        const action = String(tx.action || "").toUpperCase();

        const actionLabel = action === "BUY"
            ? "購入"
            : action === "SELL"
                ? "売却"
                : "取引";

        const stockName =
            stockMap[tx.stockId]?.name ||
            tx.stockName ||
            tx.stockId ||
            "不明な銘柄";

        const date = tx.timestamp
            ? new Date(tx.timestamp).toLocaleString("ja-JP")
            : "日時不明";

        const total = Number(tx.total || 0);

        return `
            <div class="transaction-item">
                <strong>${escapeHtml(actionLabel)}</strong>
                <span>${escapeHtml(tx.username || "不明")}</span>
                <div>
                    ${escapeHtml(stockName)}
                    ${number(tx.quantity)}株
                </div>
                <div>${points(total)}</div>
                <small>${escapeHtml(date)}</small>
            </div>
        `;
    }).join("");
}

// ==========================================
// 画面の初期化
// ==========================================

async function init() {
    const tradeLink = $("tradeLink");

    if (tradeLink) {
        tradeLink.href = repoUrl(
            "issues/new?template=trade.yml"
        );
    }

    try {
        showNotice("共有市場のデータを読み込んでいます……");

        // どのファイルが失敗したか個別に判定する
        let stocks;
        let players;
        let transactions;

        try {
            stocks = validateStocks(
                await getJson("stocks.json")
            );
        } catch (error) {
            throw new Error(
                `株価データの読み込みに失敗しました。\n${error.message}`
            );
        }

        try {
            players = validatePlayers(
                await getJson("players.json")
            );
        } catch (error) {
            throw new Error(
                `プレイヤーデータの読み込みに失敗しました。\n${error.message}`
            );
        }

        try {
            transactions = validateTransactions(
                await getJson("transactions.json")
            );
        } catch (error) {
            throw new Error(
                `取引履歴の読み込みに失敗しました。\n${error.message}`
            );
        }

        const calculatedPlayers =
            calculatePlayers(players, stocks);

        if ($("playerCount")) {
            $("playerCount").textContent =
                number(calculatedPlayers.length);
        }

        if ($("transactionCount")) {
            $("transactionCount").textContent =
                number(transactions.length);
        }

        if ($("stockCount")) {
            $("stockCount").textContent =
                number(stocks.length);
        }

        renderStocks(stocks);
        renderRanking(calculatedPlayers);
        renderPlayers(calculatedPlayers);

        const stockMap = Object.fromEntries(
            stocks.map(stock => [stock.id, stock])
        );

        renderTransactions(transactions, stockMap);

        showNotice("共有市場のデータを正常に読み込みました。");

        if ($("updatedAt")) {
            $("updatedAt").textContent =
                "画面表示時刻：" +
                new Date().toLocaleString("ja-JP");
        }

        if ($("nextUpdate")) {
            $("nextUpdate").textContent =
                "GitHub Actionsの実行状況を確認してください。";
        }

    } catch (error) {
        console.error("STOCK POINT:", error);

        showNotice(error.message, true);
    }
}

document.addEventListener("DOMContentLoaded", init);
