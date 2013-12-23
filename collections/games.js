Games = new Meteor.Collection("games");

Array.prototype.shuffle = function () {
  this.sort(function () { return 0.5 - Math.random(); });
};

Meteor.methods({
  newGame: function () {
    var game, gameId;
    var user = Meteor.user();

    if (!user) { throw new Meteor.Error(401, "Must be logged in to create a new game!"); }

    game = {
      players: {},
      answers: Cards.find({ cardType: "A", expansion: "Base" }).fetch(),
      questions: Cards.find({ cardType: "Q", expansion: "Base" }).fetch(),
    };

    game.answers.shuffle();
    game.questions.shuffle();

    game.players[user._id] = { hand: game.answers.splice(0, 10) };

    gameId = Games.insert(game);

    return gameId;
  },
  joinGame: function (gameId) {
    var user = Meteor.user();
    var game = Games.findOne(gameId);

    if (!user) { throw new Meteor.Error(401, "Must be logged in to join a game!"); }

    if (!game) { return undefined; }

    if (game.players[user._id]) { return gameId; }

    game.players[user._id] = { hand: game.answers.splice(0, 10) };

    Games.update(gameId, game);

    return gameId;
  },
  leaveGame: function (gameId) {
    var user = Meteor.user();
    var game = Games.findOne(gameId);

    if (!user) { throw new Meteor.Error(401, "Must be logged in to leave a new game!"); }

    if (game.players[user._id]) {
      game.players[user._id].hand.forEach(function (card) { game.answers.push(card); });
      delete game.players[user._id];
      if (Object.keys(game.players).length === 0) {
        Games.remove(game._id);
      } else {
        Games.update(gameId, game);
      }
    }

    return gameId;
  }
});
