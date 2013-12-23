var assert = require("assert");

suite("Cards", function () {
  test("have been seeded", function (done, server, client) {
    server.eval(function () {
      var card = Cards.findOne();
      emit("card", card);
    });

    server.once("card", function (card) {
      assert.equal(card.text, "Flying sex snakes.");
      done();
    });
  });

  test("have been seeded", function (done, server, client) {
    var card = server.evalSync(function () {
      emit("return", Cards.findOne());
    });

    assert.equal(card.text, "Flying sex snakes.");
    done();
  });
});
