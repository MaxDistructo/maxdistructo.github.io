// ==UserScript==
// @name         Blue's Script + Nazo's Additions
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Incorporates Blue's script in addition to some extra modifications and code. See comments below for more details.
// @author       Nazo
// @match        www.blankmediagames.com/Trial/*
// @include      https://blankmediagames.com/Trial/*
// @grant        none
// ==/UserScript==

/* Additional credits go to Bluewave41 */

// Thank you for everything you have done for Trial System, Blue.

/*

 FEATURES:
- DARK MODE!!! (There is a toggle for this; it's above the report area.)
- Automatic click-to-dupe functionality (previously from Blue's script).
- Re-added the graveyard and mafia/coven/vampire boxes. Also added role colors to the roles in the graveyard. (Not sure why this wasn't implemented before.)
- Added an actual skip button! It looks so amazing!
- A fix for that irritating bug that causes Trial System to not display certain leavers in the report.
- Hotkeys in lieu of clicking inno, guilty, or skip. Press Ctrl+B to toggle hotkeys.
- Too many other things to list... >_>

*/

var players;
//var player; //name of player eg 1. username (ign)
var reportedPlayerIgn; //reported player's in-game name
var reportedPlayerUsername; //reported player's account name
var reportIdNum; //report ID
var regex = /\b(Night|Day|n|d)\s?\d\d?/gi;
var scrolling = 0;
var backupTab = '<div style="border-bottom: 1px solid !important;float: none;margin-bottom: initial;padding-bottom: 25px;"><span class="riheader info" style="display: inline-block; width: 45%;">Report Details</span><span class="graveyard riheader" style="float: right; display: inline-block; width: 45%;">Graveyard</span></div><div id="graveyardContent"></div>';
var graveyard;
var dayIndexes;
var emphasize = [];
var clicked = 0;
var coven = true;
var will = 0;
var username = 0;
var hotkeysOn;
var isCtrlActive = false;

var isRoleMafia = function(role){
    role = removePlural(role);
    switch(role){
        case "Blackmailer":
        case "Consigliere":
        case "Consort":
        case "Disguiser":
        case "Framer":
        case "Janitor":
        case "Godfather":
        case "Mafioso":
        case "Forger":
        case "Ambusher":
        case "Hypnotist":
            return true;
            break;

        default:
            return false;
            break;
    }
}

var removePlural = function(role){
    var test = role.substr(-1);
    if(isNaN(test)){
        return role;
    }
    return removePlural(role.substr(0, role.length - 1));
}

var isRoleCoven = function(role){
    switch(role){
        case "HexMaster":
        case "Poisoner":
        case "Potion Master":
        case "Medusa":
        case "Necromancer":
        case "Coven Leader":
            return true;
            break;

        default:
            return false;
            break;
    }
}

function isRoleTown(role) {
    role = removePlural(role);
    switch(role) {
        case "Investigator":
        case "Lookout":
        case "Psychic":
        case "Sheriff":
        case "Spy":
        case "Tracker":
        case "Jailor":
        case "Vampire Hunter":
        case "Veteran":
        case "Vigilante":
        case "BodyGuard":
        case "Doctor":
        case "Crusader":
        case "Trapper":
        case "Escort":
        case "Mayor":
        case "Medium":
        case "Retributionist":
        case "Transporter":
            return true;
            break;

        default:
            return false;
            break;
    }
}


function addGlobalStyle(css) {
    var head, style;
    head = document.getElementsByTagName('head')[0];
    if (!head) { return; }
    style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = css;
    head.appendChild(style);
}

Trial.loadStage = function(step,input,callback){
    $.ajax({
        type: "POST",
        url: "./loadingStages.php",
        data: { step: step, input: input },
        dataType: "JSON",
        timeout: 5000,
        success: function(data){
            if(data !== false){
                callback(data);
                if (data.players !== undefined) {
                    players = data.players;
                }
            }else{
                Modal.open("There was an error loading the report. Please refresh or try again later.");
            }
        },
        error: function(x, t, m){
            Modal.open("There was an error loading the report. Please refresh or try again later.");
        }
    });
}



// === BUTTON SCRIPTS ===

/* Bypasses the confirmation boxes and modals to move onto the next report faster. */

Trial.submitVote = function(vote,callback){
    var cv = (vote == "g") ? "guilty" : "innocent";
    /*if(!confirm("Are you sure you wish to vote "+cv+"?")){
        callback(false);
		return;
    }*/
    $.ajax({
        type: "POST",
        url: "./submitVote.php",
        data: { input: vote },
        dataType: "JSON",
        timeout: 5000,
        success: function(data){
            if(data !== false){
                callback(data);
                if ($("p#modalMessage").text() == "Your vote has been received. Thanks!") {
                    $('#modal').click();
                }
            }else{
                Modal.open("There was an error loading the report. Please refresh or try again later.");
            }
        },
        error: function(x, t, m){
            Modal.open("There was an error loading the response from your vote. Sorry!");
            callback(false);
        }
    });
}

function voteGuilty() {
    $('#guilty').click();
    //console.log("Guilty'd.");
}
function voteInno() {
    $('#inno').click();
    //console.log("Inno'd.");
}

Trial.excludeReport = function(rid,skipped,callback) {
    if (!skipped){
        //console.log("Exclude skipped. ("+skipped+")");
        console.log("Voted on "+rid+".");
        callback()
        return;
    }
    //console.log("Excluding "+rid);
    $.ajax({
        type: "POST",
        url: "./excludeReport.php",
        data: { rid: rid },
        dataType: "JSON",
        timeout: 5000,
        success: function(data){
            //console.log("Excluded "+rid);
            console.log("Skipped report "+rid);
            callback();
        },
        error: function(x, t, m){
            console.log("Failed excluding "+rid);
            callback();
        }
    });
}

// Skips the current report
function skipReport() {
    document.getElementById('skipperlink').click();
    //console.log("Skipped.");
}

customInit();
// Starts up script functions when the report fully loads in
$(document).ready(function() {
    $('#welcomeContinue').click(function(e){
        Trial.welcome(true,function(){startLoadingSequence();});
    });

    if(window.location.href.includes("viewReport")) {
        setupReport();
    }
    else {
        addSkipButton();
        document.getElementsByClassName("riheader")[2].textContent = "Vote on this report:";
    }
});

$(document).on('DOMNodeInserted', 'span#loadingMessage:contains(Waiting for user...)', function() {
    colorLinks("#27bfff");
});

$(":not(select#dupPlayer), :not(select#dupReason), :not(input#dupLocation)").keyup(function(e) {
    if (e.which == 17) isCtrlActive = false;
}).keydown(function(e) {
    if (e.which == 17) isCtrlActive = true;
    if (isCtrlActive == true) {
        if (e.which == 66) {
            if (hotkeysOn != true) {
                hotkeysOn = true;
                console.log("Hotkeys activated.");
            } else {
                hotkeysOn = false;
                console.log("Hotkeys deactivated.");
            }
            toggleHotkeys(hotkeysOn);
            //toggleTheme(hotkeysOn);
            isCtrlActive = false;
            return;
        }
        /*if (e.which == 84) {
            if (defaultMode != true) {
                defaultMode = true;
                console.log("Enjoy doing reports blind. Default theme activated.");
            } else {
                defaultMode = false;
                console.log("The true way to do reports. Dark theme activated.");
            }
            toggleHotkeys(defaultMode);
            isCtrlActive = false;
            return;
        }
        */
    }
});

function hotkeys(f) {
    if (hotkeysOn == true && $("select#dupPlayer, select#dupReason, input").is(':focus') == false) {
        switch (f.keyCode) {
            case 71:
                voteGuilty();
                break;
            case 73:
                voteInno();
                break;
            case 83:
                skipReport();
                break;
            default:
                break;
        }
    }
}

function toggleHotkeys(hotkeys) {
    hotkeys = (hotkeys == true) ? "activated. Vote safely!" : "deactivated.";
    Modal.open("Hotkeys have been "+hotkeys);
}

function changeTheme() {
    if (localStorage.getItem('theme') == 'dark') {
        defaultTheme();
        Modal.open("Enjoy doing reports blind. Default theme has been activated.");
        localStorage.setItem('theme', 'default');
    } else {
        darkTheme();
        Modal.open("The true way to do reports. Dark theme has been activated.");
        localStorage.setItem('theme', 'dark');
    }
}

document.addEventListener('keyup', hotkeys, false);
document.getElementById("toggleTheme").addEventListener('click', changeTheme, false);
//document.addEventListener('keyup', theme, false);

function addSkipButton() {
    var style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = '.blue-btn-plain {font-weight: normal !important;color: #FFFFFF;cursor: pointer;font-size: 21px !important;margin-bottom: 0;border-width: 1px;line-height: 32px;text-align: center;border-radius: 6px;border-image: none;border-style: solid;text-decoration: none !important;display: inline-block;vertical-align: middle;background-color: #24aae6;background-repeat: repeat-x;padding: 11px 10px 11px 10px;text-shadow: 0 -1px 0 rgba(0, 0, 0, 0.25);background-image: linear-gradient(to bottom, #27bafc, #2390bf);border-color: rgba(0, 0, 0, 0.1) rgba(0, 0, 0, 0.1) rgba(0, 0, 0, 0.25);box-shadow: 0 1px 0 rgba(255, 255, 255, 0.2) inset, 0 1px 2px rgba(0, 0, 0, 0.05);}.blue-btn-plain:hover,.blue-btn-plain:focus,.blue-btn-plain:active {font-weight: normal !important;color: #FFFFFF;background-color: #2390bf;}.blue-btn-plain:hover,.blue-btn-plain:focus{font-weight: normal !important;text-decoration: none;background-position: 0 -15px;transition: background-position 0.1s linear 0s;-webkit-transition: background-position 0.1s linear 0s;}.blue-btn-plain:active {font-weight: normal !important;outline: 0 none;padding: 12px 11px 10px 9px;background-image: none;box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15) inset, 0 1px 2px rgba(0, 0, 0, 0.05);}.blue-btn-plain:focus {font-weight: normal !important;outline-offset: -3px;outline: thin dotted #333333;}.blue-btn-plain-small {font-weight: normal !important;color: #FFFFFF;cursor: pointer;font-size: 21px !important;margin-bottom: 0;border-width: 1px;line-height: 32px;text-align: center;border-radius: 6px;border-image: none;border-style: solid;text-decoration: none !important;display: inline-block;vertical-align: middle;background-color: #24aae6;background-repeat: repeat-x;padding: 5px 10px 5px 10px;text-shadow: 0 0 6px #000;background-image: linear-gradient(to bottom, #27bafc, #2390bf);border-color: rgba(0, 0, 0, 0.1) rgba(0, 0, 0, 0.1) rgba(0, 0, 0, 0.25);box-shadow: 0 1px 0 rgba(255, 255, 255, 0.2) inset, 0 1px 2px rgba(0, 0, 0, 0.05);}.blue-btn-plain-small:hover,.blue-btn-plain-small:focus,.blue-btn-plain-small:active {font-weight: normal !important;color: #FFFFFF;background-color: #2390bf;}.blue-btn-plain-small:hover,.blue-btn-plain-small:focus{font-weight: normal !important;text-decoration: none;background-position: 0 -15px;transition: background-position 0.1s linear 0s;-webkit-transition: background-position 0.1s linear 0s;}.blue-btn-plain-small:active {font-weight: normal !important;outline: 0 none;padding: 6px 11px 4px 9px;background-image: none;box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15) inset, 0 1px 2px rgba(0, 0, 0, 0.05);}.blue-btn-plain-small:focus {font-weight: normal !important;outline-offset: -3px;outline: thin dotted #333333;}';
    document.getElementById('skipperlink').appendChild(style);
    document.getElementById('skipperlink').className = 'blue-btn-plain-small';
}

function colorLinks(hex) {
    var links = $("a").not("a#inno, a#guilty, a#skipperlink");
    for (var i=0;i<links.length;i++) {
        links[i].style.color = hex;
    }
}

/* Re-adds the usernames to the leaver messages that only say "has left the game." */
function addNamesToLeavers() {
    var namelessNotices = $("span.time.night:contains(Night 1)").prevUntil("span.stage:contains(Players are choosing names)", "span.notice:contains( has left the game.)").filter(function() {
        return $(this).text().indexOf(" has left the game.")==0;
    }).get();
    var missingNames = [];
    var n = 0;
    if (namelessNotices.length != 0) {
        for (var i=0; i<players.length; i++) {
            var namesWithNotices = $("span.time.night:contains(Night 2)").prevUntil("span.stage:contains(Players are choosing names)", "span.notice:contains("+players[i].ign+")");
            if ( (namesWithNotices.length == 1) && (namesWithNotices[0].textContent == players[i].ign + " has been killed.")) {
                namelessNotices[n].textContent = players[i].ign + " has left the game.";
                n++;
                //console.log(players[i].ign+" did leave, so append name to leave notice. Times they came up in notice is: " + namesWithNotices.length)
                missingNames.push(players[i].ign);
            } else {
                //console.log("Either "+players[i].ign+" was killed or didn't die. " + namesWithNotices.length)
            }
        }
    }
    else {
        //console.log("No unknown leavers were found.");
    }
}

/* ====== BLUE'S SCRIPT ====== */
// Credits for the below tools go to Bluewave41.

/*Returns a player's username given their in-game name*/
function usernameFromIGN(ign) {
    for(var x=0;x<players.length;x++) {
        if(players[x].ign == ign)
            return players[x].username;
    }
}

function getRoleFromName(ign) {
    if(!players)
        players = data;
    for(var x=0;x<players.length;x++) {
        if(players[x].ign == ign)
            return players[x].role;
    }
}

/*Adds the players role beside their votes*/
function addRolesToVotes() {
    var votes = $('.notice:contains(abstained), .notice:contains(guilty), .notice:contains(innocent)').filter(':not(.death)').filter(':not(:contains("attacked"))');
    for(var x=0;x<votes.length;x++) {
        var name = votes[x].innerText.replace("voted", "").split(" ").slice(0, -1).join(" ").trim();
        $(votes[x]).append(' (' + getRoleFromName(name) + ')');
    }
}

function checkForWill() {
    var wills = $('[data-type="will"]'); //get each displayed will
    for(var i = 0; i < wills.length; i++) {
        var decoded = atob(wills[i].getAttribute("data-info")); //will data is stored in base64 so decode it first
        var name = decoded.substring(decoded.indexOf(">")+1, decoded.indexOf("(")); //get name of person who wrote will
        if(name == reportedPlayerIgn) { //if the person who wrote that will matches the name of reported player
            will = wills[i];
            $('#will').prop('disabled', false);
            return;
        }
    }
    $('#will').prop('disabled', true);
}

/*Appends each players role to their death in the chat area*/
function rolesOnDeath() {
    var deaths = $('.death:not(:contains("checked"), :contains("investigated"))');
    for(var i = 0; i < deaths.length; i++) { //loop through them all
        var line = deaths.eq(i).text();
        if(line.includes('has been')) {
            line = line.substring(0, line.indexOf("has been")-1);
            deaths[i].innerHTML += " Their role was " + getRoleFromName(line) + '.';
        }
    }
}

/*Shows the players role on a new line*/
function addRole() {
    $('#role').text(getRoleFromName(reportedPlayerIgn));
}

/*Sets the vampire and death buttons status if necessary for that report*/
function checkButtons() {
    if(reportedPlayerUsername) {
        $('.Vampire.vampire:contains('+reportedPlayerIgn+')').length ? $('#vampireButton').prop('disabled',false) : $('#vampireButton').prop('disabled', true);
        $(".notice:contains('Their role was "+$('#role').text()+"')") ? $('#deathButton').prop('disabled',false) : $('#deathButton').prop('disabled', true);
        $(".notice:contains("+reportedPlayerIgn+" has remembered)").length ? $('#amnesiacButton').prop('disabled',false) : $('#amnesiacButton').prop('disabled', true);
    }
}

/*Sets duplicate box to the players username if a chat message is clicked on*/
function attachUsernamesToMessage() {
    var a = $('#reportContent span').not('.stage, .notice, .time, .note, .whisper');
    a.each(function() {
        $(this).click(function() {
            $('#dupReason').prop('selectedIndex', 0);
            $('#dupPlayer').val($(this).attr("class").split(" ")[0]);
            $('#dupLocation').val($(this).prevAll('.time, .stage').not(':contains("names"), :contains("Defense"), :contains("Judgement")').eq(0).text());
        });
    });

    var whispers = $('.whisper');
    whispers.each(function() {
        $(this).click(function() {
            $('#dupReason').prop('selectedIndex', 0);
            $('#dupPlayer').val($(this).attr("class").split(" ")[2]);
            $('#dupLocation').val($(this).prevAll('.time, .stage').not(':contains("names"), :contains("Defense"), :contains("Judgement")').eq(0).text());
        });
    });

    var leaves = $('.notice:contains("has left the game.")');
    leaves.each(function() {
        $(this).click(function() {
            var text = $(this).text();
            text = text.substring(0, text.indexOf('has left the game')-1);
            $('#dupPlayer').val(usernameFromIGN(text));
            $('#dupReason').val(7); //leaving
            $('#dupLocation').val($(this).prevAll('.time, .stage').not(':contains("names"), :contains("Defense"), :contains("Judgement")').eq(0).text());
        });
    });

    var votes = $('.notice:contains("voted"), .notice:contains("abstained")');
    votes.each(function() {
        $(this).click(function() {
            $('#dupReason').prop('selectedIndex', 0);
            var text = $(this).text();
            if(text.includes('abstained')) {
                text = text.substring(0, text.indexOf('abstained')-1);
            }
            else {
                text = text.substring(0, text.indexOf('voted')-1);
            }
            text = usernameFromIGN(text);
            $('#dupPlayer').val(text);
            $('#dupLocation').val($(this).prevAll('.time, .stage').not(':contains("names"), :contains("Defense"), :contains("Judgement")').eq(0).text());
        });
    });
}

/*Parses description for tags in the form of day x, night x, dx or nx to auto scroll to their position*/
function parseDescription() {
    $('.reportDescription').unbind('click');
    var newDetails = $('.reportDescription').html().replace(regex, "<span style='color: red' class='goto' data-id='$&'>$&</span>");
    $('.reportDescription').html(newDetails);
    $('.reportDescription').on('click', '.goto', function(){
        if($(this).data('id').length < 3) {
            if($(this).data('id')[0] == 'n' || $(this).data('id')[0] == 'N')
                scrollTo($('#reportContent'), 'night' + $(this).data('id').slice(-1));
            else if($(this).data('id')[0] == 'd' || $(this).data('id')[0] == 'D')
                scrollTo($('#reportContent'), 'day' + $(this).data('id').slice(-1));
        }
        else
            scrollTo($('#reportContent'), $(this).data('id').replace(/\s/g, '').toLowerCase());
    });
}

/*Gets and stores the reported players name and IGN*/
function setNames() {
    var player = $('.reportedPlayer').eq(0).text(); //name of player eg 1. username (ign)
    reportedPlayerIgn = player.substring(player.indexOf("(")+1, player.indexOf(")")); //cut off the number and (ign) pieces
    reportedPlayerUsername = player.split(" ")[1]; //reported player's username
}

function config() {
    var config = {
        colorWhispersTo: "#87CEFA",
        colorWhispersFrom: "#87CEFA",
        jailorColor: "#ADFF2F",
        mayorColor: "#B8860B",
        leaveColor: "#00DDFF",
        filterColor: "#FF0000"
    }
    var keys = Object.keys(config);
    for(var x=0;x<keys.length;x++) {
        if(localStorage.getItem(keys[x]) == null) {
            localStorage.setItem(keys[x], config[keys[x]]);
        }
    }
    if(!localStorage.getItem("stopOther"))
        localStorage.setItem("stopOther", false);
    if(localStorage.getItem('theme') == 'dark')
        darkTheme();

    if(localStorage.getItem("deferDuplicate") == 'true') {
        $('#dupReportButton').off('click');
        $('#dupReportButton').click(function() {
            let drid = $('.reportId').text(); //always set
            let dp = $('#dupPlayer').val();
            let dr = $('#dupReason').val();
            let dd = $('#dupLocation').val();
            let id = duplicates.length;
            if(dp != '' && dr != -1) {
                duplicates.push({drid: drid, dp: dp, dr: dr, dd: dd, reportID: id});
                Modal.open('Report added to queue!');
            }
        });
        //Panel.addTab(["Reports", "Reports", "duplicate.php", "reports"]);
    }
}

function darkTheme() {
    const fades = $('#banner, #mainContent, body, #reportInfo, #otherReports, #duplicateReports, #judgementArea, #boxes, #mafia, #vampire, #container, #buttons, #filter, #graveyard');
    fades.each(function() {
        $(this).animate({
            backgroundColor: "rgb(39, 44, 48)",
            color: "rgb(230,230,230)",
            borderColor: "rgb(153, 170, 181)"
        });
    })
    $('#filter').css({ background: "-webkit-gradient(linear, left top, left bottom, color-stop(0%,#676767), color-stop(10%,#353535), color-stop(100%,#353535))" });
    $('.filterColumn .filterOption:nth-child(2n), .filterColumn:nth-child(3) .filterOption:nth-child(2n-1)').css( "background-color", "rgba(255, 255, 255, 0.05) important" );
    $('.filterColumn:nth-child(3) .filterOption:nth-child(2n)').css( "background-color", "rgba(0,0,0,0)" );
    $('#filterSlider').css( "box-shadow", "0 -5px 5px #1e1e1e" );
    $('a:not(#inno):not(#guilty):not(#skipperlink)').css({ color: "#27bfff" });
    $('#reportContent').css("background", "#000 url('https://i.imgur.com/F58u0lS.png') bottom right scroll");
}

function defaultTheme() {
    var fades = $('#banner, #mainContent, #reportInfo, #otherReports, #duplicateReports, #judgementArea, #boxes, #mafia, #vampire, #container, #buttons, #filter, #graveyard');
    fades.each(function() {
        $(this).animate({
            backgroundColor: "rgb(255, 255, 255)",
            color: "black",
            borderColor: "black"
        });
    })
    $('body').animate({
        backgroundColor: "#999"
    });
    $('#filter').css({ background: "-webkit-gradient(linear, left top, left bottom, color-stop(0%,#ffffff), color-stop(10%,#cacaca), color-stop(100%,#cacaca))" });
    $('.filterColumn .filterOption:nth-child(2n), .filterColumn:nth-child(3) .filterOption:nth-child(2n-1)').css( "background-color", "rgba(0, 0, 0, 0.05)" );
    $('.filterColumn:nth-child(3) .filterOption:nth-child(2n)').css( "background-color", "rgba(0,0,0,0)" );
    $('#filterSlider').css( "box-shadow", "0 -5px 5px #858585" );
    $('a:not(#inno):not(#guilty):not(#skipperlink)').css({ color: "-webkit-link" });
    $('#reportContent').css("background", "#000 url('http://www.blankmediagames.com/Trial/images/reportBGh500.png') bottom right scroll");
}

function customInit() {
    //createTabs(tabs);
    //multiFocus();
    var elem = $('#duplicateReports').detach();
    $('#reportInfo').after(elem);
    //specialTools();
    newComponents();
    config();
    if(window.location.href.includes("viewReport")) { //mostly used for judges
        players = data.players;
        //setupReport();
        $('.filterBody').empty();
        Trial.populateFilter(data);
    }
}

/*Populates mafia, vampire and coven boxes*/
function fillBoxes() {
    var boxData = '';
    if(!coven) {
        boxData += '<div id="switch" class="rititle">Vampire</div>';
        for(var x=0;x<players.length;x++) {
            var player = players[x];
            if(player.role.replace(/[0-9]/g, '') == "Vampire") {
                boxData += "<div style=\"font-size: 12px\"><span class=\"rititle\">"+player.role+": </span>"+player.slot+'. '+player.ign+"</div>";
            }
        }
    }
    else if(coven) {
        boxData += '<div id="switch" class="rititle">Coven</div>';
        for(var x=0;x<players.length;x++) {
            var player = players[x];
            if(isRoleCoven(removePlural(player.role))) {
                boxData += "<div style=\"font-size: 12px\"><span class=\"rititle\">"+player.role+": </span>"+player.slot+'. '+player.ign+"</div>";
            }
        }
    }
    $('#vampire').html(boxData);
    $('#switch').click(function() {
        coven = !coven;
        fillBoxes();
    });
}

function fillMafia() {
    $('#mafia').html('');
    $('#mafia').append('<div class="rititle">Mafia</div>');
    for(var x=0;x<players.length;x++) {
        var player = players[x];
        if(isRoleMafia(player.role)) {
            $('#mafia').append("<div style=\"font-size: 12px\"><span class=\"rititle\">"+player.role+": </span>"+player.slot+'. '+player.ign+"</div>");
        }
    }
}

function populateGraveyard() {
    graveyard = [];
    dayIndexes = [];
    var day;
    $(".day, .death, .revived").each(function(){
        let item = $(this);
        if(item.attr('class') === "time day") { //handle day numbers
            day = parseInt(item.text().substring(4));
            graveyard[day] = (day == 1) ? [] : graveyard[day-1].slice();
            dayIndexes.push(item.position().top-165);
        }
        else if(item.attr('class').includes("revived")) { //handle retributionist revives
            var name = item.text().substring(0, item.text().indexOf(" has been"));
            for(var x=0;x<graveyard[graveyard.length-1].length;x++) {
                if(graveyard[graveyard.length-1][x].includes(name)) {
                    graveyard[graveyard.length-1].splice(x, 1);
                    break;
                }
            }
        }
        else { //handle actual deaths
            var role = item.text().substring(item.text().trim().lastIndexOf("was")+4, item.text().length-1);
            role = removePlural(role);
            //console.log(item);
            //console.log(item.text());
            //console.log(item.text().substring(item.text().trim().lastIndexOf(" ")+1, item.text().length-1));
            if(isRoleTown(role)) //color it green
                role = '<span>(</span><span style="color: #45BF00">'+role+'</span><span>)</span>';
            else if(isRoleMafia(role))
                role = '<span>(</span><span style="color: #DD0000">'+role+'</span><span>)</span>';
            else if(isRoleCoven(role))
                role = '<span>(</span><span style="color: #BF5FFF">'+role+'</span><span>)</span>';
            else if(removePlural(role) == "Witch")
                role = '<span>(</span><span style="color: #BF5FFF">'+role+'</span><span>)</span>';
            else if(removePlural(role) == "SerialKiller")
                role = '<span>(</span><span style="color: #000080">'+role+'</span><span>)</span>';
            else if(removePlural(role) == 'Arsonist')
                role = '<span>(</span><span style="color: #EE7600">'+role+'</span><span>)</span>';
            else if(removePlural(role) == 'Amnesiac')
                role = '<span>(</span><span style="color: #4FF0E8">'+role+'</span><span>)</span>';
            else if(removePlural(role) == 'Survivor')
                role = '<span>(</span><span style="color: #C8C800">'+role+'</span><span>)</span>';
            else if(removePlural(role) == 'Pirate')
                role = '<span>(</span><span style="color: #DBAD59">'+role+'</span><span>)</span>';
            else if(removePlural(role) == 'Werewolf')
                role = '<span>(</span><span style="color: #744A26">'+role+'</span><span>)</span>';
            else if(removePlural(role) == 'Plaguebearer')
                role = '<span>(</span><span style="color: #Cfff63">'+role+'</span><span>)</span>';
            else if(removePlural(role) == 'Executioner')
                role = '<span>(</span><span style="color: #ACACAC">'+role+'</span><span>)</span>';
            else if(removePlural(role) == 'Jester')
                role = '<span>(</span><span style="color: #F49FD0">'+role+'</span><span>)</span>';
            else if(removePlural(role) == 'Juggernaut')
                role = '<span>(</span><span style="color: #631A35">'+role+'</span><span>)</span>';
            else if(removePlural(role) == "Vampire")
                role = '<span>(</span><span style="color: #7B8867">'+role+'</span><span>)</span>';
            else if(removePlural(role) == "Guardian Angel")
                role = '<span>(</span><span style="color: white; text-shadow: -0.5px 0 #272C30, 0 0.5px #272C30, 0.5px 0 #272C30, 0 -0.5px #272C30;">'+role+'</span><span>)</span>';
            else {
                role = '<span>(</span><span>'+role+'</span><span>)</span>';
            }
            var div = '<div>'+item.text().substring(0, item.text().indexOf(" has been")) + " " + role + '</div>';
            graveyard[day].push(div);
        }
    })
}

function newComponents() {
    header(); //add header
    showGraveyard();
    graveyardTab();
    mafiaVampireBoxes(); //add mafia and vampire boxes
    $('.reportDescription').closest("div").eq(0).after('<div><span class="rititle">Left: </span><span id="left"></span></div>');
    //$('#left').closest("div").eq(0).after('<div><span class="rititle">AFK count: </span><span id="afkcount"></span></div>');
    $('.reportedPlayer').closest("div").eq(0).after('<div><span class=\"rititle\">Role: </span><span id=\"role\"></span></div>'); //add role row
    addButtonsContainer();
    willButton();
    deathButton();
    vampireButton();
    amnesiacButton();
}

function addButtonsContainer() {
    $('#filterSlider').after('<div id="buttons"></div>');
}

/*Adds in the header to show that the script has loaded correctly*/
function header() {
    $('#banner h1').append(" Addons v2.0");
    $('#banner').append('</br>Press Ctrl+B to toggle hotkeys for voting/skipping.</br>');
    //$('#banner').append('<label for="switchTheme">Dark Theme </label><input type="checkbox" id="toggleTheme" />');
    if (localStorage.getItem('theme') == 'dark') {
        $('#banner').append('<label class="switch"> <input type="checkbox" checked id="toggleTheme"> <span class="slider round"></span> </label>');
    } else {
        $('#banner').append('<label class="switch"> <input type="checkbox" id="toggleTheme"> <span class="slider round"></span> </label>');
    }
    $('#banner h2').append('</br>Toggle between Vampire and Coven members by clicking on the box.</br>');
    $('#banner').append('<style>.switch { position: relative; display: inline-block; width: 60px; height: 34px; } .switch input {display:none;} .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; -webkit-transition: .4s; transition: .4s; } .slider:before { position: absolute; content: ""; height: 26px; width: 26px; left: 4px; bottom: 4px; background-color: white; -webkit-transition: .4s; transition: .4s; } input:checked + .slider { background-color: #2196F3; } input:focus + .slider { box-shadow: 0 0 1px #2196F3; } input:checked + .slider:before { -webkit-transform: translateX(26px); -ms-transform: translateX(26px); transform: translateX(26px); content: ""; } /* Rounded sliders */ .slider.round { border-radius: 34px; } .slider.round:before { border-radius: 50%; }</style>');
}

/*Overwritten scrollTo event since original didnt suit needs (honestly have no clue why this works or what it does)*/
function scrollTo(elem,pos,callback){
    if(window.skipped == true){
        window.skipped == false;
        return;
    }
    if(isNaN(pos)){
        if(pos && pos instanceof jQuery){
            elem.animate({scrollTop: $('#reportContent').scrollTop()+pos.position().top-600}, 1000, function(){
                if(callback && {}.toString.call(callback) === '[object Function]'){
                    callback();
                }
            });
        }else{
            var iid = pos;
            var type = iid.substr(0,1);
            var d = iid.replace(/[^0-9]/ig,"");
            var n = (type=="n") ? 2*d: 2*d-1;
            elem.animate({scrollTop: elem.scrollTop()+$('.time:eq('+(n-1)+')').position().top - elem.parent().position().top}, 1000, function(){
                if(callback && {}.toString.call(callback) === '[object Function]'){
                    callback();
                }
            });
        }
    }else{
        elem.animate({scrollTop: pos}, 1000, function(){
            if(callback && {}.toString.call(callback) === '[object Function]'){
                callback();
            }
        });
    }
}

/*Increases screen length and shows the graveyard on screen*/
function showGraveyard() {
    let reportContent = $('#reportContent');
    if(isNaN(pos)){
        if(pos && pos instanceof jQuery){
            elem.animate({scrollTop: $('#reportContent').scrollTop()+pos.position().top-600}, 1000, function(){
                if(callback && {}.toString.call(callback) === '[object Function]'){
                    callback();
                }
            });
        }else{
            var iid = pos;
            var type = iid.substr(0,1);
            var d = iid.replace(/[^0-9]/ig,"");
            var n = (type=="n") ? 2*d: 2*d-1;
            elem.animate({scrollTop: elem.scrollTop()+$('.time:eq('+(n-1)+')').position().top - elem.parent().position().top}, 1000, function(){
                if(callback && {}.toString.call(callback) === '[object Function]'){
                    callback();
                }
            });
        }
    }else{
        elem.animate({scrollTop: pos}, 1000, function(){
            if(callback && {}.toString.call(callback) === '[object Function]'){
                callback();
            }
        });
    }
}

/*Increases screen length and shows the graveyard on screen*/
function showGraveyard() {
    let reportContent = $('#reportContent');
    //populateGraveyard();
    /*Add scroll event and start timer for scrolling*/
    reportContent.bind('scroll', function() {
        if(!scrolling) {
            scrolling = true;
            var scrollPos = $(this).scrollTop();
            for(var x=0;x<dayIndexes.length-1;x++) {
                if(scrollPos > dayIndexes[x] && scrollPos < dayIndexes[x+1]) {
                    $('#graveyardContent').html(graveyard[x+1].join("\n"));
                    return;
                }
            }
            if(scrollPos > dayIndexes[dayIndexes.length-1])
                $('#graveyardContent').html(graveyard[graveyard.length-1].join("\n"));
        }
    })
}

function graveyardTab() {
    let text = $('#reportInfo .riheader');
    text.css({"color":"green"}).addClass('info').addClass('active');
    text.parent().css({"border-bottom":"1px solid", "float":"none", "margin-bottom":"initial", "padding-bottom":"25px"});
    text.after('<span class="graveyard riheader" style="float: right">Graveyard</span>');

    $('body').on('click', '.info', function() {
        if(!$(this).hasClass('active')) {
            let info = $('#reportInfo');
            let tab = info.html();
            $('.info').addClass('active');
            info.html(backupTab);
            backupTab = tab;
            $('.graveyard').removeClass('active');
        }
    });

    $('body').on('click', '.graveyard', function(e) {
        if(!$(this).hasClass('active')) {
            let info = $('#reportInfo');
            let tab = info.html();
            $('.info').removeClass('active');
            info.html(backupTab);
            backupTab = tab;
            $('#graveyardContent').height(graveyard[graveyard.length-1].length*25);
            $('.graveyard').addClass('active');
            $('.graveyard').css({"color":"rgb(0, 128, 0) !important"});
        }
    });
}

//addGlobalStyle('#reportContent .notice { color: #3ED73E; background: none !important; }');
addGlobalStyle('#reportInfo span.riheader.info, #reportInfo span.graveyard.riheader { display: inline-block !important; width: 50% !important; /*border: 1px solid;*/ }');
addGlobalStyle('span.graveyard.riheader { float: right !important; font-weight: bold; vertical-align: top; }');
addGlobalStyle('span.riheader.info { float: left !important; font-weight: bold; vertical-align: top; }');
addGlobalStyle('div#boxes { clear: both; float: right; width: 400px; margin: 0 10px 10px; display: flex; border: 1px solid; flex: 1; }');
addGlobalStyle('span#mafia { flex: 1; clear: both; width: 200px; vertical-align: top; display: flex; flex-direction: column; float: left; border: 1px solid; border-bottom: unset; border-top: unset; border-left: unset; position: relative; }');
addGlobalStyle('span#vampire { flex: 1; clear: both; width: 200px; vertical-align: top; display: flex; flex-direction: column; float: left; border: 1px solid; border-bottom: unset; border-top: unset; border-right: unset; border-left: unset; text-align: center; position: relative; }');
addGlobalStyle('div.rititle { border-bottom: 1px solid; margin-left: unset; text-align: center !important; }');
addGlobalStyle('div#switch { clear: both !important; width: 200px !important; vertical-align: top !important; display: block !important; text-align: center !important; float: right; }');
addGlobalStyle('#mafia, #vampire > div { text-align: left; word-wrap: break-word; }');


/*Adds mafia and vampire boxes to the screen*/
function mafiaVampireBoxes() {
    $('#reportInfo').after("<div id=\"boxes\"><span id=\"mafia\"><div class=\"rititle\">Mafia</div></span><span id=\"vampire\"><div class=\"rititle\">Vampires</div></span></div>");

    /*if(!$('#otherReports').length) {
        $('#reportInfo').after("<div id=\"boxes\"><span id=\"mafia\"><div class=\"rititle\">Mafia</div></span><span id=\"vampire\"><div class=\"rititle\">Vampires</div></span></div>");
    } else if(!$('#duplicateReports').length) {
        $('#otherReports').after("<div id=\"boxes\"><span id=\"mafia\"><div class=\"rititle\">Mafia</div></span><span id=\"vampire\"><div class=\"rititle\">Vampires</div></span></div>");
    }
    else {
        $('#duplicateReports').after("<div id=\"boxes\"><span id=\"mafia\"><div class=\"rititle\">Mafia</div></span><span id=\"vampire\"><div class=\"rititle\">Vampires</div></span></div>");
    }*/
}

/*Adds in the View Will button and attaches its action listener*/
function willButton() {
    $('#buttons').append('<input type="button" id="will" value="View Will">'); //adds the actual button after the apply filter
    $('#will').click(function() {
        will.click();
    });
}

/*Adds in the death button and attaches its action listener*/
function deathButton() {
    $('#buttons').append('<input type="button" id="deathButton" value="Death">');
    $('#deathButton').click(function() {
        scrollTo($('#reportContent'), $('.notice.'+$('#role').text().trim().replace(' ', '.')+'.death'));
    });
}

function vampireButton() {
    $('#buttons').append('<input type="button" id="vampireButton" value="Vampire">');
    $('#vampireButton').click(function() {
        scrollTo($('#reportContent'), $('.Vampire.vampire:contains('+reportedPlayerIgn+')'));
    });
}

/*Adds in the amnesiac button and attaches its action listener*/
function amnesiacButton() {
    $('#buttons').append('<input type="button" id="amnesiacButton" value="Amnesiac">');
    $('#amnesiacButton').click(function() {
        scrollTo($('#reportContent'), $(".notice:contains("+reportedPlayerIgn+" has remembered)"));
    });
}

reset = function(skipped){
	Trial.loaderOpen(function(){
		resetTabs();
		Trial.excludeReport($('.reportId').html(),skipped,function(){
		    $('#skipperlink').blur();
		    $('#loadingMessage').html('Cleaning up...');
		    // reset html values including filter
		    $('.filterBody > .filterOption').remove();
		    $('#highlighter').css('opacity','').hide();
		    $('.reportId').html("--");
		    $('.reportedPlayer').html("--");
		    $('.numReports').html("--");
		    $('.reportDate').html("--");
		    $('.reportReason').html("--");
		    $('.reportAppeal').html("--");
		    $('.reportDescription').html("--");
		    $('#reportContent').html("--");
		    $('#dupLocation').val("");
		    $('#dupReason').val("");
		    $('#orlist').find("li:first-child").html("--");
		    $('#orlist').find("li:not(:first-child)").remove();
		    $('#mafia, #vampire, #commentNum, #foreign, #role').empty();
		    $('#mafia').append("<div class=\"rititle\">Mafia</div>"); //re-add in titles
		    $('#vampire').append("<div class=\"rititle\">Vampires</div>"); //re-add in titles
		    $('#graveyard').empty();
		    //$('#afkcount').html("--");
            $('#role').html("--");
		    $('#left').html("--");
		    startLoadingSequence(skipped);
		});
		return;
	});
}

/*Overwrite loading sequence to skip Turkish reports*/
Trial.startLoadingSequence = function(skipped){
	$('#loadingMessage').html('Searching for reports...');
	Trial.loadStage(1,skipped,function(data){ //gives back a report ID
		console.log('Step 1: ' + data);
		if(typeof(data) === 'undefined'){
			var msg = "There was a problem retrieving report information. (1)";
			Modal.open(msg);
			return;
		}
		if(data[0] == "toosoon"){
			var t = data[1];
			Modal.open("Wow! You <i>breezed</i> through that report. Unfortunately, you must wait a little longer before you can view another.");
			$('#loadingMessage').html('New report in... '+t);
			var tooSoonTimer = setInterval(function(){
				t--;
				$('#loadingMessage').html('New report in... '+t);
				if(t<=0){
					if(Modal.isOpen()){
						Modal.close(function(){
							clearInterval(tooSoonTimer);
							startLoadingSequence();
						});
					}else{
						clearInterval(tooSoonTimer);
						startLoadingSequence();
					}
				}
			},1000);
			return;
		}
		if(data[0] == "error"){
			var msg = data[1];
			if(msg.indexOf('maintenance') >= 0) $('#loadingMessage').html('Currently in maintenance...');
			Modal.open(msg);
			return;
		}
		if(data == -1){
			if(window.attempt==null || typeof window.attempt == 'undefined') Modal.open("There are currently no available reports. You may wait here until one is found or come back later.");
			window.attempt = 1;
			$('#loadingMessage').html("Waiting for reports...");
			if(window.refreshReports == null) report_timer();
			return;
		}else{
			window.attempt=null;
			if(Modal.isOpen()){
				Modal.close();
			}
			if(window.refreshReports != null){
				clearInterval(window.refreshReports);
				window.refreshReports=null;
			}
		}
		$('#loadingMessage').html('Fetching data...');
		Trial.loadStage(2,data,function(data){ //gives back data like reasoning, reported player etc
				if(data['ReportID'] > 1149876 && data['ReportID'] < 1150131) {
					$('.reportId').html(data['ReportID']);
					reset(1); //relies on reportId being set
                    return;
				}
			if(typeof(data) === 'undefined'){
				var msg = "There was a problem retrieving report information. (2)";
				Modal.open(msg);
				return;
			}
			if(data[0] == "reset"){
				$('#loadingMessage').html('Searching for reports...');
				report_timer();
				return;
			}
			if(data[0] == "error"){
				var msg = data[1];
				Modal.open(msg);
				return;
			}
			var trialNames = new Array("ciara","spiritofspirits","IAmAMunchlax","Naru2008","ciara");
			var reportID          = data['ReportID'];
			var reportDate        = data['Submitted'];
			var reportName        = (reportID <= 5) ? trialNames[reportID-1] : data['Username'];
			var reportReason      = data['Reason'];
			var reportAppeal      = (data['Appeal'] == "") ? "None given." : data['Appeal'];
			console.log('Step 2: ' + reportID + reportDate + reportName + reportReason);
			$('#loadingMessage').html('Loading report...');
			Trial.loadStage(3,reportID,function(data){ //gives entire report data
				console.log(reportID);
				if(typeof(data) === 'undefined'){
					var msg = "There was a problem retrieving report information. (3)";
					Modal.open(msg);
					return;
				}
				if(data == "reset" || data[0] == "reset"){
					$('#loadingMessage').html('Searching for reports...');
					report_timer();
					return;
				}
				if(data[0] == "error"){
					var msg = data[1];
					Modal.open(msg);
					return;
				}
				$('#loadingMessage').html('Setting up Trial...');
				var reportHTML = "";
				for(var i=0;i<data.html.length;i++){
					reportHTML += data.html[i];
				}
				data.html = reportHTML;
				$('.reportId').html(reportID);
				$('#dupReportID').val(reportID);
				$('.reportedPlayer').html(reportName);
				$('.reportDate').html(reportDate);
				$('.numReports').html(data.numReports);
				$('.reportReason').html(reportReason);
				$('#highlighter').data('user',reportName);
				if(reportReason == 'Other') $('.reportDescription').parent().prev('.rititle').html('Details:');
				var descriptions = data.reports[reportName]
				var tDesc = "";
				descriptions = (typeof descriptions == 'undefined') ? [] : descriptions;
				for(var i=0; i<descriptions.length;i++){
					desc = descriptions[i];
					if(typeof(desc[1]) === 'undefined') continue;
					desc[1] = desc[1].replace("\\n","");
					if(desc[1].length == 0) continue;
					tDesc += desc[1]+"<br />";
				}
				if(tDesc.length == 0) tDesc = "None given.      ";
				tDesc = tDesc.substr(0,tDesc.length-6);
				$('.reportDescription').html(tDesc);
				$('.reportAppeal').html(reportAppeal);
				$('#reportContent').html(data.html);

				Trial.findOtherReports(reportID,function(reportdata){
					var rd = "";
					if(reportdata.length > 0){
						for(var i = 0; i < reportdata.length; i++){
							rd += "<li><a href='./viewReport.php?id="+reportdata[i][0]+"' target='_blank'>Report"+reportdata[i][0]+"</a></li>";
						}
					}else{
						rd = "<li>No other reports.</li>";
					}
					$('#orlist').html(rd);
					Trial.populateFilter(data);
					if($('#dupPlayer').length > 0) Trial.populateDuplicate(data,reportName);
					$('.reportedPlayer').html($('[for="'+reportName+'"]').html());
					$('#highlighter').show();
					Trial.preloadAssets(function(){
						Trial.loaderClose(function(){
							if(window.showIntro === true && $('#container').css('width') == '1000px'){
								Trial.showIntro(null,function(){
									console.log('tutorial complete');
									Trial.completeIntro(function(){
										console.log("tutorial status updated");
									});
								});
							}else{
								// alert("You must be on a screen greater than 1000px in order to complete the tutorial. You won't be able to judge reports without completing it.");
							}
						});
					});
				});
			});
		});
	});
}

function resetTabs() {
    let graveyard = $('.graveyard');
    let info = $('#reportInfo');
    if(graveyard.hasClass('active')) {
        info.html(backupTab);
        $('.graveyard').removeClass('active')
        $('.info').addClass('active');
    }
    backupTab = '<div style="border-bottom: 1px solid !important;float: none;margin-bottom: initial;padding-bottom: 25px;"><span class="riheader info" style="display: inline-block; width: 45%;">Report Details</span><span class="graveyard riheader" style="float: right; display: inline-block; width: 45%;">Graveyard</span></div><div id="graveyardContent"></div>';
}

Trial.loaderClose = function(callback){
    $('body').removeClass('modalOpen');
    setupReport();
    $('#loading').fadeOut('slow',function(){
        $('#loadingMessage').html('Waiting for user...');
        if(callback && {}.toString.call(callback) === '[object Function]'){
            callback();
        }
    });
}

/*Run each time a new report is loaded*/
function setupReport() {
    setNames();
    //emphasize = [];
    $('#highlighter').click(); //turn on highlighting
    //$('.easyJurorList').text('Add to juror list').prop('disabled', false);
    parseDescription();
    addNamesToLeavers();
    hasLeftGame();
    rolesOnDeath();
    addRolesToVotes();
    attachUsernamesToMessage();
    colorTo(localStorage.getItem("colorWhispersTo"));
    colorFrom(localStorage.getItem("colorWhispersFrom"));
    colorJailor(localStorage.getItem("jailorColor"));
    colorMayor(localStorage.getItem("mayorColor"));
    colorLeaves(localStorage.getItem("leaveColor"));
    //post("comments.php", {type: "numberOfComments", reportID: $('.reportId').html()}, "#commentNum");
    addRole();
    //hilightEvilWords(localStorage.getItem('filterColor'));
    checkForWill();
    checkButtons();
    populateGraveyard();
    //openAllButton();
    fillBoxes();
    fillMafia();
}

/*Tests if a player has left the game*/
function hasLeftGame() {
    var notices = $('.notice');
    for(var x=0;x<notices.length;x++) {
        if(notices.eq(x).text() == reportedPlayerIgn + " has left the game.") {
            var day = notices.eq(x).prevAll('.time, .stage:not(:contains("Judgement"), :contains("Defense"))').eq(0).text();
            $('#left').text(day);
            return;
        }
    }
    $('#left').text("N/A");
}

/*Colors each whisper including the reported player
  color: hex string of the color from local storage
*/
function colorFrom(color) {
    var whispers = $('.whisper');
    for(var x=0;x<whispers.length;x++) {
        if(whispers[x].innerText.includes(reportedPlayerIgn + " to"))
            whispers.eq(x).css({"color": color});
    }
}

function colorTo(color) {
    var whispers = $('.whisper');
    for(var x=0;x<whispers.length;x++) {
        if(whispers[x].innerText.includes("to " + reportedPlayerIgn))
            whispers.eq(x).css({"color": color});
    }
}

/*Colors the jailor's name in jailor chat
  color: hex string of the color from local storage
*/
function colorJailor(color) {
    $("[class*=Jailor][class*=jail]").css({"color": color}); //colors jailor text
}

/*Colors the mayor's reveal in chat
  color: hex string of the color from local storage
*/
function colorMayor(color) {
    $('#reveal, .notice:contains("has revealed")').removeClass().attr('id', 'reveal').css({"color": color});
}

/*Colors leavers in the chat
  color: hex string of the color from local storage
*/
function colorLeaves(color) {
    $('span.notice:contains("has left the game.")').removeClass().css("color", color + " !important");
}

/*Adds scroll event for graveyard functionality*/
setInterval(function() { //scroll event runs like 8 times, make it only run once
    if (scrolling) {
        scrolling = false;
    }
}, 250);