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
      numPlayers: 1,
      numAnswers: 0,
      answers: Cards.find({ cardType: "A"/*, expansion: "Base"*/ }).fetch(),
      questions: Cards.find({ cardType: "Q"/*, expansion: "Base"*/, numAnswers: 1 }).fetch(),
      question: undefined,
      submittedAnswers: [],
      state: "waiting"
    };

    game.answers.shuffle();
    game.questions.shuffle();

    game.players[user._id] = { hand: game.answers.splice(0, 10) };
    game.currentCzar = user._id;

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
    game.numPlayers++;

    if (game.state === "waiting" /* && game.numPlayers > 2 */) {
      game.state = "playing";
      game.question = game.questions.shift();
    }

    Games.update(gameId, game);

    return gameId;
  },
  leaveGame: function (gameId) {
    var user = Meteor.user();
    var game = Games.findOne(gameId);

    if (!user) { throw new Meteor.Error(401, "Must be logged in to leave a new game!"); }

    if (game.players[user._id]) {
      // TODO: Handle Czar leaving the game.

      // Put their hand back in the deck
      game.players[user._id].hand.forEach(function (card) { game.answers.push(card); });
      delete game.players[user._id];
      game.numPlayers--;

      if (Object.keys(game.players).length === 0) { // No one left, remove the game
        Games.remove(game._id);
      } else if (Object.keys(game.players).length === 1) { // One person left, switch to waiting
        game.state = "waiting";
        game.questions.push(game.question); // Put the question back
        game.question = undefined;
        Games.update(gameId, game);
      } else {
        Games.update(gameId, game);
      }
    }

    return gameId;
  },
  dealQuestion: function (gameId) {
    var game = Games.findOne(gameId);
    if (game) {
      game.question = game.questions.shift();
      Games.update(gameId, game);
    }
  },
  submitAnswer: function (gameId) {
    var userId = Meteor.user()._id;
    var game = Games.findOne(gameId);
    var answer = [], submittedAnswers = [];

    if (game) {
      game.players[userId].hand.forEach(function (card, i) {
        if (card.selected) {
          card.selected = false;
          answer.push(card); // Add selected card to answer array
          game.players[userId].hand.splice(i, 1); // Remove from hand
          game.answers.push(card); // Add it back to the Answers deck
          game.players[userId].hand.push(game.answers.shift()); // Draw a new card
        }
      });

      game.players[userId].answer = answer;
      game.numAnswers++;

      // Everyone submitted except the Czar?
      if (game.numAnswers === game.numPlayers - 1) {
        for (var player in game.players) {
          if (game.players.hasOwnProperty(player) && game.currentCzar !== player && game.players[player].answer !== undefined) {
            submittedAnswers.push(game.players[player].answer);
          }
        }

        game.state = "submitted";
        game.submittedAnswers = submittedAnswers;
      }

      Games.update(gameId, game);
    }
  },
  submitWinner: function (gameId) {
    var userId = Meteor.user()._id;
    var game = Games.findOne(gameId);

    // New Czar
    var players = Object.keys(game.players);
    players.forEach(function (player, i) {
      if (player === userId) {
        game.currentCzar = players[i + 1] || players[0]; // next or first
      }

      game.players[player].answer = undefined;
    });

    // Cleanup
    game.submittedAnswers = [];
    game.numAnswers = 0;

    // New Question!
    game.questions.push(game.question); // Put the current question back
    game.question = game.questions.shift();

    game.state = "playing";
    
    Games.update(gameId, game);
  }
});
