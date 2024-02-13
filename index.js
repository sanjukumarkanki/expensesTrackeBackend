const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const sqlite3 = require("sqlite3").verbose();
const app = express();
const jwt = require("jsonwebtoken");
app.use(express.json());
app.use(cors());

const db = new sqlite3.Database(
  "./expensesTracker.db",
  sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  (err) => {
    if (err) return console.error(err.message);
    console.log("Connected to the SQLite database.");
    createTable(); // Call createTable function after database connection
  }
);

// Function to create 'users' table if it doesn't exist
function createTable() {
  //  users Table
  sql = `CREATE TABLE IF NOT EXISTS users (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(200),
    password VARCHAR(50),
    totalAmount INTEGER
);

  )`;

  db.run(sql, (err) => {
    if (err) return console.error(err.message);
    console.log("Users table created successfully.");
  });

  //  transactions table
  sql = `CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount INTEGER,
    transactionType VARCHAR(50),
    category VARCHAR(100),
    date DATE,
    userId INTEGER,
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
);
 `;

  db.run(sql, (err) => {
    if (err) return console.error(err.message);
    console.log("Transactions table created successfully.");
  });
}

app.listen(3004, () => {
  console.log("Server Starts on http://localhost:3004");
});

// POST endpoint for user registration
app.post("/register", async (req, res) => {
  const { email, password } = req.body; // Hash the password using bcrypt
  const hashedPassword = await bcrypt.hash(password, 10);

  // Check if the email already exists
  const query = `SELECT * FROM users WHERE email = ?`;
  db.get(query, [email], async (err, row) => {
    if (row) {
      res.status(400).send("Email already exists");
      return;
    } else {
      sql = `INSERT INTO users (email, password, totalAmount) VALUES(?,?,?)`;
      db.run(sql, [email, hashedPassword, 5000000], (err) => {
        if (err) {
          res.status(501);
          res.send({ Error: err.message });
        } else {
          res.status(200);
          res.send("User registered successfully");
        }
      });
    }
  });
});

// POST endpoint for  user login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  console.log(email, password);
  sql = `SELECT * FROM users WHERE email = ?`;
  db.get(sql, [email], async (err, row) => {
    if (!row) {
      res.status(400);
      console.log("no account found");
      res.send("No account found with this email address");
    } else {
      console.log(row.password, password, "match");
      const isPasswordMatched = await bcrypt.compare(password, row.password);
      if (isPasswordMatched === true) {
        const payload = {
          id: row.id,
          email: row.email,
        };
        const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
        res.send({ jwtToken: jwtToken, userDetails: row });
      } else {
        res.status(400);
        res.send({ message: "Invalid Password" });
      }
    }
  });
});

// Insert new transction into transaction table api
app.post("/add-transaction", (req, res) => {
  let { amount, date, type, category, id } = req.body;
  console.log(req.body, "body");
  amount = parseInt(amount);
  sql =
    "INSERT INTO transactions (amount, transactionType , category,date, userId) VALUES (?,?,?,?,?)";
  db.run(sql, [amount, type, category, date, id], function (err) {
    if (err) {
      console.log(err);
      return res.status(500);
      res.send({ message: "Error while adding transaction" });
    } else {
      res.status(200);
      res.send({ message: "Transaction added successfully!" });
    }
  });
});

// Getting transaction Api
app.get("/get-transactions/:id", (req, res) => {
  let sql = "SELECT * FROM transactions WHERE userId=? ORDER BY date DESC";
  let params = [req.params.id];
  console.log(params);
  db.all(sql, params, function (err, rows) {
    if (err) {
      throw err;
    }
    res.json(rows);
  });
});
