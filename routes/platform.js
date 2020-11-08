require("mongoose");
const router = require("express").Router();
const fetch = require("node-fetch");

const AccountSchema = require("../models/account");

// Main page
router.get("/", async (req, res) => {
  var emailCookie = req.cookies.email;
  var passwordCookie = req.cookies.password;

  /*
   * Check for cookies before rendering the index
   * If cookies persist redirect to the platform.ejs
   * If not redirect to either login or register (Maybe login)
   */

  if (!emailCookie && !passwordCookie) {
    res.clearCookie("email", req.cookies.email);
    res.clearCookie("password", req.cookies.password);
    res.redirect("/auth/login");
  } else {
    Promise.all([
      await AccountSchema.find({ isPrivate: false }),
      await AccountSchema.findOne({
        email: req.cookies.email,
        password: req.cookies.password,
      }),
    ])
      .then(([accounts, currentAccount]) => {
        res.render("platform", {
          accounts: accounts,
          currentAccount: currentAccount,
          err: "We couldn't find any public accounts.",
          title: "Platform | ArmSocial"
        });
      })
      .catch(([err1, err2]) => {
        res.clearCookie("email", req.cookies.email);
        res.clearCookie("password", req.cookies.password);
        res.redirect("/auth/login", { err1: err1, err2: err2 });

        console.log(err1);
        console.log(err2);
      });
  }
});

// User's Account Page
router.get("/user/:accountId", async (req, res) => {
  if (!req.cookies.email || !req.cookies.password) {
    res.redirect("/");
  } else {
    const accountId = req.params.accountId;
    const currentAccount = await AccountSchema.findOne({ email: req.cookies.email, password: req.cookies.password });
    const platformAccount = await AccountSchema.findById(accountId);
    if (!platformAccount) {
      res.redirect("/static/no-account.html");
    } else {
      res.render("platformAccount", {
        currentAccount: currentAccount,
        platformAccount: platformAccount,
        title: `${platformAccount.fullName} | ArmSocial`
      });
    }
  }
});

// Notifications tab
router.get("/notifications", async (req, res) => {
  const currentAccount = await AccountSchema.findOne({
    email: req.cookies.email,
    password: req.cookies.password,
  });
  res.render("notifications", {
    currentAccount: currentAccount,
    title: `Notifications | ArmSocial`
  })
});

// Users
router.get("/users", async (req, res) => {
  if (!req.cookies.email && !req.cookies.password) {
    res.clearCookie("password");
    res.clearCookie("email");
    res.redirect("/auth/login");
  } else {
    const accounts = await AccountSchema.find({ isPrivate: false }).sort({
      date: -1 /* Sorting by date from the latest to the oldesst */,
    });
    const currentAccount = await AccountSchema.findOne({
      email: req.cookies.email,
      password: req.cookies.password,
    });
    res.render("users", {
      accounts: accounts,
      currentAccount: currentAccount,
      err: "We couldn't find any public accounts.",
      title: "Users | ArmSocial"
    });
  }
});

// Logout
router.post("/logout/:accountId", (req, res) => {
  res.clearCookie("email", req.params.accountId);
  res.clearCookie("password", req.params.accountId);
  res.redirect("/");
});

module.exports = router;
