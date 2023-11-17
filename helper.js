function getUserByEmail(email, users) {
  for (let key in users) {
    if (users[key].email === email) {
      console.log("string" + users[key]);
      return users[key];
    }
  }
  return false;
}

module.exports= {getUserByEmail};