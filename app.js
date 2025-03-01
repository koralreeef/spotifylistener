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
  setInterval(async () => { 
  await tick(status1);
}, (4000))   
  await axios({
    method: 'get',
    url: 'https://api.spotify.com/v1/me',
    headers: {
        Authorization: `Bearer `+token,
      },
  }).then(async function (response)
  {
  console.log("listening to "+response.data.display_name+"'s spotify playback")
  });
}

const emptyFolder = (fileDir) => {
  fsExtra.emptyDirSync(fileDir);
}

const removeActivePicture = () => {
  fs.unlink("./output/active.png", function (err) {
	  if (err && err.code == "ENOENT") {
		// file doens't exist
		//console.log("File doesn't exist, won't remove it.");
	  } else if (err) {
		// other errors, e.g. maybe we don't have enough permission
		console.error("lol");
	  } else {
		console.log(`removed`);
	  }
	});
}

const downloadFile = async (url, albumID) => {
	const res = await fetch(url);
  let filename = albumID;
	const destination = path.resolve("./output", filename+".png");
	removeActivePicture();
	const fileStream = fs.createWriteStream(destination, { flags: "wx" });
	await finished(Readable.fromWeb(res.body).pipe(fileStream));
	return "./output/"+filename+".png";
};

const imageDownload = async (albumID) => { 
  console.log("displaying image...");
  removeActivePicture
  await sharp("./output/"+albumID+".png")
  .resize({width: 200, height: 200, fit: sharp.fit.fill})
  .jpeg({ quality: 70 })
  .flatten({ background: '#0a1908' })
  .toFile(`./output/active.png`);
  currentalbumID = albumID;
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

const tick = async (pee) => {
  const fart = axios({
    method: 'get',
    url: 'https://api.spotify.com/v1/me/player/currently-playing',
    headers: {
        Authorization: `Bearer `+token,
      },
  }).then(async function (response)
{
    let newsong = response.data.item.name;
    if(currentsong != newsong)
    {
      let songLength = response.data.item.duration_ms - 1500;
      //let artificalLength = 10000;
      console.log("changing song...");
      console.log(songLength);
      await displayInfo(response);
      timeoutID = setTimeout(() => tick(status2), songLength);
      //console.log("timeout "+timeoutID+" created");
      console.log(pee);
    }
    
    currentsong = newsong;
});
}

const displayInfo = async (response) => {
    let album = response.data.item.album.name;
    let artist = response.data.item.artists[0].name;
    //console.log(response.data.item.artists.length);
    if(response.data.item.artists.length > 1){
      for(i = 1; i < response.data.item.artists.length; i++)
      {
          artist += ", "+response.data.item.artists[i].name;
      }
    }
    //let artist = response.data.item.artists[0].name;
    let track = response.data.item.name;
    let url;
    //take playlist image instead of having an generic local image
    if(response.data.item.is_local){
      console.log('https://api.spotify.com/v1/playlists/'+(response.data.context.external_urls.spotify).substring(34));
      await axios({
        method: 'get',
          url: 'https://api.spotify.com/v1/playlists/'+(response.data.context.external_urls.spotify).substring(34),
          headers: {
              Authorization: `Bearer `+token,
            },
      }).then(async function (res)
    {
        url = res.data.images[0].url;
    });
  }
    else {url = response.data.item.album.images[0].url;}
    let newalbumID = response.data.item.album.id;
    let newplaylistID = (response.data.context.external_urls.spotify).substring(34);
    console.log(response.data.context.external_urls.spotify);
    //console.log(album);
    //console.log(artist);
    //console.log((response.data.progress_ms/1000).toFixed(0)+"/"+(response.data.item.duration_ms/1000).toFixed(0));
    //console.log(track);
    //console.log(response.statusText);

    if(track.length > 31)
    track = track.substring(0, 31) + "...";
    if(artist.length > 31)
    artist = artist.substring(0, 31) + "...";
    if(album.length > 31)
    album = album.substring(0, 31) + "...";

    data = album
    +"\n"+track
    +"\n"+artist;

    console.log("displaying song info...");
    //check if album cover is already downloaded
    if(!response.data.item.is_local){
      if(!albumHistory.includes(newalbumID)){
      console.log("downloading new album cover...\n"+response.data.item.album.name)
      albumHistory.push(newalbumID);
      fs.writeFile('Output.txt', data, (err) => {
        if (err) throw err;
      })
      await downloadFile(url, newalbumID);
      imageDownload(newalbumID);
      } else {
      fs.writeFile('Output.txt', data, (err) => {
        if (err) throw err;
      })
      imageDownload(newalbumID); //refresh past image to be resized
      }
      if(timeoutID > 0){
        clearTimeout(timeoutID);
        //console.log("timeout "+timeoutID+" destroyed");
      }
    } 
  else { 
    if(!playlistHistory.includes(newplaylistID)){
      console.log("downloading new playlist cover...\n"+'https://api.spotify.com/v1/playlists/'+newplaylistID)
      playlistHistory.push(newplaylistID);
      fs.writeFile('Output.txt', data, (err) => {
        if (err) throw err;
      })
      await downloadFile(url, newplaylistID);
      imageDownload(newplaylistID);
      } else {
      fs.writeFile('Output.txt', data, (err) => {
        if (err) throw err;
      })
      imageDownload(newplaylistID); //refresh past image to be resized
      }
      if(timeoutID > 0){
        clearTimeout(timeoutID);
        //console.log("timeout "+timeoutID+" destroyed");
      }
  }
};

setInterval(async () => { 
    tokenRefresh();
}, (3590000))   

start();