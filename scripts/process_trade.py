import json
import os
import re
import sys

from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def read_json(filename):
    with open(
        ROOT / filename,
        "r",
        encoding="utf-8"
    ) as file:
        return json.load(file)


def write_json(filename, data):
    with open(
        ROOT / filename,
        "w",
        encoding="utf-8"
    ) as file:
        json.dump(
            data,
            file,
            ensure_ascii=False,
            indent=2
        )
        file.write("\n")


def result(status, message, changed=False):
    message = (
        str(message)
        .replace("%", "%25")
        .replace("\r", "%0D")
        .replace("\n", "%0A")
    )

    output_path = os.environ.get("GITHUB_OUTPUT")

    if output_path:
        with open(
            output_path,
            "a",
            encoding="utf-8"
        ) as file:
            file.write(f"status={status}\n")
            file.write(f"message={message}\n")
            file.write(
                f"changed={'true' if changed else 'false'}\n"
            )

    print(message)


def get_field(body, heading):
    pattern = (
        rf"(?ims)^###\s+{re.escape(heading)}"
        rf"\s*\n+(.*?)(?=^###\s+|\Z)"
    )

    match = re.search(pattern, body or "")

    if not match:
        return ""

    value = match.group(1).strip()

    if not value or value == "_No response_":
        return ""

    return value.splitlines()[0].strip()


def round_points(value):
    return round(float(value) + 1e-9, 2)


def main():
    event_path = os.environ.get(
        "GITHUB_EVENT_PATH"
    )

    if not event_path:
        result(
            "error",
            "GitHubイベント情報を取得できません。"
        )
        return

    with open(
        event_path,
        "r",
        encoding="utf-8"
    ) as file:
        event = json.load(file)

    issue = event.get("issue", {})

    issue_number = issue.get("number")
    username = (
        issue.get("user") or {}
    ).get("login", "")

    body = issue.get("body", "")

    if not issue_number or not username:
        result(
            "error",
            "申請者または申請番号を確認できません。"
        )
        return

    action = get_field(
        body,
        "売買区分"
    ).upper()

    stock_id = get_field(
        body,
        "銘柄ID"
    ).upper()

    quantity_text = get_field(
        body,
        "株数"
    )

    if action not in ("BUY", "SELL"):
        result(
            "ignored",
            "売買区分を読み取れません。"
        )
        return

    if not re.fullmatch(
        r"[0-9]+",
        quantity_text
    ):
        result(
            "error",
            "株数は半角整数で入力してください。"
        )
        return

    quantity = int(quantity_text)

    if quantity < 1 or quantity > 100000:
        result(
            "error",
            "株数は1〜100000の範囲で入力してください。"
        )
        return

    config = read_json("config.json")
    stocks = read_json("stocks.json")
    players = read_json("players.json")
    transactions = read_json("transactions.json")

    transaction_id = f"issue-{issue_number}"

    if any(
        tx.get("id") == transaction_id
        for tx in transactions
    ):
        result(
            "duplicate",
            "この申請はすでに処理されています。"
        )
        return

    stock = next(
        (
            item
            for item in stocks
            if item.get("id") == stock_id
        ),
        None
    )

    if stock is None:
        result(
            "error",
            "指定された銘柄が見つかりません。"
        )
        return

    initial_points = float(
        config.get("initialPoints", 5000)
    )

    player = players.setdefault(
        username,
        {
            "points": initial_points,
            "initialPoints": initial_points,
            "holdings": {},
            "realizedProfit": 0,
            "createdAt": datetime.now(
                timezone.utc
            ).isoformat()
        }
    )

    player.setdefault(
        "initialPoints",
        initial_points
    )

    player.setdefault(
        "holdings",
        {}
    )

    player.setdefault(
        "realizedProfit",
        0
    )

    player["points"] = round_points(
        player.get("points", initial_points)
    )

    price = int(stock["price"])

    gross = price * quantity

    fee_rate = float(
        config.get("tradeFeePercent", 0)
    )

    fee = round_points(
        gross * fee_rate / 100
    )

    holdings = player["holdings"]

    holding = holdings.get(
        stock_id,
        {
            "quantity": 0,
            "averageCost": 0
        }
    )

    held_quantity = int(
        holding.get("quantity", 0)
    )

    average_cost = float(
        holding.get("averageCost", 0)
    )

    if action == "BUY":
        total = round_points(
            gross + fee
        )

        if player["points"] < total:
            result(
                "error",
                (
                    f"ポイント不足です。"
                    f"必要額：{total}pt、"
                    f"残高：{player['points']}pt"
                )
            )
            return

        new_quantity = (
            held_quantity + quantity
        )

        new_average = round_points(
            (
                held_quantity * average_cost
                + total
            ) / new_quantity
        )

        player["points"] = round_points(
            player["points"] - total
        )

        holdings[stock_id] = {
            "quantity": new_quantity,
            "averageCost": new_average
        }

        realized_profit = 0

    else:
        if held_quantity < quantity:
            result(
                "error",
                (
                    f"保有株数が不足しています。"
                    f"保有数：{held_quantity}株"
                )
            )
            return

        total = round_points(
            gross - fee
        )

        realized_profit = round_points(
            total - average_cost * quantity
        )

        player["points"] = round_points(
            player["points"] + total
        )

        player["realizedProfit"] = round_points(
            float(player["realizedProfit"])
            + realized_profit
        )

        remaining = held_quantity - quantity

        if remaining == 0:
            holdings.pop(stock_id, None)
        else:
            holdings[stock_id] = {
                "quantity": remaining,
                "averageCost": average_cost
            }

    transaction = {
        "id": transaction_id,
        "issueNumber": issue_number,
        "timestamp": datetime.now(
            timezone.utc
        ).isoformat(),
        "username": username,
        "action": action,
        "stockId": stock_id,
        "stockName": stock["name"],
        "quantity": quantity,
        "price": price,
        "gross": gross,
        "fee": fee,
        "total": total,
        "pointsAfter": player["points"],
        "realizedProfit": realized_profit
    }

    transactions.append(transaction)

    write_json(
        "players.json",
        players
    )

    write_json(
        "transactions.json",
        transactions
    )

    result(
        "success",
        (
            f"{username} さんの取引を処理しました。"
            f"{stock['name']}、{quantity}株、"
            f"{action}、取引額 {total}pt"
        ),
        changed=True
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        result(
            "error",
            f"処理エラー：{type(error).__name__}"
        )

        print(
            str(error),
            file=sys.stderr
        )

        sys.exit(1)
