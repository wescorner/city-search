const express = require('express');
const bodyParser = require('body-parser');
const worldcities = require('../worldcities.json');
const currencies = require('../currencies.json');
const request = require('request');
const expAutoSan = require('express-autosanitizer');

//initialize express app
const app = express();
const port = 3000;

//MongoDB connection
const { MongoClient } = require('mongodb');
const { del } = require('request');
const uri = "REMOVED;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
async function connect() {
    try {
        await client.connect();
        console.log('Connected to MongoDB...');
    } catch (e) {
        console.error(e);
    }
}
connect().catch(console.error);

//load bodyparser middleware
app.use(express.json());

//express sanitization middleware
app.use(expAutoSan.all);

//http header middleware
//taken from: https://enable-cors.org/server_expressjs.html
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, DELETE");
    next();
});

//open the port to listening
app.listen(port, () => {
    console.log('Server is up and running on port ' + port);
});

//currency API
//https://v6.exchangerate-api.com/v6/REMOVED/latest/CAD

//timezone API
//https://maps.googleapis.com/maps/api/timezone/json?location=LAT,LNG&timestamp=0&key=REMOVED


//declare globals
var username;
var city;
currency = [];

//make the currency API call and push resulting object to currency array
request('https://v6.exchangerate-api.com/v6/REMOVED/latest/CAD', function (error, response, body) {
    currency.push(JSON.parse(body));
});

//root
app.get('/', (req, res) => {
    res.send('Hello World');
});

app.get('/api/login/:name', (req, res) => {//this is going to set the current active user
    console.log(`GET request for ${req.url}`);
    const name = req.params.name;

    async function userExists() {//checks if the user already exists
        result = await client.db("CitySearch").collection("users").find({ name: name }).count() > 0;
        return result;
    }

    async function login() {//logs the user in
        var exists = await userExists();
        if (exists) {
            username = req.params.name;
            res.send({ message: `Successfully logged into user '${username}'` });
        } else {
            res.status(400).send(`Error- ${name} is not a user!`);
        }
    }
    if (name != undefined)//check if user has actually entered a username
        login(name);
    else
        res.status(400).send("Please enter a username to login!");

});

app.get('/api/logout', (req, res) => {
    console.log(`GET request for ${req.url}`);
    city = undefined;
    if (username == undefined) {//check if user is already logged in
        res.send({ message: "Cannot logout, not currently logged in!" });
    }
    else {
        username = undefined;//reset username global variable
        res.send({ message: "Successfully logged out" });

    }
});

app.post('/api/savecity/', (req, res) => {//this is going to save a city under a user's name in the db
    console.log(`POST request for ${req.url}`);

    var errorDuplicate = false;
    var errorFive = false;

    async function eligibleCity() {//checks if the city is eligible to be saved
        duplicate = await client.db("CitySearch").collection("users").find({ name: username, cities: city }).count() > 0;//check if city is already saved
        five = await client.db("CitySearch").collection("users").find({ name: username, cities: { $size: 5 } }).count() > 0;//check if user has 5 cities saved

        //logic for sending error messages
        if (duplicate)
            errorDuplicate = true;
        if (five)
            errorFive = true;
        if (!duplicate && !five)
            return true;
        else
            return false;
    }

    async function saveCity() {
        var canSave = await eligibleCity();
        if (canSave) {//if the city eligible to be saved
            client.db("CitySearch").collection("users").updateOne(//update the document in the database
                { name: username },
                { $push: { cities: city } }
            ).then(result => {
                res.send(`${city} has been saved.`);
            })
        } else {//if the city is not elegible to be saved
            if (errorDuplicate)
                res.status(400).send("Error saving city- this city is already saved!");
            else if (errorFive)
                res.status(400).send("Error saving city- you already have 5 cities saved!")
        }
    }

    if (username == undefined) {//if user is not logged in
        res.status(400).send("Please login to save a city!");
    } else if (city == undefined) {//if user hasn't searched a city
        res.status(400).send("Please search a city first to save!")
    } else {
        saveCity();//calling the function
    }
});

app.delete('/api/deletecity/:name', (req, res) => {//this is going to delete a city from the user's saved list
    console.log(`DELETE request for ${req.url}`);
    const name = req.params.name;
    //first check if the city is in the list
    //if it isnt, throw err
    //if it is, remove from user's city array

    async function cityExists() {//check if the city exists in the users saved list
        result = await client.db("CitySearch").collection("users").find({ cities: name }).count() > 0;
        return result;
    }

    async function deleteCity() {
        var exists = await cityExists();
        if (exists) {//delete city
            client.db("CitySearch").collection("users").updateOne(//remove from the document in the database
                { name: username },
                { $pull: { cities: name } }
            ).then(result => {
                res.send(`${name} has been deleted.`);
            }).catch(err => console.log(err));
        } else {//throw err
            res.status(400).send(`Error- ${name} is not a currently saved city!`)
        }
    }
    deleteCity();
});

app.get('/api/viewcities/', (req, res) => {//this is going to view the currently saved cities for a user
    console.log(`GET request for ${req.url}`);
    var cities = [];

    if (username == undefined) {
        res.status(400).send("Must be logged in to view saved cities!");
    } else {

        //fetching and returning the array of cities to the user
        client.db("CitySearch").collection("users").find({ name: username }, { projection: { _id: 0, name: 0 } }).toArray(function (err, result) {
            if (err) throw err;
            cities = result[0]["cities"];
            res.send(cities);

        });
    }

});


//adding a new user
app.post('/api/createuser', (req, res) => {
    console.log(`POST request for ${req.url}`);
    const name = req.autosan.body.title.trim();

    var count = name.length;
    console.log(count);
    if (count < 1 || count > 15) {
        res.status(400).send("Username must be between 1-15 characters!");
    } else {
        //function to check if user already exists
        async function userExists() {
            result = await client.db("CitySearch").collection("users").find({ name: name }).count() > 0;
            return result;
        }

        async function createUser() {//creating a new user
            var exists = await userExists();
            if (exists) {
                res.status(400).send(`Error- ${name} is already a user!`);
            } else {
                await client.db("CitySearch").collection("users").insertOne({ name: name, cities: [] });//inserting user into database
                res.send(`Created user ${name}`);
            }
        }
        createUser(name);//calling the create user function
    }
});


//creating the city inquiry get request
app.get('/api/city/:name', (req, res) => {
    console.log(`GET request for ${req.url}`);

    const unfilteredName = req.params.name;

    function filterString(string) {//changes any string to proper name format (eg. las vegas --> Las Vegas)

        var separate = string.toLowerCase().split(" ");
        for (let i = 0; i < separate.length; i++) {
            separate[i] = separate[i].charAt(0).toUpperCase() + separate[i].substring(1);
        }
        return separate.join(" ");
    }

    const name = filterString(unfilteredName);

    city = name;

    //declaring variables
    var cityinfo = [{
        "country": "",
        "conversion": "",
        "time": "",
        "temperature": "",
        "humidity": "",
        "wind": ""
    }];
    var weatherinfo = [];
    var country;
    var lat;
    var lng;
    var currencycode;
    var conversionrate;
    var seconds;
    var dstoffset;
    var rawoffset;

    var date = new Date();//new date object
    seconds = Math.round((date.getTime() + (date.getTimezoneOffset() * 60000)) / 1000);//getting the amount of seconds since epoch, to use on timezone API call

    //this will find the city in the json file and grab the country name, latitude, and longitude values
    for (var i = 0; i < worldcities.length; i++) {
        if (worldcities[i]["city"] == name) {
            country = worldcities[i]["country"];
            lat = worldcities[i]["lat"];
            lng = worldcities[i]["lng"];
        }
    }
    cityinfo[0]["country"] = (name + " is located in the country " + country);//setting country value

    europeanUnion = ["Austria", "Belgium", "Cyprus", "Estonia", "Finland", "France", "Germany", "Ireland", "Italy", "Latvia", "Lithuania", "Luxembourg", "Malta", "Netherlands", "Portugal", "Slovakia", "Slovenia", "Spain"];

    if (europeanUnion.includes(country)) {
        country = "European Union";
    }

    //this will find the currency code for the current city's country
    for (var j = 0; j < currencies.length; j++) {
        if (currencies[j]["Country"] == country) {
            currencycode = currencies[j]["Currency Code"];
        }
    }

    conversionrate = currency[0]["conversion_rates"][currencycode];//this will use the array from the API to get conversion rate from the currency code

    //setting cityinfo conversion value
    cityinfo[0]["conversion"] = ("The conversion rate from CAD to " + currencycode + " is: " + conversionrate);

    //first promise chain
    new Promise(function (resolve, reject) {
        //retreive offset
        request(`https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lng}&timestamp=${seconds}&key=REMVOVED`, function (error, response, body) {
            var timezoneinfo = (JSON.parse(body));//parsing the information received from API call to json object
            dstoffset = timezoneinfo["dstOffset"];
            rawoffset = timezoneinfo["rawOffset"];
            resolve(1000 * (dstoffset + rawoffset + seconds));//sum offsets to take daylight savings into account
        });
    }).then(function (result) {
        //converting the calculated number to a date+time string and setting value
        var nd = new Date(result);

        cityinfo[0]["time"] = ("The current date and time is: " + nd.toLocaleString());

    });

    //second promise chain
    new Promise(function (resolve, reject) {
        request(`https://api.airvisual.com/v2/nearest_city?lat=${lat}&lon=${lng}&key=REMOVED`, function (error, response, body) {
            weatherinfo = (JSON.parse(body));//parsing the information received from API call to json object

            //setting weather values
            cityinfo[0]["temperature"] = ("The temperature is " + weatherinfo["data"]["current"]["weather"].tp + " degrees Celcius");
            cityinfo[0]["humidity"] = ("The humidity is " + weatherinfo["data"]["current"]["weather"].hu + "%");
            cityinfo[0]["wind"] = ("The wind speed is " + weatherinfo["data"]["current"]["weather"].ws + "kmh");
            resolve();
        });
    }).then(function () {
        if (conversionrate == undefined) {
            city = undefined;
            res.status(400).send("Please enter a valid city!");
        } else {
            res.send(cityinfo);//sending final array object to user
        }
    });
});
