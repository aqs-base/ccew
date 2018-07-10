/**
 * 行情数据
 */
class Ticker {
  constructor({ exchange, base, quote, tradeId, unix, price, amount, buyOrderId, sellOrderId }) {
    this.exchange = exchange;
    this.quote = quote;
    this.base = base;
    this.tradeId = tradeId;
    this.unix = unix;
    this.price = price;
    this.amount = amount;
    this.buyOrderId = buyOrderId;
    this.sellOrderId = sellOrderId;
  }

  get marketId() {
    return `${this.base}/${this.quote}`;
  }

  get fullId() {
    return `${this.exchange}:${this.base}/${this.quote}`;
  }
}

module.exports = Ticker;
