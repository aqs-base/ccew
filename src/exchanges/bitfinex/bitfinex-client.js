const BasicClient = require("../../basic-client");
const Trade = require("../../types/trade");
const Level2Point = require("../../types/level2-point");
const Level2Snapshot = require("../../types/level2-snapshot");
const Level2Update = require("../../types/level2-update");
const Level3Point = require("../../types/level3-point");
const Level3Snapshot = require("../../types/level3-snapshot");
const Level3Update = require("../../types/level3-update");

class BitfinexClient extends BasicClient {
  constructor() {
    super("wss://api.bitfinex.com/ws", "Bitfinex");
    this._channels = {};

    this.hasTrades = true;
    this.hasLevel2Updates = true;
    this.hasLevel3Updates = true;
  }

  _sendSubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        event: "subscribe",
        channel: "trades",
        pair: remote_id,
      })
    );
  }

  _sendUnsubTrades(remote_id) {
    let chanId = this._findChannel("trades", remote_id);
    this._sendUnsubscribe(chanId);
  }

  _sendSubLevel2Updates(remote_id) {
    this._wss.send(
      JSON.stringify({
        event: "subscribe",
        channel: "book",
        pair: remote_id,
        length: "100",
      })
    );
  }

  _sendUnsubLevel2Updates(remote_id) {
    let chanId = this._findChannel("level2updates", remote_id);
    this._sendUnsubscribe(chanId);
  }

  _sendSubLevel3Updates(remote_id) {
    this._wss.send(
      JSON.stringify({
        event: "subscribe",
        channel: "book",
        pair: remote_id,
        prec: "R0",
        length: "100",
      })
    );
  }

  _sendUnsubLevel3Updates(remote_id) {
    let chanId = this._findChannel("level3updates", remote_id);
    this._sendUnsubscribe(chanId);
  }

  _sendUnsubscribe(chanId) {
    if (chanId) {
      this._wss.send(
        JSON.stringify({
          event: "unsubscribe",
          chanId: chanId,
        })
      );
    }
  }

  _findChannel(type, remote_id) {
    for (let chan of Object.values(this._channels)) {
      if (chan.pair === remote_id) {
        if (type === "trades" && chan.channel === "trades") return chan.chanId;
        if (type === "level2updates" && chan.channel === "book" && chan.prec !== "R0")
          return chan.chanId;
        if (type === "level3updates" && chan.channel === "book" && chan.prec === "R0")
          return chan.chanId;
      }
    }
  }

  _onMessage(raw) {
    let msg = JSON.parse(raw);

    // capture channel metadata
    if (msg.event === "subscribed") {
      this._channels[msg.chanId] = msg;
      return;
    }

    // lookup channel
    let channel = this._channels[msg[0]];
    if (!channel) return;

    // ignore heartbeats
    if (msg[1] === "hb") return;

    // trades
    if (channel.channel === "trades" && msg[1] === "tu") {
      this._onTradeMessage(msg, channel);
      return;
    }

    // level3
    if (channel.channel === "book" && channel.prec === "R0") {
      if (Array.isArray(msg[1])) this._onLevel3Snapshot(msg, channel);
      else this._onLevel3Update(msg, channel);
      return;
    }

    // level2
    if (channel.channel === "book") {
      if (Array.isArray(msg[1])) this._onLevel2Snapshot(msg, channel);
      else this._onLevel2Update(msg, channel);
      return;
    }
  }

  _onTradeMessage(msg) {
    let [chanId, , , id, unix, price, amount] = msg;
    let remote_id = this._channels[chanId].pair;
    let market = this._tradeSubs.get(remote_id);

    let trade = new Trade({
      exchange: "Bitfinex",
      base: market.base,
      quote: market.quote,
      tradeId: id,
      unix,
      price,
      amount,
    });
    this.emit("trade", trade);
  }

  _onLevel2Snapshot(msg) {
    let remote_id = this._channels[msg[0]].pair;
    let market = this._level2UpdateSubs.get(remote_id); // this message will be coming from an l2update
    let bids = [];
    let asks = [];
    for (let val of msg[1]) {
      let result = new Level2Point(
        val[0].toFixed(8),
        Math.abs(val[2]).toFixed(8),
        val[1].toFixed(0)
      );
      if (val[2] > 0) bids.push(result);
      else asks.push(result);
    }
    let result = new Level2Snapshot({
      exchange: "Bitfinex",
      base: market.base,
      quote: market.quote,
      bids,
      asks,
    });
    this.emit("l2snapshot", result);
  }

  _onLevel2Update(msg) {
    let remote_id = this._channels[msg[0]].pair;
    let market = this._level2UpdateSubs.get(remote_id);
    if (!msg[1].toFixed) console.log(msg);
    let point = new Level2Point(msg[1].toFixed(8), Math.abs(msg[3]).toFixed(8), msg[2].toFixed(0));
    let asks = [];
    let bids = [];
    if (msg[3] > 0) bids.push(point);
    else asks.push(point);
    let update = new Level2Update({
      exchange: "Bitfinex",
      base: market.base,
      quote: market.quote,
      asks,
      bids,
    });
    this.emit("l2update", update);
  }

  _onLevel3Snapshot(msg, channel) {
    let remote_id = channel.pair;
    let market = this._level3UpdateSubs.get(remote_id); // this message will be coming from an l2update
    let bids = [];
    let asks = [];
    msg[1].forEach(p => {
      let point = new Level3Point(p[0], p[1].toFixed(8), Math.abs(p[2]).toFixed(8));
      if (p[2] > 0) bids.push(point);
      else asks.push(point);
    });
    let result = new Level3Snapshot({
      exchange: "Bitfinex",
      base: market.base,
      quote: market.quote,
      asks,
      bids,
    });
    this.emit("l3snapshot", result);
  }

  _onLevel3Update(msg, channel) {
    let remote_id = channel.pair;
    let market = this._level3UpdateSubs.get(remote_id);
    let bids = [];
    let asks = [];

    let point = new Level3Point(msg[1], msg[2].toFixed(8), Math.abs(msg[3]).toFixed(8));
    if (msg[3] > 0) bids.push(point);
    else asks.push(point);

    let result = new Level3Update({
      exchange: "Bitfinex",
      base: market.base,
      quote: market.quote,
      asks,
      bids,
    });
    this.emit("l3update", result);
  }
}

module.exports = BitfinexClient;
