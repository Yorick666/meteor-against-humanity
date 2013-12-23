var inGame = function () {
  return Session.get("inGame");
};

Template.cardList.cards = function () {
  var gameId = Session.get("inGame");
  if (gameId !== undefined) {
    return Games.findOne(gameId).players[Meteor.user()._id].hand;
  }
};

Template.playerList.players = function () {
  var gameId = Session.get("inGame");
  if (gameId) {
    var players = Object.keys(Games.findOne(gameId).players);
    return Meteor.users.find({_id:{$in:players}}).fetch();
  }
};

Template.menu.helpers({
  inGame: inGame
});

Template.main.helpers({
  inGame: inGame
});

Template.playerList.helpers({
  inGame: inGame
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
      });
    }
  }
});

Template.cardList.events({
  "click .card": function (e) {
    e.preventDefault();

    $(e.target).toggleClass("selected");
  },
});
