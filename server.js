const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const http = require("http");
const app = express();
const cors = require("cors");
require("dotenv").config();

const whitelist = ["http://localhost:4200, http://localhost:5080"];

const corsOptionsDelegate = (req, callback) => {
  let corsOptions;

  let isDomainAllowed = (whitelist.indexOf(req.header('Origin')) !== -1 || whitelist.indexOf(req.header('Referer')) !== -1);

  console.log(isDomainAllowed);

  if (isDomainAllowed) {
      // Enable CORS for this request
      corsOptions = { origin: true }
  } else {
      // Disable CORS for this request
      corsOptions = { origin: false }
  }
  callback(null, corsOptions);
};

// API file for interacting with MongoDB
const api = require("./server/routes/api");

// Parsers
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// // Angular DIST output folder
// app.use(express.static(path.join(__dirname, "dist/my-test-angular-app")));
// app.use(express.static(path.join(__dirname, "src")));

// API location
app.use("/api", cors(corsOptionsDelegate),  api);

//Set Port
const port = process.env.PORT || "3000";
app.set("port", port);

const server = http.createServer(app);

server.listen(port, () => console.log(`Running on localhost:${port}`));
