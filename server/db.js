//db.js

const mysql = require("mysql");

const connection = mysql.createConnection({
  host: "localhost",
  user: "new_username",
  password: "password_here",
  database: "parking_db",
});

connection.connect((err) => {
  if (err) throw err;
  console.log("Connected to the database!");
});

module.exports = connection;
