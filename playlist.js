const axios = require("axios").default;
const fs = require("fs");
const path = require('path');
const { finished } = require("stream/promises");
const { Readable } = require("stream");
const sharp = require("sharp");
const fsExtra = require('fs-extra');
const {clientId, clientSecret, refreshToken, localImage} = require("./config.json");
let token = ""
let currentsong = "";
let timeoutID = 0;
let status2 = "song timed out";
let status1 = "skipped song or changed playlists";
const albumHistory = [];
const playlistHistory = [];

const start = async () => {
  emptyFolder("./output");
  await tokenRefresh();
  await tick(status1);
  //setInterval(async () => { 
  //await tick(status1);
  //}, (3000))   
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const emptyFolder = (fileDir) => {
  fsExtra.emptyDirSync(fileDir);
}

const tokenRefresh = async () => {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    
    // header paremeter
    const config = {
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      }
    }
    
    // request body parameter
    const data = new URLSearchParams([
      ['grant_type', 'refresh_token'],
      ['refresh_token',refreshToken]
    ]).toString()

    const response = await axios.post("https://accounts.spotify.com/api/token", data, config)
    token = response.data.access_token;
    console.log("new token "+token+" established; refreshes in 1 hour");
};
//https://open.spotify.com/playlist/76NPrmdmuFoxMTQ6nTMQdE?si=78f9e282887348ce MY LIKED SONGS
//https://open.spotify.com/playlist/7kLsWuZ6ZuV8ItfP3ljU0V?si=cef1b8a8e3bb48f9 Quan test
//TODO: 
//find a way to get playlist song count
//make frontend for all of this
const tick = async (pee) => {
  let count = 0;

  const playlistID = "3ft5idz3gjzqSFEy3HVgzR"
  const newplaylistID = "7kLsWuZ6ZuV8ItfP3ljU0V"
  for(let i = 1; i < 7; i++){   
    let uriArray = [];
    let sortedUriArray = [];
    let trackArray = [];
    let artistString = "";
    let offset = 50 * i - 1;
    const fart = await axios({
      method: 'get',
      url: 'https://api.spotify.com/v1/playlists/'+playlistID+'/tracks?&limit=50&offset='+offset,
      headers: {
          Authorization: `Bearer `+token,
        },
    }).then(async function (response)
  {
    for(let i = 0; i < response.data.items.length; i++){
      if(response.data.items[i].track.artists[0].id != null){
        uriArray.push(response.data.items[i].track.uri);
        trackArray.push(response.data.items[i].track.artists[0].name+" - "+response.data.items[i].track.name);
        artistString = artistString + response.data.items[i].track.artists[0].id + ",";
      }
    }
  });
    const fart2 = await axios({
      method: 'get',
      url: 'https://api.spotify.com/v1/artists?ids='+artistString,
      headers: {
          Authorization: `Bearer `+token,
        },
    }).then(async function (response)
    {
    for(let i = 0; i < response.data.artists.length; i++){
      const genre = response.data.artists[i].genres;
      /*
      if((genre.includes("rap") || genre.includes("hip hop") || genre.includes("boom bap"))){
        console.log(trackArray[i]+" | genre: "+genre);
      }
      */
      if(genre.includes("post-rock")){
       count++;
       sortedUriArray.push(uriArray[i]);
       console.log(trackArray[i]+" | genre: "+genre);
     }
     //console.log(trackArray[i]+" | genre: "+genre);
    }
    });
    const fart3 = await axios({
      method: 'post',
      url: 'https://api.spotify.com/v1/playlists/'+newplaylistID+'/tracks',
      headers: {
          Authorization: `Bearer `+token,
        },
      data: {
          "uris": sortedUriArray,
          "position": 0,
       },
    })
  }
  console.log("total songs: "+count)
}

start();