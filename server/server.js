const express = require("express");
const cors = require("cors"); // Import cors middleware
const path = require('path');
const app = express();
const port = 3000;
const db = require("./db");
const axios = require("axios");
const bodyParser = require("body-parser");
const session = require("express-session");
const bcrypt = require("bcrypt");

// Twilio configuration
const accountSid = 'ACe4a02b5a1671204d5c3e9ff8e509f0a9';
const authToken = '5c62fdf18592c021e7dbb44eefdf29f7';
const twilioPhoneNumber = '+13854621861';
const twilioClient = require('twilio')(accountSid, authToken);

app.use(bodyParser.json());
app.use(session({
  secret: 'h&7c!H9GqT3$fUj@5B*rD6zL8cdX#2pA',
  resave: false,
  saveUninitialized: true
}));

app.use(express.static(path.join(__dirname, '../client'))); 

app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// CORS middleware configuration
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:5500"); // Set your frontend origin here
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );
  res.setHeader("Access-Control-Allow-Credentials", true);
  next();
});

app.post("/signup", (req, res) => {
  const { username, password, licensePlate, mobile } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  const query = `INSERT INTO signup (username, password, licensePlate, mobile) VALUES (?, ?, ?, ?)`;
  db.query(query, [username, hashedPassword, licensePlate, mobile], (err, results) => {
      if (err) {
          return res.status(500).json({ error: err.message });
      }
      res.status(200).json({ message: "User signed up successfully" });
  });
});

// User login
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'test@123') {
      req.session.user = { username, isAdmin: true };
      return res.json({ message: 'Admin login successful', isAdmin: true });
  }
  const query = `SELECT * FROM signup WHERE username = ?`;
  db.query(query, [username], (err, results) => {
      if (results.length === 0 || !bcrypt.compareSync(password, results[0].password)) {
          return res.status(401).json({ error: "Invalid credentials" });
      }
      req.session.user = {
          id: results[0].id,
          username: results[0].username,
          licensePlate: results[0].licensePlate, // Store the license plate in the session
          mobile: results[0].mobile,
          wallet: results[0].wallet
        };
      res.status(200).json({
          message: "Login successful",
          isAdmin: false,
          licensePlate: results[0].licensePlate,
          username: results[0].username,
          mobile: results[0].mobile, // Send the license plate to the 
          wallet: results[0].wallet
      });
  });
});


// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    next(); // User is authenticated, proceed to next middleware
  } else {
    res.status(401).json({ error: "Unauthorized" }); // User is not authenticated
  }
}




// Middleware to check if user is an admin
function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.isAdmin) { // Check isAdmin flag
    next();
  } else {
    res.status(403).json({ error: 'Forbidden' });
  }
}

// Route to update wallet balance

app.post("/api/updateWallet", (req, res) => {
  const { username, balance } = req.body;

  console.log('Received request:', { username, balance }); // Added log for debugging

  if (!username || !balance) { // Check for both username and amount
    return res.status(400).json({ error: "Username and amount are required" });
  }

  const query = `UPDATE signup SET wallet = wallet + ? WHERE username = ?`;

  db.query(query, [balance, username], (err, results) => {
    if (err) {
      console.error("Error updating wallet:", err);
      return res.status(500).json({ error: "Internal server error" });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ message: "Wallet updated successfully" });
  });
});






app.get('/api/session', (req, res) => {
  if (req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
});
// Protect the parking monitoring system route
app.get("/parking-monitoring-system", isAuthenticated, (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.post("/api/check-parked", (req, res) => {
  const { tableName, licensePlate } = req.body;
  if (!tableName || !licensePlate) {
    return res.status(400).send("Table name and license plate are required");
  }

  const query = `SELECT COUNT(*) AS count FROM ?? WHERE licensePlate = ?`;
  db.query(query, [tableName, licensePlate], (err, results) => {
    if (err) {
      console.error("Error checking if vehicle is parked:", err);
      return res.status(500).json({ error: err.message });
    }

    const parked = results[0].count > 0;
    res.json({ parked });
  });
});

// Route to update parking status in a dynamic parking lot table
app.post("/api/update-parking-status", (req, res) => {
  const { tableName, slotNumber, licensePlate } = req.body;
  if (!tableName || !slotNumber || !licensePlate) {
    return res.status(400).send("Table name, slot number, and license plate are required");
  }

  const query = `UPDATE ?? SET licensePlate = ? WHERE slotNumber = ?`;
  db.query(query, [tableName, licensePlate, slotNumber], (err, results) => {
    if (err) {
      console.error("Error updating parking status:", err);
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json({ message: "Parking status updated successfully" });
  });
});

// Route to check if license plate is registered
app.post("/api/check-registration", (req, res) => {
  const { licensePlate } = req.body;

  // Query the signup table to check if license plate exists
  const query = `SELECT COUNT(*) AS count FROM signup WHERE licensePlate = ?`;
  db.query(query, [licensePlate], (err, results) => {
    if (err) {
      console.error("Error checking registration:", err);
      return res.status(500).json({ error: "Internal server error" });
    }

    const count = results[0].count;
    const registered = count > 0;
    res.json({ registered });
  });
});


// Route to fetch parking locations
app.get("/parking-locations", (req, res) => {
  db.query("SELECT * FROM parking_locations", (err, results) => {
    if (err) {
      console.error("Error fetching data from database:", err);
      res.status(500).send(err);
    } else {
      res.json(results);
    }
  });
});

// Route to fetch slots from a dynamic parking lot table
app.get("/api/slots", (req, res) => {
  const { tableName } = req.query;
  if (!tableName) {
    return res.status(400).send("Table name is required");
  }

  const query = `SELECT slotNumber, licensePlate FROM ??`;
  db.query(query, [tableName], (err, results) => {
    if (err) {
      console.error("Error fetching data from database:", err);
      res.status(500).send(err);
    } else {
      res.json(results);
    }
  });
});



function generateTicketNumber() {
  return Math.floor(Math.random() * 900000000) + 100000000;
}

// Function to format date and time
function formatDateTime(date) {
  const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
  return new Intl.DateTimeFormat('en-GB', options).format(date);
}

// Function to send SMS using Twilio
function sendSMS(licensePlate, wardNumber, fee, recipientPhoneNumber) {
  const ticketNumber = generateTicketNumber();
  const currentDate = new Date();
  const validUntil = new Date(currentDate.getTime() + 4 * 60 * 60 * 1000); // 4 hours from now

  const message = `\n
    Confirmation
    License Plate: ${licensePlate}
    Ticket-${ticketNumber} Valid only
    in ${wardNumber}
    Fee- Rs. ${fee}
    Paid upto ${formatDateTime(validUntil)}
    Max allowed time in ${wardNumber} - 4Hrs
  `;

  twilioClient.messages
    .create({
       body: message,
       from: twilioPhoneNumber,
       to: recipientPhoneNumber
     })
    .then(message => console.log('SMS sent successfully:', message.sid))
    .catch(error => console.error('Error sending SMS:', error));
}

// Route to park a vehicle in a dynamic parking lot table
app.post("/api/park", (req, res) => {
  const { tableName, slotNumber, licensePlate, fee } = req.body;
  if (!tableName || !slotNumber || !licensePlate || !fee) {
    return res.status(400).send("Table name, slot number, license plate, and fee are required");
  }

  const mobileQuery = `SELECT mobile, wallet FROM signup WHERE licensePlate = ?`;
  db.query(mobileQuery, [licensePlate], (mobileErr, mobileResults) => {
    if (mobileErr) {
      console.error("Error fetching mobile number:", mobileErr);
      return res.status(500).json({ error: mobileErr.message });
    }

    const recipientPhoneNumber = mobileResults[0].mobile;
    const currentWalletBalance = mobileResults[0].wallet;

    if (currentWalletBalance < fee) {
      return res.status(400).json({ error: "Insufficient wallet balance" });
    }

    const newWalletBalance = currentWalletBalance - fee;

    const updateWalletQuery = `UPDATE signup SET wallet = ? WHERE licensePlate = ?`;
    db.query(updateWalletQuery, [newWalletBalance, licensePlate], (updateErr) => {
      if (updateErr) {
        console.error("Error updating wallet balance:", updateErr);
        return res.status(500).json({ error: updateErr.message });
      }

      const query = `INSERT INTO ?? (slotNumber, licensePlate) VALUES (?, ?)`;
      db.query(query, [tableName, slotNumber, licensePlate], (err, results) => {
        if (err) {
          console.error("Error parking vehicle:", err);
          return res.status(500).json({ error: err.message });
        }

        // Fetch ward number from database
        const wardQuery = `SELECT zone_name FROM parking_locations WHERE unique_name = ?`;
        db.query(wardQuery, [tableName], (wardErr, wardResults) => {
          if (wardErr) {
            console.error("Error fetching ward number:", wardErr);
            return res.status(500).json({ error: wardErr.message });
          }

          const wardNumber = wardResults[0].zone_name;

          // sendSMS(licensePlate, wardNumber, fee, recipientPhoneNumber);

          res.status(200).json({ message: "Vehicle parked successfully" });
        });
      });
    });
  });
});





// Route to unpark a vehicle from a dynamic parking lot table
app.post("/api/unpark", (req, res) => {
  const { tableName, slotNumber } = req.body;
  if (!tableName || !slotNumber) {
    return res.status(400).send("Table name and slot number are required");
  }

  const query = `DELETE FROM ?? WHERE slotNumber = ?`;
  db.query(query, [tableName, slotNumber], (err, results) => {
    if (err) {
      console.error("Error unparking vehicle:", err);
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json({ message: "Vehicle unparked successfully" });
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
