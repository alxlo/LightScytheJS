var sock;

var defaultOutputSettings = {
  RPS : 100, //rows per second
  walkingSpeed : 120, // cm per second
  brightness : 100 //manipulate brightness of image
};

var imgWidthInMeters = 1;

var myFlashlightColor = "#101010";

var myOutputSettings = jQuery.extend(true,{},defaultOutputSettings); //deep copy (=clone)


function setupSock() {
  sock = new SockJS("/sockjs");
  sock.onopen = function() {
      console.log('open', sock);
  };
  sock.onmessage = function(e) {
    var o = JSON.parse(e.data);
    if (o.logmessage){
      log(o.logmessage);
      console.log('Logmessage received');
    } else if (o.updateImgList){
      console.log('Image List received', o.updateImgList);
      var selbox=$('#selImage');
      selbox.empty();
      $('#myimages').empty();

      //selbox.append($("<option>"), { value: null, html: 'Choose one' });
      $.each(o.updateImgList , function(i, v){ 
        selbox.append($("<option>", { value: v, html: v }));
        $('#myimages').append($("<img>", {src: 'img/'+v, width: '100%'}));
        $('#myimages').append($("<p>").text(v));
      });
      $('#selImage').selectmenu("refresh");
    } else if (o.imageBufferReady){
      $("#btnGo").removeClass('ui-disabled');
    } else if (o.imageSet){
      log("image set: width = " + Math.round(o.imageSet.imageParms.widthInMeters*100)/100 +"m");
      imgWidthInMeters = o.imageSet.imageParms.widthInMeters;
      updateExposureTime();

    }
  };
  sock.onclose = function() {
      sock = null;
      console.log('close');
      /* Reconnect */
      setTimeout(setupSock, 1000);
      /* TODO: relogin w/ u&p */
  };
}
setupSock();

function log(message){
  var divLog = $("#divLog");
  divLog.append($("<br>"));
  divLog.append($("<code>").text(message));
  divLog.scrollTop(divLog.scrollTop()+10000);
}


function send(o) {
    if (sock)
  sock.send(JSON.stringify(o));
}

function updateExposureTime(){
  var time = Math.round(1000*imgWidthInMeters/$("#sldWalkingSpeed").val())/10;
  $("#expTime").text("- "+time+" sec");
}


$(document).ready(function() {
  console.log('document.ready');

  // bind handlers to form elements
  $("#btnGo").on("click", function() {
        $("#btnGo").addClass('ui-disabled');
        send({'go':true});
  }).addClass('ui-disabled');
  

 $("#selImage").on("change", function() {
        //alert(this.value);
        send({'imageSelected' : {
          'imageName' : $("#selImage").val(),
          'outputSettings' : myOutputSettings
        }});
        $("#btnGo").addClass('ui-disabled');
        //send({go:true});
  //}).addClass('ui-disabled');
  });

  $("#sldWalkingSpeed").on('slidestop', function(){
    //alert("huhuhuhdsuhdusd");
    updateExposureTime();
  });


  $("#btnReset").on("click", function() {
        //$("#btnReset").addClass('ui-disabled');
        $("#sldWalkingSpeed").val(myOutputSettings.walkingSpeed);
        $("#sldWalkingSpeed").slider('refresh');
        $("#sldRPS").val(myOutputSettings.RPS);
        $("#sldRPS").slider('refresh');
        $("#sldBrightness").val(myOutputSettings.brightness);
        $("#sldBrightness").slider('refresh');        
  //}).addClass('ui-disabled');
  });


  $("#btnDefaults").on("click", function() {
         //$("#btnReset").addClass('ui-disabled');
        $("#sldWalkingSpeed").val(defaultOutputSettings.walkingSpeed);
        $("#sldWalkingSpeed").slider('refresh');
        $("#sldRPS").val(defaultOutputSettings.RPS);
        $("#sldRPS").slider('refresh');
        $("#sldBrightness").val(defaultOutputSettings.brightness);
        $("#sldBrightness").slider('refresh');        
  //}).addClass('ui-disabled');
  });  

  $("#btnApply").on("click", function() {
    myOutputSettings.RPS = $("#sldRPS").val();
    myOutputSettings.walkingSpeed = $("#sldWalkingSpeed").val();
    myOutputSettings.brightness = $("#sldBrightness").val();
    send({'imageSelected' : {
      'imageName' : $("#selImage").val(),
      'outputSettings' : myOutputSettings
    }});
    $("#btnGo").addClass('ui-disabled');
  //}).addClass('ui-disabled');
  });  


  $("#lnkFlashlightOn").on("click", function() {
    send({'colorFill': myFlashlightColor});
  });

  $("#btnFlashlightOff").on("click", function() {
    send({'colorFill': "#000000"});
  });


  var colorpicker = $('#colorpicker');
  colorpicker.on('input', function() {
    send({ 'colorFill': colorpicker.val() });
    myFlashlightColor = colorpicker.val();
    });
  colorpicker.on('change', function() {
    myFlashlightColor = colorpicker.val();
    send({ 'colorFill': colorpicker.val() });
    });


});  // end document.ready

