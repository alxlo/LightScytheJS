/************************************************************
 * imports
 */

var fs = require('fs');
var path = require("path");
var express = require('express');
var sockjs = require('sockjs');
var microtime = require('microtime');
var nanotimer = require('nanotimer');
var pngparse = require("pngparse");
var gm = require("gm");
require ("gm-buffer");
var myLedStripe = require('ledstripe');
var Gpio = require('onoff').Gpio;

/***********************************************************
 * settings
 */

var imgDir = __dirname + '/img';
var mySPI = '/dev/spidev0.0';
var numLEDs = 32; 
var bytePerPixel = 3; //RGB
var httpPort = 80; //the port the server will listen on, use 3000 if 80 will not work
var myFlashlightColor = "#303030";



/*************************************************************
 * init variables
 */

var rowResetTime = 1000; // number of us CLK has to be pulled low (=no writes) for frame reset
         // manual of WS2801 says 500 is enough, however we need at least 1000

var rowDelay = 10000; //in ns - 100 FPS

var rowsDropped = 0; //count dropped Frames

var app = express();

var deviceReady = false; // without an image buffer we are not ready

var myOutputSettings = {
  RPS : 100, //rows per second
  walkingSpeed : 120, // cm per second
  brightness : 100 //manipulate brightness of image
};

var btnGoLast = 1;    //last value of hardware go button
var btnLightLast = 1; //last value of hardware light button
var btnGo = new Gpio(2, 'in', 'both');
var btnLight = new Gpio(1, 'in', 'both');

var myImage = {
  filename : path.join(imgDir, "rainbowsparkle.png"),
  size : {
    width : 1,
    hight : 1
  },
  ratio : 1.0, //width:height ratio of image
  imgBuffer : null
};

// just a black buffer
var blackBuffer = new Buffer(numLEDs*bytePerPixel);
for (var i=0; i<blackBuffer.length; i++){
  blackBuffer[i]=0;
};



/*************************************************************
 * connect to LED stripe
 */

myLedStripe.connect(numLEDs, 'WS2801', mySPI);
// signal startup with blue light
myLedStripe.fill(0x00, 0x00, 0x20);


/*************************************************************
 * startup webserver
 */

app.use(express.logger('dev'));  // log requests
app.use(express.static(__dirname + '/static'));
app.use('/img', express.static(__dirname + '/img'));
app.use(app.router);
var server = app.listen(httpPort);
console.log('listening on port' +  httpPort);


/*************************************************************
 * websockets setup
 */

var ws = sockjs.createServer();
var myWsConns = {};

function wsSend(o) {
	for(var id in myWsConns){
	  	try {
      		myWsConns[id].send(o);
    	} catch (e) {
        	console.error("Error sending to client " + id, e);
    	}
	}	

} // end wsSend


ws.on('connection', function(conn) {

    function send(o) {
		conn.write(JSON.stringify(o));
    };

    var id, n = 10000;
    do {
	id = Math.floor(n * Math.random());
	n *= 10;
    } while (myWsConns.hasOwnProperty(id));
    	myWsConns[id] = { conn: conn, send: send };
    	console.log("new client, setting id to " + id);

    if (imageList!==null)
        send({'updateImgList' : Object.keys(imageList)});


    conn.on('data', function(message) {
        var o;
        // parsing message from client
		try {
	    	o = JSON.parse(message);
		} catch (e) {
	    	console.error("Invalid JSON on SockJS:", message);
		}
		if (!o)
			return;
		if (o.go) {
        doLightpainting();
		} else if (o.imageSelected){
      		myOutputSettings = (o.imageSelected.outputSettings);
      		setMyImage(o.imageSelected.imageName);

      		console.log(o);
    	} else if (o.colorFill){
        colorFill(o.colorFill);
        myFlashlightColor = (o.colorFill == '#000000') ? myFlashlightColor : o.colorFill;

    	}
    }); // end conn.on('data')

    conn.on('close', function() {
      delete myWsConns[id];
      console.log('Client ' + id + 'closed connection.');
    });
});

ws.installHandlers(server, {prefix:'/sockjs'});

var imageList = null;

function parseImageDir(){
  // http://nodeexamples.com/2012/09/28/getting-a-directory-listing-using-the-fs-module-in-node-js/
  fs.readdir(imgDir, function (err, filenames) {
      if (err) {
          throw err;
      }
    imageList = new Array();  
    filenames.filter(function(filename){
       var regEx = /.*.\.(jpg|jpeg|png)$/i;
       return (regEx.test(filename) && fs.statSync(path.join(imgDir, filename)).isFile());
    }).forEach(function (filename) {
      imageList[filename] = {'aspectRatio' : null};
    });
    console.log(imageList);
    console.log(Object.keys(imageList));
    wsSend({'updateImgList' : Object.keys(imageList)});
  });
}

parseImageDir();

function setMyImage(imagename, callback){
  myImage.filename = path.join(imgDir, imagename);
  gm(myImage.filename).size(function (err, size) {
    if (err) {
      console.log ("Error reading image " + myImage.filename);
      throw err;
    } else {
      //console.log(size);
      //console.log(myImage);
      myImage.size = size;
      myImage.ratio = myImage.size.width / myImage.size.height;
      myImage.buffer = null;
      var imageParms = { 
        widthInMeters : myImage.ratio * 1, // LightScyte is 1m high currently  ToDo: parametrize this
      };
      wsSend({ 'imageSet' : {
        'imageParms' : imageParms
        }
      });
     prepareImageBuffer(function(){
     	if (callback)
			callback();
     });
    } //end else if err
  });
}


//var fd = fs.openSync(spiDevice, 'w');
//var isBusy = false;

//var lastWriteTime = microtime.now()-rowResetTime-1;

/*function isReady(){
  return microtime.now() > (lastWriteTime + rowResetTime);
}
*/


function colorFill(color){ // hexstring #RRGGBB
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
    try  {
    	var	r = parseInt(result[1], 16),
        	g = parseInt(result[2], 16),
        	b = parseInt(result[3], 16);
      myLedStripe.fill(r,g,b);
	   	console.log("Filling with color "+color);
   	} catch (e) {
   		console.error("Problem setting color",e);
   	}
};



/*
 * write a row with RGB values to the strip
 */

// function writeRow(row, buffer){
//   if (isReady()){
//     fs.writeSync(fd, buffer, row*numLEDs*bytePerPixel, numLEDs*bytePerPixel, null);
//     lastWriteTime = microtime.now();
//     return true;
//   }
//   console.log('LED strip not ready, frame dropped: '+row);
//   return false;
// }



// function writeFrame(buffer,frameDelay, callback){

//   var row = 0;
//   var framesDropped = 0;
//   var rows = buffer.length/(numLEDs*bytePerPixel);
//   var myTimer = new nanotimer();
//   var tstart = microtime.now();
//   myTimer.setInterval(function(){
//     if (row>=rows){
//       myTimer.clearInterval();
//       var frametime = microtime.now()-tstart;

//       if (callback)
// 	      callback({'frametime'     : frametime,
// 	                'rows'          : rows,
// 	                'rowsPerSecond' : Math.round(rows*100000000/frametime,2)/100,
// 	                'framesDropped' : framesDropped
// 	      });
//     } else {
//       //console.log("write row "+row);
//       framesDropped += !writeRow(row,buffer);
//       row++;
//     }
//     }, frameDelay, function(err) {
//       if(err) {
//          //error
//       }
//   });
// } //end writeFrame




/* PARSE DIRECTLY FROM resized and aligned png file
pngparse.parseFile(myImage.filename, function(err, data) {
  if(err)
    throw err
  console.log(data); 
  myImage.imgBuffer = Buffer.concat([data.data, blackBuffer]);
  //append 1 black row


  writeFrame(myImage.imgBuffer,'10m',function(result){
    console.log(result.rows+" rows in "+result.frametime+" us = "+result.rowsPerSecond+" rows/s  with "+result.framesDropped+" dropped frames");
  });
});
*/

function prepareImageBuffer(callback){
	var imageheight = 1; // 1 Meter
	var outputtime = 100 * myImage.ratio / myOutputSettings.walkingSpeed;  // t = s/v  ( v is in cm/sec !)
	var imageWidthPx = Math.round(myOutputSettings.RPS * outputtime); 
  deviceReady = false;
  gm(myImage.filename)
    .resize(imageWidthPx,numLEDs,"!")
    .rotate('black',90)
    .modulate(myOutputSettings.brightness)
    .setFormat('PNG')
    .buffer(function(err, buf) {
        pngparse.parse(buf, function(err, data) {
          if(err) {
            wsSend({'logmessage' : "error processing image"});
            throw err
          } else {
            myImage.imgBuffer = Buffer.concat([data.data, blackBuffer]);
            wsSend({'logmessage' : "image buffer ready"});
            deviceReady = true;
            wsSend({'deviceReady': deviceReady});
            if (callback)
       	 	    callback();
          } //end if err      
        }); // pngparse
    }); //bufer
};


function doLightpainting(){
    console.log("Go for gold!");
    var delay = Math.round(1000000/myOutputSettings.RPS) +"u"; //row delay in microseconds
    if (myImage.imgBuffer !== null && deviceReady){
        deviceReady = false;
        //stop btn poll timer 
        clearInterval(myBtnPollTimer);
        wsSend({'deviceReady':deviceReady});
        myLedStripe.animate(myImage.imgBuffer,delay,function(result){
            //what to do when finished
            var message = "TODO: Animation stats";
            //var message =  result.rows+" rows in "+result.frametime+" us = "+result.rowsPerSecond+" rows/s  with "+result.framesDropped+" dropped frames";
            console.log(message);
            wsSend({'logmessage':message});
            deviceReady = true;
            wsSend({'deviceReady':deviceReady});
            //re-enablebutton poll timer
            myBtnPollTimer = setInterval(btnPoll, 10);
        });
    } // end if imgBuffer !== null
}


function btnPoll(){
    //poll for changes of hardware buttons, emit events
    btnGo.read(function(err, value) { // Asynchronous read.
        if (err) console.error("error reading go button", err);
        if (value !== btnGoLast){
          btnGoLast = value;
          if (btnGoLast == 0)
            doLightpainting();
        }
    });
    btnLight.read(function(err, value) { // Asynchronous read.
        if (err) console.error("error reading light button", err);
        if (value !== btnLightLast){
          btnLightLast = value;
          if (btnLightLast == 0) {
            colorFill(myFlashlightColor);
          } else {
            colorFill("#000000");
            wsSend({'toggleBlank' : true});
          }

        }
    });

}


// graceful exit (not necessary but we will play nice)
function gracefulExit() {
  console.log( "Exiting gracefully on SIGINT or SIGTERM" )
  // TODO close websocket connections
  // TODO  shutdown sockjs server  
  // shutdown express
  server.close();  
  // switching all leds off 
  myLedStripe.fill(0x00, 0x00, 0x00);
  // close conection to SPI
  myLedStripe.disconnect();
  process.exit( )
}

// shutdown on CTRL-C and SIGTERM
process.on('SIGINT', gracefulExit).on('SIGTERM', gracefulExit)


// polling buttons every 10ms
var myBtnPollTimer = setInterval(btnPoll, 10);


/* 
 * STARTUP ANIMATION
 */

 setMyImage("rainbowsparkle.png", function(){
  myLedStripe.animate(myImage.imgBuffer,'8m', function(){
		colorFill("#200000");
	});
 });

