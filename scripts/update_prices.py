import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def read_json(filename):
    with open(ROOT / filename, "r", encoding="utf-8") as f:
        return json.load(f)

def write_json(filename, data):
    with open(ROOT / filename, "w", encoding="utf-8") as f:
        json.dump(
            data,
            f,
            ensure_ascii=False,
            indent=2
        )
        f.write("\n")

def main():
    config = read_json("config.json")
    stocks = read_json("stocks.json")

    minimum = config["minChangePercent"]
    maximum = config["maxChangePercent"]
    min_price = config["minStockPrice"]

    for stock in stocks:
        old_price = stock["price"]

        change_percent = random.uniform(
            minimum,
            maximum
        )

        new_price = round(
            old_price * (1 + change_percent / 100)
        )

        stock["price"] = max(
            min_price,
            new_price
        )

        print(
            f'{stock["id"]}: '
            f'{old_price} -> {stock["price"]}'
        )

    write_json("stocks.json", stocks)

if __name__ == "__main__":
    main()
