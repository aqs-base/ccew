const Poloniex = require("./poloniex-client");
jest.mock("winston", () => ({ info: jest.fn() }));

let client;
let market = {
  id: "USDT_BTC",
  base: "BTC",
  quote: "USDT",
};

beforeAll(() => {
  client = new Poloniex();
});

test("it should support trades", () => {
  expect(client.hasTrades).toBeTruthy();
});

test("it should not support level2 snapshots", () => {
  expect(client.hasLevel2Snapshots).toBeFalsy();
});

test("it should support level2 updates", () => {
  expect(client.hasLevel2Updates).toBeTruthy();
});

test("it should not support level3 snapshots", () => {
  expect(client.hasLevel3Snapshots).toBeFalsy();
});

test("it should not support level3 updates", () => {
  expect(client.hasLevel3Updates).toBeFalsy();
});

// run first so we can capture snapshot
test("should subscribe and emit level2 snapshot and updates", done => {
  let hasSnapshot = false;
  client.subscribeLevel2Updates(market);
  client.on("l2snapshot", snapshot => {
    hasSnapshot = true;
    expect(snapshot.fullId).toMatch("Poloniex:BTC/USDT");
    expect(snapshot.exchange).toMatch("Poloniex");
    expect(snapshot.base).toMatch("BTC");
    expect(snapshot.quote).toMatch("USDT");
    expect(snapshot.sequenceId).toBeGreaterThan(0);
    expect(snapshot.timestampMs).toBeUndefined();
    expect(parseFloat(snapshot.asks[0].price)).toBeGreaterThanOrEqual(0);
    expect(parseFloat(snapshot.asks[0].size)).toBeGreaterThanOrEqual(0);
    expect(snapshot.asks[0].count).toBeUndefined();
    expect(parseFloat(snapshot.bids[0].price)).toBeGreaterThanOrEqual(0);
    expect(parseFloat(snapshot.bids[0].size)).toBeGreaterThanOrEqual(0);
    expect(snapshot.bids[0].count).toBeUndefined();
  });
  client.on("l2update", update => {
    expect(hasSnapshot).toBeTruthy();
    expect(update.fullId).toMatch("Poloniex:BTC/USDT");
    expect(update.exchange).toMatch("Poloniex");
    expect(update.base).toMatch("BTC");
    expect(update.quote).toMatch("USDT");
    expect(update.sequenceId).toBeGreaterThan(0);
    expect(update.timestampMs).toBeUndefined();
    let point = update.asks[0] || update.bids[0];
    expect(parseFloat(point.price)).toBeGreaterThanOrEqual(0);
    expect(parseFloat(point.size)).toBeGreaterThanOrEqual(0);
    expect(point.count).toBeUndefined();
    done();
  });
});

test(
  "should subscribe and emit trade events",
  done => {
    client.subscribeTrades(market);
    client.on("trade", trade => {
      expect(trade.fullId).toMatch("Poloniex:BTC/USDT");
      expect(trade.exchange).toMatch("Poloniex");
      expect(trade.base).toMatch("BTC");
      expect(trade.quote).toMatch("USDT");
      expect(trade.tradeId).toBeGreaterThan(0);
      expect(trade.unix).toBeGreaterThan(1522540800);
      expect(trade.price).toBeGreaterThan(0);
      expect(trade.amount).toBeDefined();
      done();
    });
  },
  60000
);

test("should unsubscribe from trades", () => {
  client.unsubscribeTrades(market);
});

test("should unsubscribe from level2 updates", () => {
  client.unsubscribeLevel2Updates(market);
});

test("should close connections", done => {
  client.on("closed", done);
  client.close();
});
