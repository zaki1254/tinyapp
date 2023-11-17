const cookieSession = require('cookie-session');
const express = require("express");
const app = express();
const PORT = 8080;
const bcrypt = require("bcryptjs");
const { getUserByEmail } = require("./helpers.js");

app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: true }));

app.use(cookieSession({
  name: 'session',
  keys: ['toronto raptors'],


  maxAge: 24 * 60 * 60 * 1000
}));

const urlDatabase = {
  "b2xVn2": {
    longURL: "http://www.lighthouselabs.ca",
    userID: 'userRandomID',
  },
  "9sm5xK": {
    longURL: "http://www.google.com",
    userID: 'userRandomID',
  },
};

const users = {
  userRandomID: {
    id: "userRandomID",
    email: "user@example.com",
    password: bcrypt.hashSync("purple-monkey-dinosaur", 10),
  },
  user2RandomID: {
    id: "user2RandomID",
    email: "user2@example.com",
    password: bcrypt.hashSync("dishwasher-funk", 10),
  }
};

function generateRandomString() {
  let result = '';
  let chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 6; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

function urlsForUser(id) {
  let userUrls = {};
  for (const shortUrl in urlDatabase) {
    if (urlDatabase[shortUrl].userID === id) {
      userUrls[shortUrl] = urlDatabase[shortUrl];
    }
  }
  return userUrls;
}

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.get('/urls.json', (req, res) => {
  res.json(urlDatabase);
});

app.get('/urls', (req, res) => {
  const user_id = req.session['user_id'];
  const user = users[user_id];
  if (!user) {
    res.status(401);
    res.render("login", { message: "No access. Please log in or register.", user: null }); // redirecting with a message
    return;
  }
  const userUrls = urlsForUser(user_id);
  const templateVars = {
    user: users[req.session["user_id"]],
    urls: userUrls
  };
  res.render('urls_index', templateVars);
});

app.get('/urls/new', (req, res) => {
  const user_id = req.session['user_id'];
  const user = users[user_id];
  if (!user) {
    res.redirect("/login");
  } else {
    const templateVars = {
      user: users[req.session["user_id"]],
    };
    res.render('urls_new', templateVars);
  }
});

app.get("/urls/:id", (req, res) => {
  const user_id = req.session['user_id'];
  const user = users[user_id];
  if (!user) {
    res.status(403).send("No access. Please log in or register.");
    return;
  }
  if (urlDatabase[req.params.id].userID !== user_id) {
    res.status(401).send("Error: You do not own the URL.");
    return;
  }
  const templateVars = {
    id: req.params.id,
    longURL: urlDatabase[req.params.id].longURL,
    user: users[req.session["user_id"]]
  };
  res.render("urls_show", templateVars);
});

app.post("/urls", (req, res) => {
  const userID = req.session['user_id'];
  if (!userID) {
    res.status(403).send("You cannot shorten URLS");
    return;
  }
  let shortId = generateRandomString();
  let longURL = req.body.longURL;
  if (!longURL.startsWith("http://")) {
    longURL = "http://" + longURL;
  }
  urlDatabase[shortId] = { longURL, userID: userID };
  res.redirect(`/urls/${shortId}`);
});

app.get("/u/:id", (req, res) => {
  const shortID = req.params.id;
  const longURL = urlDatabase[shortID].longURL;
  if (!longURL) {
    res.status(404).send("Page Not Found");
    return;
  }
  res.redirect(longURL);
});

app.post("/urls/:id/delete", (req, res) => {
  const user_id = req.session['user_id'];
  const user = users[user_id];
  if (!user) {
    res.status(403).send("No access. Please log in or register.");
    return;
  }
  if (!urlDatabase[req.params.id] || urlDatabase[req.params.id].userID !== user_id) {
    res.status(401).send("Error: You do not own the URL.");
    return;
  }
  const id = req.params.id;
  delete urlDatabase[id];
  res.redirect("/urls");
});

app.post("/urls/:id", (req, res) => {
  const user_id = req.session['user_id'];
  const user = users[user_id];
  if (!user) {
    res.status(403).send("No access. Please log in or register.");
    return;
  }
  if (!urlDatabase[req.params.id] || urlDatabase[req.params.id].userID !== user_id) {
    res.status(401).send("Error: You do not own the URL.");
    return;
  }
  const id = req.params.id;
  res.redirect(`/urls/${id}`);
});

app.post("/urls/:id/edit", (req, res) => {
  const user_id = req.session['user_id'];
  const user = users[user_id];
  if (!user) {
    res.status(403).send("No access. Please log in or register.");
    return;
  }
  if (!urlDatabase[req.params.id] || urlDatabase[req.params.id].userID !== user_id) {
    res.status(401).send("Error: You do not own the URL.");
    return;
  }
  const id = req.params.id;
  const newURL = req.body.NewLongURL;
  for (let URL in urlDatabase) {
    if (URL === id) {
      urlDatabase[id].longURL = newURL;
    }
  }
  res.redirect('/urls');
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = getUserByEmail(email, users);
  if (!user) {
    return res.status(403).send('Error: Email not found');
  }
  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(403).send('Error: Incorrect password');
  }
  req.session.user_id = user.id;
  res.redirect('/urls');
});

app.post("/logout", (req, res) => {
  req.session = null;
  res.render("login", { message: "", user: null });
});

app.get("/register", (req, res) => {
  const user_id = req.session['user_id'];
  const user = users[user_id];
  if (user) {
    res.redirect("/urls");
  } else {
    const templateVars = {
      user: users[req.session["user_id"]],
    };
    res.render('register', templateVars);
  }
});

app.post("/register", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).send('Error: Email and password are required');
  }
  if (getUserByEmail(email, users)) {
    return res.status(400).send('Error: Email already in use');
  }
  const userId = generateRandomString();
  users[userId] = {
    id: userId,
    email: req.body.email,
    password: bcrypt.hashSync(req.body.password, 10)
  };
  req.session.user_id = userId;
  res.redirect('/urls');
});

app.get("/login", (req, res) => {
  const user_id = req.session['user_id'];
  const user = users[user_id];
  if (user) {
    res.redirect("/urls");
  } else {
    const templateVars = {
      user: users[req.session["user_id"]],
      message: ""
    };
    res.render('login', templateVars);
  }
});

app.listen(PORT, () => {
  (`Example app listening on port ${PORT}!`);
});