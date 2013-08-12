var sock;



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
      selbox.append($("<option>"), { value: null, html: 'Choose one' });
      $.each(o.updateImgList , function(i, v){ 
        selbox.append($("<option>", { value: v, html: v }));
      });
      $('#selImage').selectmenu("refresh");
    } else if (o.imageBufferReady){
      $("#btnGo").removeClass('ui-disabled');
    } else if (o.imageSet){
      log("image set: width = " + Math.round(o.imageSet.imageParms.widthInMeters*100)/100 +"m");

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


$(document).ready(function() {
  console.log('document.ready');
  // bind handlers to form elements
  $("#btnGo").on("click", function() {
        $("#btnGo").addClass('ui-disabled');
        send({'go':true});
  //}).addClass('ui-disabled');
  });
 $("#selImage").on("change", function() {
        //alert(this.value);
        send({'imageSelected' : this.value});
        //send({go:true});
  //}).addClass('ui-disabled');
  });

});  // end document.ready

