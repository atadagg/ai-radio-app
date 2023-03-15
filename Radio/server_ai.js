const express = require('express');
const port = 3000;
const http = require('http');
const https = require('https');
//create a mySQL database
const mysql = require('mysql');
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456789',
    database: 'radio'});

const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Imports the Google Cloud client library
const textToSpeech = require('@google-cloud/text-to-speech');

// Import other required libraries
const fs = require('fs');
const util = require('util');
// Creates a client
const client = new textToSpeech.TextToSpeechClient();

const filePath = '/Users/atatandagidir/Desktop/software/Radio/output.mp3';


connection.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('MySQL connected...');
})




const app = express();

let song = null;
let artist = null;
let previousSong = null;


// send the login page
app.get('/login', (req, res) => {
  res.send(login.html)
});
//receive the post request with the access_token from the index page and check if it's in the mySQL database, if not store it in the mySQL database
app.post('/', (req, res) => {
    let access_token = req.body;
    //check if the access token is null, if it is redirect to the login page
    if (access_token == null) {
        res.redirect('/login')
    } else {
    let sql = `SELECT * FROM users WHERE access_token = '${access_token}'`;
    connection.query(sql, function(err, result) {
        if (err) throw err;
        
        if (result.length == 0) {
            let sql = `INSERT INTO users (access_token) VALUES ('${access_token}')`;

            connection.query(sql, function(err, result) {
                if (err) throw err;
      
                console.log("Access token stored successfully");
      
                connection.end();
    });
    res.send('success');
};
})}});








//create a function that will send a get request to the Spotify API with the access token to get the current song that is playing and put all the data in a JSON object
function getCurrentlyPlayingSong() {
// Create a new XMLHttpRequest object
let xhr = new XMLHttpRequest();

// Set the request URL to the Spotify API endpoint for the current song playing
xhr.open('GET', 'https://api.spotify.com/v1/me/player/currently-playing');
xhr.setRequestHeader("Content-Type", "application/json");
xhr.setRequestHeader("Authorization", "Bearer " + access_token);

// Send the request to the server 
xhr.send(); 

// Wait for a response from the server and store it in a JSON object 
xhr.onload = function() { 

    // Check if the response was successful (status code 200) 
    if (xhr.status === 200) {

        // Store the response data in a JSON object 
        let currentSongData = xhr.response;
        
        // Scrape the currently playing song and the artist from the JSON object and store it in global variable
        let song = currentSongData.item.name;
        let artist = currentSongData.item.artists[0].name;


    } else {

        console.log('Error: ' + xhr.status);  

    }  														  
}
};




app.listen(port, () => {
    console.log(`API listening on port ${port}`)
});

while(true) {
    getCurrentlyPlayingSong();
    if (song == previousSong) {
        // if the song is the same as the previous song, wait 5 seconds and continue the loop
        setTimeout(() => {
          }, 5000);
        continue;
        } else if (song != null) {
        // send a post request to openAI api with the song and artist as parameters
        let prompt = `write me a prelude for a radio host to present the song ${song} by ${artist} in a very short form.`;//figure out the prompt

        try {
            const completion = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: `${prompt}`,
            });
            console.log(completion.data.choices[0].text);

            
        } catch (error) {
            if (error.response) {
            console.log(error.response.status);
            console.log(error.response.data);
            } else {
            console.log(error.message);
            }
        }
        // send a post request to the google text to speech api with the completion as a parameter 
        async function quickStart() {
            // The text to synthesize
            const text = completion.data.choices[0].text;
          
            // Construct the request
            const request = {
              input: {text: text},
              // Select the language and SSML voice gender (optional)
              voice: {languageCode: 'en-US', ssmlGender: 'NEUTRAL'},
              // select the type of audio encoding
              audioConfig: {audioEncoding: 'MP3'},
            };
          
            // Performs the text-to-speech request
            const [response] = await client.synthesizeSpeech(request);
            // Write the binary audio content to a local file
            const writeFile = util.promisify(fs.writeFile);
            await writeFile('output.mp3', response.audioContent, 'binary');
            console.log('Audio content written to file: output.mp3');
          }
          quickStart();
          var audio = new Audio("output.mp3");
          audio.play();
        previousSong = song;


fs.unlink(filePath, (err) => {
    if (err) {
        console.error(err);
        return;
    }

    console.log(`${filePath} was deleted`);
});

}   else {
        // if the song is null, wait 5 seconds and continue the loop
        setTimeout(() => {
          }, 5000);
        continue;
    }
}