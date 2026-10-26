import json
import random

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


def main():
    config = read_json("config.json")
    stocks = read_json("stocks.json")

    minimum = float(
        config.get("minChangePercent", -10)
    )

    maximum = float(
        config.get("maxChangePercent", 10)
    )

    min_price = int(
        config.get("minStockPrice", 10)
    )

    now = datetime.now(
        timezone.utc
    ).isoformat()

    for stock in stocks:
        old_price = int(
            stock["price"]
        )

        stock["previousPrice"] = old_price

        change = random.uniform(
            minimum,
            maximum
        )

        new_price = round(
            old_price * (1 + change / 100)
        )

        stock["price"] = max(
            min_price,
            int(new_price)
        )

        stock["updatedAt"] = now

        print(
            f'{stock["id"]}: '
            f'{old_price} -> {stock["price"]}'
        )

    write_json(
        "stocks.json",
        stocks
    )


if __name__ == "__main__":
    main()
