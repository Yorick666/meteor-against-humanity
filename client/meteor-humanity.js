var unescape = function (string) {
  var e = document.createElement('div');
  e.innerHTML = string;
  return e.childNodes[0].nodeValue.replace("_", "__________");
};

var inGame = function () {
  return Session.get("inGame");
};

var currentCzar = function () {
  var gameId = Session.get("inGame");
  var game = Games.findOne(gameId);
  return game.currentCzar === Meteor.user()._id;
};

var waiting = function () {
  var gameId = Session.get("inGame");
  var game = Games.findOne(gameId);
  return game.state === "waiting";
};

Template.playerList.players = function () {
  var gameId = Session.get("inGame");
  if (gameId) {
    var players = Object.keys(Games.findOne(gameId).players).filter(function (p) {
      return p !== Meteor.user()._id; // Filter out self
    });
    return Meteor.users.find({_id:{$in:players}}).fetch();
  }
};

Template.menu.helpers({
  inGame: inGame
});

Template.main.helpers({
  inGame: inGame,
  currentCzar: currentCzar
});

Template.main.events({
  "click .game": function (e) {
    e.preventDefault();

    var gameId = $(e.target).data("id");

    Meteor.call("joinGame", gameId, function (error, id) {
      Session.set("inGame", id);
    });
    
  }
});

Template.gameList.helpers({
  games: function () {
    return Games.find().fetch();
  },
  players: function (gameId) {
    var game = Games.findOne(gameId);

    if (game) {
      var players = Object.keys(Games.findOne(gameId).players);
      return Meteor.users.find({_id:{$in:players}}).fetch();
    }
  },
});

Template.playerList.helpers({
  inGame: inGame,
  waiting: waiting
});

Template.menu.events({
  "click #new-game": function (e) {
    e.preventDefault();

    Meteor.call("newGame", function (error, id) {
      Session.set("inGame", id);
    });
  },
  "click #join-game": function (e) {
    e.preventDefault();

    var gameId = prompt("Enter the ID of the game you would like to join:");

    Meteor.call("joinGame", gameId, function (error, id) {
      Session.set("inGame", id);
    });
  },
  "click #leave-game": function (e) {
    e.preventDefault();

    var gameId = Session.get("inGame");

    if (gameId) {
      Meteor.call("leaveGame", gameId, function () {
        Session.set("inGame", undefined);
        Session.set("canSubmit", false);
        Session.set("submittedAnswer", false);
      });
    }
  }
});

Template.cardList.cards = function () {
  var gameId = Session.get("inGame");
  var hand;
  if (gameId !== undefined) {

    hand = Games.findOne(gameId).players[Meteor.user()._id].hand;
    hand.forEach(function (card, i) {
      card.index = i;
    });

    return hand;
  }
};

Template.cardList.question = function () {
  var gameId = Session.get("inGame");
  if (gameId) {
    return Games.findOne(gameId).question;
  }
};

Template.cardList.selected = function (index) {
  var userId = Meteor.user()._id;
  var gameId = Session.get("inGame");
  var game;

  if (gameId) {
    game = Games.findOne(gameId);
    if (game.players[userId].hand[index].selected) { return "selected"; }
  }

  return "";
};

Template.cardList.unescape = unescape;

Template.cardList.canSubmit = function () {
  return Session.get("canSubmit");
};

Template.cardList.submittedAnswer = function () {
  var userId = Meteor.user()._id;
  var gameId = Session.get("inGame");
  var game = Games.findOne(gameId);

  return game.players[userId].answer;
};

Template.cardList.events({
  "click .card": function (e) {
    e.preventDefault();

    if ($(e.target).hasClass("question")) { return; } // Can't select question

    var userId = Meteor.user()._id;
    var gameId = Session.get("inGame");
    var game = Games.findOne(gameId);
    var index = $(e.target).data("index");

    game.players[userId].hand[index].selected = !game.players[userId].hand[index].selected;

    Games.update(gameId, game);

    var numSelected = 0;
    game.players[userId].hand.forEach(function (card) {
      if (card.selected) { numSelected++; }
    });

    if (numSelected === game.question.numAnswers) {
      game.players[userId].canSubmit = true;
      Session.set("canSubmit", true);
    } else {
      game.players[userId].canSubmit = false;
      Session.set("canSubmit", false);
    }

  },
  "click #submit-answer": function (e) {
    var gameId = Session.get("inGame");

    Meteor.call("submitAnswer", gameId, function (error, id) {
      Session.set("submittedAnswer", true);
      Session.set("canSubmit", false);
    });
  }
});

Template.czarList.cards = function () {
  var gameId = Session.get("inGame");
  var submittedAnswers;
  if (gameId) {
    submittedAnswers = Games.findOne(gameId).submittedAnswers;
    submittedAnswers.forEach(function (answer, i) { answer.index = i; });
    return submittedAnswers;
  }
};

Template.czarList.question = function () {
  var gameId = Session.get("inGame");
  if (gameId) {
    return Games.findOne(gameId).question;
  }
};

Template.czarList.unescape = unescape;

Template.czarList.selected = function (index) {
  var userId = Meteor.user()._id;
  var gameId = Session.get("inGame");
  var game;

  if (gameId) {
    game = Games.findOne(gameId);
    if (game.submittedAnswers[index][0].selected) { return "selected"; }
  }

  return "";
};

Template.czarList.canSubmit = function () {
  return Session.get("canSubmit");
};

Template.czarList.events({
  "click .card": function (e) {
    e.preventDefault();

    if ($(e.target).hasClass("question")) { return; } // Can't select question

    var userId = Meteor.user()._id;
    var gameId = Session.get("inGame");
    var game = Games.findOne(gameId);
    var index = $(e.target).data("index");

    game.submittedAnswers[index][0].selected = !game.submittedAnswers[index][0].selected;

    Games.update(gameId, game);

    var numSelected = 0;
    game.submittedAnswers.forEach(function (card) {
      if (card[0].selected) { numSelected++; }
    });

    if (numSelected === game.question.numAnswers) {
      game.players[userId].canSubmit = true;
      Session.set("canSubmit", true);
    } else {
      game.players[userId].canSubmit = false;
      Session.set("canSubmit", false);
    }

  },
  "click #submit-winner": function (e) {
    var gameId = Session.get("inGame");

    Meteor.call("submitWinner", gameId, function (error, id) {
      Session.set("submittedWinner", true);
      Session.set("canSubmit", false);
    });
  }
});
