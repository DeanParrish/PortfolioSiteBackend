const express = require('express');
const router = express.Router();
const MongoClient = require('mongodb').MongoClient;

const req = require('request');

// Connect
const connection = (closure) => {
    return MongoClient.connect('mongodb://localhost:27017/test', { useNewUrlParser: true }, (err, client) => {
    if (err) return console.log(err);
    closure(client.db());
    });
};

console.log(req);
var admin = require("firebase-admin");

var serviceAccount = require("./../../portfoliowebsite-28f8a-firebase-adminsdk-8e4dv-6513fab54f.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// const checkJwt = jwt({
//     // Dynamically provide a signing key
//     // based on the kid in the header and 
//     // the signing keys provided by the JWKS endpoint.
//     secret: jwksRsa.expressJwtSecret({
//       cache: true,
//       rateLimit: true,
//       jwksRequestsPerMinute: 5,
//       jwksUri: `https://dev-4zf9twtm.us.auth0.com/.well-known/jwks.json`
//     }),
  
//     // Validate the audience and the issuer.
//     //audience: 'https://deanparrish.net/',
//     //issuer: `https://deanparrish.net/`,
//     audience: 'portfoliowebsite-28f8a',
//     issuer: 'https://securetoken.google.com/portfoliowebsite-28f8a',
//     algorithms: ['RS256']
//   });
const checkJwt = function(idToken){
    console.log(JSON.stringify(req));
    admin
  .auth()
  .verifyIdToken(idToken)
  .then((decodedToken) => {
    const uid = decodedToken.uid;
    // ...
  })
  .catch((error) => {
    // Handle error
  });
}

// Error handling
const sendError = (err, res) => {
    response.status = 501;
    response.message = typeof err == 'object' ? err.message : err;
    res.status(501).json(response);
};

// Response handling
let response = {
    status: 200,
    data: [],
    message: null
};

var mongoose = require("mongoose");
mongoose.Promise = global.Promise;mongoose.connect("mongodb://localhost:27017/test", {useNewUrlParser: true, useUnifiedTopology: true});

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
    comments: String
   });

var User = mongoose.model("customerInfo", userSchema);

// Get users
router.get('/users', (req, res) => {
    console.log(req.header("Authorization"));
    admin.auth().verifyIdToken(req.header("Authorization")).then(result => {
        connection((db) => {
            User.find({}).sort("firstName")
                .then(users => {
                    response.data = users;
                    res.json(response);
                })
                .catch(err => sendError(err, res));
        });
    }, err => {
        if(err.code === "auth/argument-error" || err.code === "auth/id-token-expired"){
            res.status(403);
            res.json(response);
        }else{
            res.status(500);
            response.data = err;
            res.json(response);
        }
        
        
    })   
});

router.post('/insertuser', (req, res) => {
    admin.auth().verifyIdToken(req.header("Authorization")).then(result => {
        connection((db) => {
            var data = new User(req.body);
            console.log("inside api req.body: " + data)
            data.save()
            .then(item => {
                console.log("item saved to database");
                response.data = item;
                res.json(response)
                })
                .catch(err => {
                    console.log("not saved")
                    sendError(err, res);
                });
        });
    }) 
    
});

router.put("/updatecustomer/:id", (req, res) => {
    admin.auth().verifyIdToken(req.header("Authorization")).then(result => {
        connection((db) => {
            User.updateOne({_id: req.params.id}, req.body,{upsert: true})
                .then(item => {
                    response.data = item;
                    res.json(response);
                })
                .catch(err => {
                    console.log("not saved")
                    sendError(err, res);
                });
            res.data = "in update";
        });
    })     
});

router.post("/deletecustomer/:id", (req, res) => {
    admin.auth().verifyIdToken(req.header("Authorization")).then(result => {
        connection((db) => {
            console.log(req.body);
            User.deleteOne({_id: req.params.id})
                .then(item => {
                    response.data = item;
                    res.json(response);
                })
                .catch(err => {
                    console.log("not deleted")
                    sendError(err, res);
                });
            res.data = "in delete";
        });
    }) 
    
         
    
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
    description: String
});

var Recipe = mongoose.model("recipes", recipeSchema);

// Get recipes
router.get('/recipes', (req, res) => {
    connection((db) => {
        db.collection('recipes')
            .find()
            .toArray()
            .then((recipes) => {
                
                if (req.header("Authorization") != null) {
                    admin.auth().verifyIdToken(req.header("Authorization")).then(decodedToken => {
                        var pubArray = recipes.filter(function(recipe){
                            return recipe.isPrivate == false;
                        });
                        var privArray = recipes.filter(function(recipe){
                            return recipe.isPrivate == true && recipe.userID == decodedToken.uid;
                        });

                        response.data = [...pubArray, ...privArray];
                        res.json(response);
                    });
                }else{//non authenicated route
                    var pubArray = recipes.filter(function(recipe){
                        return recipe.isPrivate == false;
                    });
                    response.data = pubArray;
                    res.json(response);
                }
                
            })
            .catch((err) => {
                sendError(err, res);
            });
    });
});

router.get('/userrecipes/:id', (req, res) => {
    console.log(req.body);
    admin.auth().verifyIdToken(req.header("Authorization")).then(result => {
        connection((db) => {
            db.collection("recipes").find({"userID": req.params.id}).toArray().then((recipes) =>{
                response.data = recipes;
                res.json(response);
            })
            .catch((err) => {
                sendError(err, res);
            })
        });
    });
})

router.post('/insertrecipe',  (req, res) => {
    admin.auth().verifyIdToken(req.header("Authorization")).then(result => {
    connection((db) => {
        var data = new Recipe(req.body);
        console.log("inside api req.body: " + data)
        data.save()
        .then(item => {
            console.log("item saved to database");
            response.data = item;
            res.json(response)
            })
            .catch(err => {
                console.log("not saved")
                sendError(err, res);
            });
    });
}, err => {
    sendError(err, res);
});
});

router.put("/updaterecipe/:id",  (req, res) => {
    admin.auth().verifyIdToken(req.header("Authorization")).then(result => {
    connection((db) => {
        Recipe.updateOne({_id: req.params.id}, req.body,{upsert: true})
            .then(item => {
                response.data = item;
                res.json(response);
            })
            .catch(err => {
                console.log("not saved")
                sendError(err, res);
            });
        res.data = "in update";
    });
}); 
    
});

//begin users

var userSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: String,
    steps: Array,
    link: String,
    user: String
});

var Recipe = mongoose.model("recipes", recipeSchema);


module.exports = router;