const express = require("express");
const fetch = require('node-fetch');
const uuid = require("uuid/v4");
const User = require("../models/user").userModel;
const router = new express.Router();

/**
 *
 */
router.get("/", async (req, res, next) => {

  if (!req.query.et) {
    if (req.query.message) {
      res.status(400).redirect(req.query.message)
    } else {
      res.status(400).send("Malformed request parameters");
    }
  }

  const encoded = req.query.et;
  try {
    const exchange = decodeURIComponent(req.query.et);
    const requestBody = {
      exchangeToken : exchange
    }
    fetch('https://core.human-id.org/v0.0.3/server/users/exchange', {
      method: 'post',
      body: JSON.stringify(requestBody),
      headers: { 'client-id': process.env.DPT_HUMAN_ID, 'client-secret': process.env.DPT_HUMAN_SECRET, 'Content-Type': 'application/json' }
    })
      .then(res => res.json())
      .then(json => User.findOne( { humanID: json.data.appUserId }))
      .then(userAccount => {
        console.log("checking promise!");
        console.log(userAccount);
        if (!userAccount) {
          console.log("No account found!");
          const new_user = new User;
          new_user.publicKey = uuid();
          new_user.phrase = options.body.newPhrase;
          new_user.signupTime = new Date();
          new_user.preferences = {
            colorScheme: 0,
          }
          userAccount = User.create(new_user);
          console.log("created new account! debug");
          console.log(userAccount);
          return({
            newCookie: new_user.publicKey,
            status: 200
          });
        }
      })





      // TODO: Implement recovery similar to verifysig to find a user. If user does not exist by humanID create new
      // If the user does exist, generate new cookie
      // TODO: Synchronize human/phrase/metamask in a meaningful way in model
      // Metamask address should be unique - required, essentially.
      // humanID is also unique.
      .catch(err => console.log(err))

  } catch (err) {
    // Malformed URI
    console.error(err);
  }


});


module.exports = router;
