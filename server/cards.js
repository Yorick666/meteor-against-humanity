"use strict";

Meteor.startup(function () {
  if (Cards.find().count() === 0) {
    console.log("Seeding cards...");
    masterCards.map(function (card) {
      Cards.insert(card);
    });
  }
});
