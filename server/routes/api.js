const express = require("express");
const router = express.Router();
const MongoClient = require("mongodb").MongoClient;

const req = require("request");

// Connect
const connection = (closure) => {
  return MongoClient.connect(
    "mongodb://"+ process.env.MONGO_USER + ":" + encodeURIComponent(process.env.MONGO_PASS) + "@" + process.env.MONGO_ENV + ":27017/test?authSource=admin",
    { useNewUrlParser: true },
    (err, client) => {
      if (err) return console.log(err);
      closure(client.db());
    }
  );
};

var admin = require("firebase-admin");
console.log("MONGO_ENV: " + process.env.MONGO_ENV);

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_CREDS)),
});


// Error handling
const sendError = (err, res, code) => {
  var errRes = {
    status: code,
    message: typeof err == "object" ? err.message : err,
  };
  res.status(code).json(errRes);
};

// Response handling
let response = {
  status: 200,
  data: [],
  message: null,
};

var mongoose = require("mongoose");
mongoose.Promise = global.Promise;
mongoose.connect("mongodb://" + process.env.MONGO_ENV + ":27017/test", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

var userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  phoneNumber1: String,
  phoneNumber2: String,
  phoneNumber3: String,
  address: String,
  city: String,
  state: String,
  zip: String,
  comments: String,
});

var User = mongoose.model("customerInfo", userSchema);

// Get users
router.get("/users", (req, res) => {
  admin
    .auth()
    .verifyIdToken(req.header("Authorization"))
    .then(
      (result) => {
        connection((db) => {
          User.find({})
            .sort("firstName")
            .then((users) => {
              response.data = users;
              res.json(response);
            })
            .catch((err) => sendError(err, res, 500));
        });
      },
      (err) => {
        if (
          err.code === "auth/argument-error" ||
          err.code === "auth/id-token-expired"
        ) {
          sendError(err, res, 403);
        } else {
          sendError(err, res, 500);
        }
      }
    );
});

router.post("/insertuser", (req, res) => {
  admin
    .auth()
    .verifyIdToken(req.header("Authorization"))
    .then(
      (result) => {
        connection((db) => {
          var data = new User(req.body);
          data
            .save()
            .then((item) => {
              response.data = item;
              res.json(response);
            })
            .catch((err) => {
              sendError(err, res, 500);
            });
        });
      },
      (err) => {
        if (
          err.code === "auth/argument-error" ||
          err.code === "auth/id-token-expired"
        ) {
          sendError(err, res, 403);
        } else {
          sendError(err, res, 500);
        }
      }
    );
});

router.put("/updatecustomer/:id", (req, res) => {
  admin
    .auth()
    .verifyIdToken(req.header("Authorization"))
    .then(
      (result) => {
        connection((db) => {
          User.updateOne({ _id: req.params.id }, req.body, { upsert: true })
            .then((item) => {
              response.data = item;
              res.json(response);
            })
            .catch((err) => {
              sendError(err, res, 500);
            });
          res.data = "in update";
        });
      },
      (err) => {
        if (
          err.code === "auth/argument-error" ||
          err.code === "auth/id-token-expired"
        ) {
          sendError(err, res, 403);
        } else {
          sendError(err, res, 500);
        }
      }
    );
});

router.post("/deletecustomer/:id", (req, res) => {
  admin
    .auth()
    .verifyIdToken(req.header("Authorization"))
    .then(
      (result) => {
        connection((db) => {
          User.deleteOne({ _id: req.params.id })
            .then((item) => {
              response.data = item;
              res.json(response);
            })
            .catch((err) => {
              sendError(err, res, 500);
            });
        });
      },
      (err) => {
        if (
          err.code === "auth/argument-error" ||
          err.code === "auth/id-token-expired"
        ) {
          sendError(err, res, 403);
        } else {
          sendError(err, res, 500);
        }
      }
    );
});
//BEGIN RECIPE

var recipeSchema = new mongoose.Schema({
  name: String,
  category: String,
  ingredients: Array,
  steps: Array,
  link: String,
  userID: String,
  isPrivate: Boolean,
  description: String,
});

var Recipe = mongoose.model("recipes", recipeSchema);

// Get recipes
router.get("/recipes", (req, res) => {
  connection((db) => {
    db.collection("recipes")
      .find()
      .toArray()
      .then((recipes) => {
        if (req.header("Authorization") != null) {
          admin
            .auth()
            .verifyIdToken(req.header("Authorization"))
            .then(
              (decodedToken) => {
                var pubArray = recipes.filter(function (recipe) {
                  return recipe.isPrivate == false;
                });
                var privArray = recipes.filter(function (recipe) {
                  return (
                    recipe.isPrivate == true &&
                    recipe.userID == decodedToken.uid
                  );
                });

                response.data = [...pubArray, ...privArray];
                res.json(response);
              },
              (err) => {
                if (
                  err.code === "auth/argument-error" ||
                  err.code === "auth/id-token-expired"
                ) {
                  sendError(err, res, 403);
                } else {
                  sendError(err, res, 500);
                }
              }
            );
        } else {
          //non authenicated route
          var pubArray = recipes.filter(function (recipe) {
            return recipe.isPrivate == false;
          });
          response.data = pubArray;
          res.json(response);
        }
      })
      .catch((err) => {
        sendError(err, res, 500);
      });
  });
});

router.get("/userrecipes/:id", (req, res) => {
  admin
    .auth()
    .verifyIdToken(req.header("Authorization"))
    .then(
      (result) => {
        connection((db) => {
          db.collection("recipes")
            .find({ userID: req.params.id })
            .toArray()
            .then((recipes) => {
              response.data = recipes;
              res.json(response);
            })
            .catch((err) => {
              sendError(err, res, 500);
            });
        });
      },
      (err) => {
        if (
          err.code === "auth/argument-error" ||
          err.code === "auth/id-token-expired"
        ) {
          sendError(err, res, 403);
        } else {
          sendError(err, res, 500);
        }
      }
    );
});

router.post("/insertrecipe", (req, res) => {
  admin
    .auth()
    .verifyIdToken(req.header("Authorization"))
    .then(
      (result) => {
        connection((db) => {
          var data = new Recipe(req.body);
          data
            .save()
            .then((item) => {
              response.data = item;
              res.json(response);
            })
            .catch((err) => {
              sendError(err, res, 500);
            });
        });
      },
      (err) => {
        if (
          err.code === "auth/argument-error" ||
          err.code === "auth/id-token-expired"
        ) {
          sendError(err, res, 403);
        } else {
          sendError(err, res, 500);
        }
      }
    );
});

router.put("/updaterecipe/:id", (req, res) => {
  admin
    .auth()
    .verifyIdToken(req.header("Authorization"))
    .then(
      (result) => {
        connection((db) => {
          Recipe.updateOne({ _id: req.params.id }, req.body, { upsert: true })
            .then((item) => {
              response.data = item;
              res.json(response);
            })
            .catch((err) => {
              sendError(err, res, 500);
            });
          res.data = "in update";
        });
      },
      (err) => {
        if (
          err.code === "auth/argument-error" ||
          err.code === "auth/id-token-expired"
        ) {
          sendError(err, res, 403);
        } else {
          sendError(err, res, 500);
        }
      }
    );
});

//begin users

var userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  steps: Array,
  link: String,
  user: String,
});

var Recipe = mongoose.model("recipes", recipeSchema);

module.exports = router;
