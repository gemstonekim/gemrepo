"use strict"

var WayCoin = artifacts.require("./WayCoin.sol");
const theBN = require("bn.js")

/**
 * Way contract tests 2
 */
contract('WayCoin2', function(accounts) {
  const BIG = (v) => new theBN.BN(v)

  const owner = accounts[0];
  const admin = accounts[1];
  const vault = accounts[2];
  const minter = accounts[0];

  const user1 = accounts[4];
  const user2 = accounts[5];
  const user3 = accounts[6];
  const user4 = accounts[7];
  const user5 = accounts[8];

  let coin, OneWayInWei, NoOfTokens, NoOfTokensInWei;

  const bnBalanceOf = async addr => await coin.balanceOf(addr);
  const bnReserveOf = async addr => await coin.reserveOf(addr);
  const bnAllowanceOf = async (owner, spender) => await coin.allowance(owner, spender);

  const balanceOf = async addr => (await coin.balanceOf(addr)).toString();
  const reserveOf = async addr => (await coin.reserveOf(addr)).toString();
  const allowanceOf = async (owner, spender) => (await coin.allowance(owner,spender)).toString();


  before(async () => {
    coin = await WayCoin.deployed();
    NoOfTokensInWei = await coin.totalSupply();
    OneWayInWei = await coin.getOneWay();
    NoOfTokens = NoOfTokensInWei.div(OneWayInWei)
  });

  const clearUser = async user => {
    await coin.setReserve(user, 0, {from: admin});
    await coin.transfer(vault, await bnBalanceOf(user), {from: user});
  };

  beforeEach(async () => {
    await clearUser(user1);
    await clearUser(user2);
    await clearUser(user3);
    await clearUser(user4);
    await clearUser(user5);
  });

  it("only admin can recall", async () => {
      assert.equal(await balanceOf(user1), "0");
      await coin.transfer(user1, OneWayInWei, {from: vault});
      await coin.setReserve(user1, OneWayInWei, {from: admin});
      assert.equal(await balanceOf(user1), OneWayInWei.toString());
      assert.equal(await reserveOf(user1), OneWayInWei.toString());

      try {
          await coin.recall(user1, OneWayInWei, {from: user1});
          assert.fail();
      } catch (exception) {
          assert.isTrue(exception.message.includes("revert"));
      }

      try {
          await coin.recall(user1, OneWayInWei, {from: owner});
          assert.fail();
      } catch (exception) {
          assert.isTrue(exception.message.includes("revert"));
      }

      try {
          await coin.recall(user1, OneWayInWei, {from: vault});
          assert.fail();
      } catch (exception) {
          assert.isTrue(exception.message.includes("revert"));
      }

      try
      {
          await coin.recall(user1, OneWayInWei, {from: admin});
          assert.equal(await balanceOf(user1), "0");
          assert.equal(await reserveOf(user1), "0");
      } catch (exception) { assert.fail() }
  });

  it("recall fails", async () => {
    assert.equal(await bnBalanceOf(user2), 0);
    coin.transfer(user2, OneWayInWei, {from: vault});
    assert.equal(await balanceOf(user2), OneWayInWei.toString());
    assert.equal(await reserveOf(user2), "0");

    try {
      // require(currentReserve >= _amount);
      await coin.recall(user2, OneWayInWei, {from: admin});
      assert.fail();
    }
    catch(exception) {
      assert.isTrue(exception.message.includes("revert"));
    }

    coin.setReserve(user2, OneWayInWei.mul(BIG(3)), {from: admin});
    try {
      // require(currentBalance >= _amount);
      await coin.recall(user2, OneWayInWei.mul(BIG(2)), {from: admin});
      assert.fail()
    }
    catch(exception) {
      assert.equal(await balanceOf(user2), OneWayInWei.toString());
      assert.equal(await reserveOf(user2), OneWayInWei.mul(BIG(3)));
      assert.isTrue(exception.message.includes("revert"));
    }
  });

  it("after recall all coin", async () => {
    assert.equal(await bnBalanceOf(user3), 0);
    coin.transfer(user3, OneWayInWei, {from: vault});
    coin.setReserve(user3, OneWayInWei, {from: admin});
    assert.equal(await balanceOf(user3), OneWayInWei.toString());
    assert.equal(await reserveOf(user3), OneWayInWei.toString());

    const vaultBal = await bnBalanceOf(vault);

    coin.recall(user3, OneWayInWei, {from: admin});

    assert.equal(await balanceOf(user3), "0");
    assert.equal(await reserveOf(user3), "0");

    assert.equal(await balanceOf(vault), vaultBal.add(OneWayInWei).toString());
  });

  it("after recall half", async () => {
    assert.equal(await balanceOf(user4), "0");
    coin.transfer(user4, OneWayInWei, {from: vault});
    coin.setReserve(user4, OneWayInWei, {from: admin});
    assert.equal(await balanceOf(user4), OneWayInWei.toString());
    assert.equal(await reserveOf(user4), OneWayInWei.toString());

    const vaultBal = await bnBalanceOf(vault);
    const halfPlayXInWei = OneWayInWei.div(BIG(2));

    coin.recall(user4, halfPlayXInWei, {from: admin});

    assert.equal(await balanceOf(user4), halfPlayXInWei.toString());
    assert.equal(await reserveOf(user4), halfPlayXInWei.toString());

    assert.equal(await balanceOf(vault), vaultBal.add(halfPlayXInWei).toString());
  });

  it("reserve and then approve", async() => {
    assert.equal(await balanceOf(user4), "0");

    const OnePlayXTimesTwoInWei = OneWayInWei.mul(BIG(2))
    const OnePlayXTimesTwoInWeiStr = OnePlayXTimesTwoInWei.toString()

    const OnePlayXTimesOneInWei = OneWayInWei.mul(BIG(1))
    const OnePlayXTimesOneInWeiStr = OnePlayXTimesOneInWei.toString()

    // send 2 WAY to user4 and set 1 WAY reserve
    coin.transfer(user4, OnePlayXTimesTwoInWei, {from: vault});
    coin.setReserve(user4, OneWayInWei, {from: admin});
    assert.equal(await balanceOf(user4), OnePlayXTimesTwoInWeiStr);
    assert.equal(await reserveOf(user4), OneWayInWei.toString());

    // approve 2 WAY to user5
    await coin.approve(user5, OnePlayXTimesTwoInWei, {from:user4});
    assert.equal(await allowanceOf(user4, user5), OnePlayXTimesTwoInWeiStr);

    // transfer 2 WAY from user4 to user5 SHOULD NOT BE POSSIBLE
    try {
      await coin.transferFrom(user4, user5, OnePlayXTimesTwoInWei, {from: user5});
      assert.fail();
    } catch(exception) {
      assert.isTrue(exception.message.includes("revert"));
    }

    // transfer 1 WAY from user4 to user5 SHOULD BE POSSIBLE
    await coin.transferFrom(user4, user5, OnePlayXTimesOneInWei, {from: user5});
    assert.equal(await balanceOf(user4), OnePlayXTimesOneInWeiStr);
    assert.equal(await reserveOf(user4), OnePlayXTimesOneInWeiStr); // reserve will not change
    assert.equal(await allowanceOf(user4, user5), OnePlayXTimesOneInWeiStr); // allowance will be reduced
    assert.equal(await balanceOf(user5), OnePlayXTimesOneInWeiStr);
    assert.equal(await reserveOf(user5), "0");

    // transfer .5 WAY from user4 to user5 SHOULD NOT BE POSSIBLE if balance <= reserve
    const halfPlayXInWei = OneWayInWei.div(BIG(2));
    try {
      await coin.transferFrom(user4, user5, halfPlayXInWei, {from: user5});
      assert.fail();
    } catch(exception) {
      assert.isTrue(exception.message.includes("revert"));
    }
  })
});
