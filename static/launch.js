jQuery(document).ready(function() {
	var socket = io.connect(window.location.protocol
		+ '//' + window.location.host, {transports: ['websocket']});

	var dpt = new DPT(socket);
	var currentTopic = 0;
	var currentDialog;
	var dialogFormOpen = 0;
	var whoami = { dptUUID: '', user: {}};
	
	
	// Handle the incomming websocket trafic

	socket.on('connect', () => {
		// if needed, we could keep socket.id somewhere
		if(document.cookie) {
			dpt.userLogin(document.cookie);
		}
	});
		
	// will be obsolete soon
	socket.on('kanal', function(msg) {
		jQuery('#messages').append(jQuery('<li>').text(msg.username +": "+msg.message));
		window.scrollTo(0, document.body.scrollHeight);
	});

	// server says it has some updates for client
	socket.on('update', function(restObj){

	    if(restObj.method == 'post') {
	    	
	        if(restObj.path == '/info/') {
				jQuery('#messages')
				.append(jQuery('<li>')
				.text(restObj.data.message));

				window.scrollTo(0, document.body.scrollHeight);
	        }
	    }

        if(restObj.path == '/topic/' && restObj.method == 'get') {
        	dpt.getTopic();
        }

        if(restObj.path == '/dialog/list/' && restObj.method == 'get') {
        	dpt.getDialogList();
        }

        if(restObj.path.startsWith('/opinion/')
        && restObj.data.id == currentTopic
        && restObj.method == 'get') {
        	dpt.getOpinionByTopic(currentTopic);
        }
        
        if(currentDialog && restObj.path == '/dialog/' + currentDialog.dialog +'/'
        && restObj.method == 'get'
        && dialogFormOpen == 1) {
        	dpt.getDialog(currentDialog.dialog);
        }
	});

	socket.on('api', function(restObj) {
		if(!restObj) {
			return;
		}
		if('status' in restObj && restObj.status > 399) {

			alert(restObj.data);
			return;

		} else if(currentDialog && restObj.path == '/dialog/' + currentDialog.dialog +'/' && restObj.method == 'get') {
			var old = currentDialog;
			currentDialog = restObj.data;
			currentDialog.topic = old.topic;
			currentDialog.initiatorOpinion = old.initiatorOpinion;
			currentDialog.recipientOpinion = old.recipientOpinion;
			dialogForm();

		} else if(restObj.path == '/dialog/list/' && restObj.method == 'get') {

			console.log(restObj.data);
			var dialog = '';
			var dialogs = restObj.data.data;
			jQuery('div.col.right').html('<h2>Dialogs</h2>');
			for(var i=0; i < dialogs.length; i++) {
				dialog = '<div class="dialog"><i>proposition:</i> '+dialogs[i].opinionProposition+"<br>";
				dialog += '<div class="hide"><i>topic:</i> '+dialogs[i].topic+"<br>";
				if(dialogs[i].initiator == 'me') {
					dialog += "<i>my opinion:</i> "+dialogs[i].initiatorOpinion+"<br>";
					dialog += "<i>other's opinion:</i> "+dialogs[i].recipientOpinion+"<br>";
					dialog += "<i>initiator:</i> me ";
				} else {
					dialog += "<i>my opinion:</i> "+dialogs[i].recipientOpinion+"<br>";
					dialog += "<i>other's opinion:</i> "+dialogs[i].initiatorOpinion+"<br>";
					dialog += "<i>initiator:</i> other ";
				}
				dialog += "<i>status:</i> "+dialogs[i].status+"</div>";
				dialog += `<div class="dialogInfo" style="visibility: hidden; line-height: 0px; font-size: 0px;">${JSON.stringify(dialogs[i])}</div>`;
				jQuery('div.col.right').append(dialog+"<br></div>");
				jQuery('.hide').css({"visibility": "hidden", "line-height": "0%"});
			}

		} else if(restObj.path == '/topic/') {

			jQuery('div.col.left').html('<h2>Topics</h2>');
			var i;
			var options = '';
			for (i in restObj.data) {
				if(restObj.data[i].user == 'mine') {
					options = '<span class="editTopic" id="'
							+ restObj.data[i]._id
							+ '">&#128393;</span>';
				} else {
					options = '';
				}
				jQuery('div.col.left').append(
					'<li> <a class="opinionlist" id="'
					+ restObj.data[i]._id
					+ '" href="#">'
					+ restObj.data[i].content
					+ "</a>"
					+ ' [' + restObj.data[i].opinions.length + '] '
					+ options+"</li><br>");
			}
			topicEdit();
			topicForm();

		} else if(restObj.path.startsWith("/opinion/"+currentTopic+"/")) {

			var i;
			var options = '';
			var canInvite = false;

			jQuery('div.col.mid').html('<h2>Opinions</h2>');

			for (i in restObj.data) {
				if(restObj.data[i].user == 'mine') {
					canInvite = true;
				}
			}

			for (i in restObj.data) {

				if(restObj.data[i].user == 'mine') {
					options = '<span class="editOpinion" id="'
					+ restObj.data[i]._id
					+ '">&#128393;</span>';
				} else {
					if(restObj.data[i].blocked == 0
					&& canInvite) {
						options = '<span class="inviteToDialog" id="'
						+ restObj.data[i]._id
						+ '">'
						+ '&#128172;'
						+ '</span>';
					}
				}

				jQuery('div.col.mid').append('<li><span class="text">'
				+ restObj.data[i].content
				+ "</span> " +options+ "</li><br>");
			}

			if(restObj.data.length > 0) {
				dpt.opinionPostAllowed(restObj.data[0].topic);
			} else {
				opinionForm();
			}
			opinionEdit();

		} else if(restObj.path == '/opinion/postAllowed/' && restObj.data.value == true) {

			opinionForm();

		} else if(restObj.path == '/user/reclaim/'+ whoami.dptUUID +'/') {

			if(restObj.data.newCookie) {
				document.cookie = "dptUUID="+restObj.data.newCookie+"; expires=Thu, 31 Dec 2099 23:59:59 UTC; path=/;"; 
				location.reload();
			} else {
				console.log("special treadment, new account?!");
			}

		} else if(restObj.path == '/metadata/user/'+whoami.dptUUID+'/') {

			whoami.user = restObj.data;
			console.log('whoami.user: '+whoami.user);

		}

		linkHandler();

	});

	socket.on('private', function(restObj) {

	    if(restObj.method == 'post') {
	        if(restObj.path == '/user/login/') {

	        	whoami.dptUUID = restObj.data.dptUUID;

	        	if(restObj.data.message == 'logged in') {

	        		whoami.user = restObj.data.user;
	        		dpt.getMetadataUser(whoami.dptUUID);
	        		dpt.getTopic();
	        		dpt.getDialogList();

	        	}

				if(restObj.data.message == 'user unknown') {

					whoami.user = {};
					phraseForm(restObj.data.dptUUID);

				} else {

					jQuery('#messages').append(jQuery('<li>').text(restObj.data.message));
					window.scrollTo(0, document.body.scrollHeight);

	        	}
	        }
	    }
	});
	
	socket.on('error', function (err) {
		console.log('System', err ? err : 'A unknown error occurred');
		document.location.reload(true);
		window.location.reload(true);
	});


	// make links triggers for api calls
	function linkHandler() {

		// first and foremost, we need to remove all old event hooks
		jQuery("a.opinionlist").off("click");

		// and then implement the new ones
		jQuery("a.opinionlist").click(function( event ) {
			event.preventDefault();
			dpt.getOpinionByTopic(this.id);
			// the clicked link sets the new current topic.
			currentTopic = this.id;
			return(false);
		});

	}
	
	function phraseForm(dptUUID) {

		jQuery('#misc').append('<div style="position: absolute; padding: 10px; left: 37%;'
				+'border: #fff; border-style: solid; border-width: 5px; background: #0a120a;" id="phrase">'
				+'This device seems not registered, yet.<br>'
				+'Please enter your phrase:<br><form id="phrase">'
				+'<input type="text" name="phrase" size="50" class="phrase"></form></div>');

		jQuery(".phrase").focus();

		jQuery("#phrase").submit(function(event) {
			dpt.userReclaim(jQuery('.phrase').val(), dptUUID);
			jQuery('#misc').empty();
			event.preventDefault();
		});

	}
	
	function propositionForm(opinionId) {

		jQuery('#misc').append('<div style="position: absolute; padding: 10px; left: 37%;'
				+'border: #fff; border-style: solid; border-width: 5px; background: #0a120a;" id="proposition">'
				+'Please enter your proposition:<br><form id="proposition">'
				+'<input type="text" name="proposition" size="50" class="proposition">'
				+'<input type="hidden" id="opinionId" name="opinionId" value="'+opinionId+'"</form></div>');

		jQuery(".proposition").focus();
		
		jQuery(document).one('keyup', '#proposition', function(event) {
		    if (event.keyCode == 27) {
				jQuery('#misc').empty();
				event.preventDefault();
		    }
		});

		jQuery(document).on('submit', 'form#proposition', function(event) {
			event.stopImmediatePropagation();
			var proposition = jQuery('.proposition').val();
			var opinionId = jQuery('#opinionId').val();
			if(proposition) {
				dpt.postDialog(proposition, whoami.dptUUID, opinionId);
			}
			jQuery('.proposition').val('');
			jQuery('#misc').empty();
			event.preventDefault();
			return(0);
		});
	}

	function topicForm() {

		jQuery('div.col.left').append(
			'<br><hr style="border-color: #5a825a; border-style: solid;">Your topic:<br><form id="newTopic">'
			+'<input class="anewtopic" type=text size=50 name="newTopic"></form>'
		);

		jQuery("#newTopic").submit(function(event) {
			dpt.postTopic(jQuery('.anewtopic').val());
			jQuery('.anewtopic').val('');
			event.preventDefault();
		});

	}

	function opinionForm() {

		jQuery('div.col.mid').append(
			'<br><hr style="border-color: #5a825a; border-style: solid;">Your opinion:<br><form id="newOpinion">'
			+'<input class="anewopinion" type=text size=50 name="newOpinion"></form>'
		);

		jQuery("#newOpinion").submit(function(event) {
			dpt.postOpinion(currentTopic, jQuery('.anewopinion').val());
			jQuery('.anewopinion').val('');
			event.preventDefault();
		});

	}


	function topicEdit() {

		jQuery('.editTopic').click(function(event) {
			jQuery(this).prev('a').html(
					'<form class="newTopic">'
					+ '<input type="text" value="'
					+  this.previousElementSibling.innerText
					+ '" name="newTopic">'
					+'</form>'
			);

			event.preventDefault();
		});

		jQuery(document).one("submit", "form.newTopic", function(event) {
			dpt.putTopic(this[0].value, this.parentNode.nextElementSibling.id, whoami.dptUUID);
			event.stopImmediatePropagation();
			event.preventDefault();
		});
	}

	function opinionEdit() {

		jQuery('.editOpinion').click(function(event) {
			jQuery(this).prev('span').html(
					'<form class="editOpinion">'
					+ '<input type="text" value="'
					+  this.previousElementSibling.innerText
					+ '" name="newOpinion">'
					+'</form>'
			);
			event.preventDefault();
		});

		jQuery(document).one("submit", "form.editOpinion", function(event) {
			dpt.putOpinion(whoami.dptUUID, this.parentNode.nextElementSibling.id, currentTopic, this[0].value);
			event.preventDefault();
		});

	}
	
	function crisisForm(messageId) {

		jQuery('#misc2').append('<div style="position: absolute; padding: 10px; left: 37%;'
				+'border: #fff; border-style: solid; border-width: 5px; background: #0a120a;" id="crisis">'
				+'crisis form.<br><br>'
				+'Finish the dialog '+ messageId +'.<br>'
				+'Please enter the reason:<br><form id="crisis">'
				+'<input type="text" name="reason" size="50" class="reason"></form></div>');

		jQuery(".crisis").focus();

		jQuery("#crisis").submit(function(event) {
			event.stopImmediatePropagation();
			event.preventDefault();
			dpt.postCrisis(jQuery('.reason').val(), currentDialog.dialog, messageId, whoami.dptUUID);
			jQuery('#misc2').empty();
		});

	}
	
	function dialogForm() {

		var opinion1;
		var opinion2;

		dialogFormOpen = 1;
		if(currentDialog.initiator == 'me') {

			opinion1 = currentDialog.recipientOpinion;
			opinion2 = currentDialog.initiatorOpinion;
			opinion2 += "<br><br><b>Initiators proposition:</b><br>" + currentDialog.opinionProposition

		} else {

			opinion1 = currentDialog.initiatorOpinion;
			opinion1 += "<br><br><b>Initiators proposition:</b><br>" + currentDialog.opinionProposition
			opinion2 = currentDialog.recipientOpinion;

		}
		
		var dialog = '';
		var myMessageCount = 0;
		var othersMessageCount = 0;
		var meReadyToEnd = '';
		var otherReadyToEnd = '';
		var viewOnly = true;
		
		const maxMessages = currentDialog.extension * 10;

		if(currentDialog.messages.length == 0) {
			dialog = '<i style="line-height: 0px">&nbsp;</i>';
		}

		for(var i=0; i < currentDialog.crisises.length; i++) {
			if(currentDialog.crisises[i].initiator == 'me') {
				meReadyToEnd = 'Ready to End';
			}
			if(currentDialog.crisises[i].initiator == 'notme') {
				otherReadyToEnd = 'Ready to End';
			}
		}
		
		if(meReadyToEnd == '') {
			viewOnly = false;
		}

		for(var i=0; i < currentDialog.messages.length; i++) {

			if(currentDialog.messages[i].sender == 'me') {
				dialog += '<p class="right">' + currentDialog.messages[i].content + '</p>';
				myMessageCount++;
			} else {
				var option = '';
				if(viewOnly == false) {
					option = ' <span class="crisis" id="'+ currentDialog.messages[i].messageId +'">&#9878;</span>';
				}
				dialog += '<p class="left">' + currentDialog.messages[i].content + option + '</p>';
				othersMessageCount++;
			}

		}

		var html = `<div style="position: absolute; padding: 10px;
				border: #fff; border-style: solid; border-width: 5px;
				background: #0a120a; margin-left: 10%; margin-right: 10%;
				min-height: 80%; min-width: 80%" id="dialogFrame">
				<div class="table">
				<div class="top">
				<center>
					<h3>${currentDialog.topic}</h3>
				</center>
				</div>
				<div class="middle">
				<div style="text-align: justify; text-justify: inter-word;" id="c1">
				<b>Others opinion:</b><br>${opinion1}<br><br><b>Messages:</b> ${othersMessageCount} of ${maxMessages}<br><br><b>${otherReadyToEnd}</b></div>
				<div style="padding-left: 30px; padding-right: 30px;" id="c2">${dialog}</div>
				<div style="text-align:justify; text-justify:inter-word;" id="c3">
				<b>My opinion:</b><br>${opinion2}<br><br><b>Messages:</b> ${myMessageCount} of ${maxMessages}<br><br><b>${meReadyToEnd}</b></div>
				</div>
		`;

		if(currentDialog.status == 'ACTIVE') {

			if(viewOnly) {
				html += `
					<div style="bottom: 10px; position: absolute; min-width: 98%">
					<center>
					<form id="dialogFrame">
					<input type="button" value="close window" name="close window" id="dialogClose">
					</form>
			   		</center>
					</div>
				`;
			} else {
				html += `
					<div style="bottom: 10px; position: absolute; min-width: 98%">
					<center>
					<form id="dialogFrame">
					<input type="text" name="message" size="120" id="dialogInput">
					<input type="submit" name="send" value="send">
					<input type="button" value="close window" name="close window" id="dialogClose">
					</form>
					</center>
					</div>
				`;
			}

			jQuery(document).one('click', "#dialogClose", function(event) {
				dialogFormOpen = 0;
				jQuery('#misc').empty();
				event.preventDefault();
			});

		} else if(currentDialog.status == 'PENDING') {

			if(currentDialog.initiator == 'me') {
				html += `
					<div style="bottom: 10px; position: absolute; min-width: 98%">
						<center>
							Please wait for the other to accept the dialog.
							<input type="button" value="close window" name="close window" size="120" id="dialogClose">
			   			</center>
					</div>
				`;
				jQuery(document).one('click', "#dialogClose", function(event) {
					dialogFormOpen = 0;
					jQuery('#misc').empty();
					event.preventDefault();
				});

			} else {

				html += `
					<div style="bottom: 10px; position: absolute; min-width: 98%">
						<center id="actionSpace">
							<input type="button" value="accept dialog" name="accept dialog" size="120" id="dialogAccept">
							<input type="button" value="ask me later" name="accept dialog" size="120" id="dialogCloseWindow">
							<input type="button" value="reject" name="accept dialog" size="120" id="dialogReject">
			   			</center>
					</div>
				`;

				jQuery(document).one('click', "#dialogAccept", function(event) {
					jQuery('center#actionSpace').html(`
						<form id="dialogFrame">
						<input type="text" name="message" size="120" id="dialogInput">
						</form>
					`);
					dpt.putDialog(currentDialog.dialog, "status", "ACTIVE");
					event.preventDefault();
				});

				jQuery(document).one('click', "#dialogCloseWindow", function(event) {
					dialogFormOpen = 0;
					jQuery('#misc').empty();
					event.preventDefault();
				});

				jQuery(document).one('click', "#dialogReject", function(event) {
					dialogFormOpen = 0;
					jQuery('#misc').empty();
					dpt.putDialog(currentDialog.dialog, "status", "CLOSED");
					event.preventDefault();
				});

			}

		} else if(currentDialog.status == 'CLOSED') {

			html += `
				<div style="bottom: 10px; position: absolute; min-width: 98%">
					<center>
						<b>This dialog is closed.</b>
						<input type="button" value="close window" name="close window" size="120" id="dialogCloseWindow">
		   			</center>
				</div>
			`;

			jQuery(document).one('click', "#dialogCloseWindow", function(event) {
				dialogFormOpen = 0;
				jQuery('#misc').empty();
				event.preventDefault();
			});

		}

		html += '</div></div>';
		
		jQuery('#misc').append(html);

		jQuery(document).one('submit', '#dialogFrame', function(event) {
			event.stopImmediatePropagation();
			event.preventDefault();
			var message = this[0].value;
			dpt.postMessage(message, whoami.dptUUID, currentDialog.dialog);
			jQuery("#dialogInput").focus();
		});

		jQuery(document).one('click', '.crisis', function(event) {
			crisisForm(this.id);
			event.stopImmediatePropagation();
			event.preventDefault();
		});

		jQuery("#dialogFrame").css({"background-color": "rgba(10,24,10, 0.9)"});

		jQuery(document).on('keyup', '#dialogInput', function(event) {
		    if (event.keyCode == 27) {
				jQuery('#misc').empty();
				event.preventDefault();
		    }
		});

		jQuery("#dialogInput").focus();
	}


	jQuery(document).on('click', 'span.inviteToDialog', function(event) {

		propositionForm(this.id);
		event.stopImmediatePropagation();
		event.preventDefault();

	});

	jQuery(document).on('mouseover', '.dialog', (event) => {

		jQuery(event.currentTarget).css({"background-color": "#1a221a"});
		jQuery(event.currentTarget.children[2]).css({"visibility": "visible", "line-height": "100%"});
		event.preventDefault();

	});

	jQuery(document).on('mouseout', '.dialog', (event) => {

		jQuery(event.currentTarget).css({"background-color": "#0a120a"});
		jQuery(event.currentTarget.children[2]).css({"visibility": "hidden", "line-height": "0%"});
		event.preventDefault();

	});

	jQuery(document).on('click', '.dialog', (event) => {

		currentDialog = jQuery(event.currentTarget).children('div.dialogInfo');
		currentDialog = JSON.parse(currentDialog[0].textContent);
		dpt.getDialog(currentDialog.dialog);
		event.stopImmediatePropagation();
		event.preventDefault();

	});

	jQuery('#main').height("100%").width("100%")
	.append('<div style="border-bottom-style: solid; border-bottom-width: 5px; border-color: #5a825a;">'
			+'<h1 style="letter-spacing: 30px">version 0.1</h1></div><div class="row">'
			+'<div class="col left"><h2>Topics</h2></div>'
			+'<div class="col mid"><h2>Opinions</h2></div>'
			+'<div class="col right"><h2>Dialogs</h2></div></div>');
	jQuery('div.col').css({float: "left", 'padding-left': "20px", height: "100%", 'overflow-y': "auto"});
	jQuery('div.col').css({ width: "30%", "max-width": "30%"});
	jQuery('div.row:after').css({content: "", display: "table", clear: "both"});

/*
			io('connection_timeout', function() {
				console.log('connection_timeout');
			});
			io('connection_error', function(e) {
				console.log('connection_error', e ? e : 'A unknown error occurred');
			});
			io('reconnect_error', function(e) {
				console.log('reconnect_error', e ? e : 'A unknown error occurred');
			});
			io('reconnect_attempt', function(n) {
				console.log('reconnect attempt: '+n);
			});
			io('reconnect_failed', function() {
				console.log('reconnect failed');
			});
			io('reconnect', function() {
				console.log('successful reconnected');
			});
			io('reconnect', function(n) {
				console.log('try to reconnect '+n);
			});
*/
});