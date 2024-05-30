require('dotenv').config();
import request from 'request';

let getHomePage = (req, res) => {
    return res.render('homepage.ejs');
};

let postWebhook = (req, res) => {
    let body = req.body;

    // Checks this is an event from a page subscription
    if (body.object === 'page') {

        // Iterates over each entry - there may be multiple if batched
        body.entry.forEach(function (entry) {

            // Gets the body of the webhook event
            let webhook_event = entry.messaging[0];
            console.log(webhook_event);

            // Get the sendet PSID
            let sender_psid = webhook_event.sender.id;
            console.log('Sender PSID: ' + sender_psid);

            // Check if the event is a message or postback and pass the event to the appropriate handler function
            if (webhook_event.message) {
                handleMessage(sender_psid, webhook_event.message);
            } else {
                handlePostback(sender_psid, webhook_event.postback);
            }

        });

        // Returns a '200 OK' response to all requests
        res.status(200).send('EVENT_RECEIVED');
    } else {
        // Returns a '404 Not Found' if even is not from a page subcription
        res.sendStatus(404);
    }
};

let getWebhook = (req, res) => {
    // Your verify token, Should be a random string.
    let VERIFY_TOKEN = process.env.VERIFY_TOKEN;

    // Parse the query params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    // Checks if a token and mode is in the query string of the request
    if (mode && token) {

        // Check the mode and token sent is correct
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {

            // Responds with the challenge token from the request
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            // Responds with '403 Forbideen' if verify tokens do not match
            res.sendStatus(403);
        }
    }
};

// Handles messages events
function handleMessage(sender_psid, received_message) {
    let response;

    // Checks if the message contains text
    if (received_message.text) {
        // Create the payload for a basic text message, which
        // will be added to the body of our request to the Send API
        response = {
            "text": `You sent the message: "${received_message.text}". Now send me an attachment!`
        }
    } else if (received_message.attachments) {
        // Get the URL of the message attachment
        let attachment_url = received_message.attachments[0].payload.url;
        response = {
            "attachment": {
                "type": "template",
                "payload": {
                    "template_type": "generic",
                    "elements": [{
                        "title": "Is this the right picture?",
                        "subtitle": "Tap a button to answer.",
                        "image_url": attachment_url,
                        "buttons": [
                            {
                                "type": "postback",
                                "title": "Yes!",
                                "payload": "yes",
                            },
                            {
                                "type": "postback",
                                "title": "No!",
                                "payload": "no",
                            }
                        ],
                    }]
                }
            }
        }
    }

    // Send the response message
    callSendAPI(sender_psid, response);
};

async function handlePostback(sender_psid, received_postback) {
    let response;

    // Get the payload for the postback
    let payload = received_postback.payload;

    // Set the response based on the postback payload
    switch (expression) {
        case 'yes':
            response = { "text": "Thanks!" }
            break;
        case 'no':
            response = { "text": "Oops, try sending another image." }
            break;
        case 'GET_STARTED':
        case 'RESTART_BOT':
            await chatbotService.handleStarted(sender_psid);
            break;
        case 'MAIN_MENU':
            await chatbotService.handleSendMainMenu(sender_psid);
            break;

        case 'LUNCH_MENU':
            await chatbotService.handleSendLunchMenu(sender_psid);
            break;

        case 'DINNER_MENU':
            await chatbotService.handleSendDinnerMenu(sender_psid);
            break;

        case 'VIEW_APPETIZERS':
            await chatbotService.handleDetailViewAppetizer(sender_psid);
            break;
        case 'VIEW_CHICKEN':
            await chatbotService.handleDetailViewChicken(sender_psid);
        case 'VIEW_MEAT':
            await chatbotService.handleDetailViewMeat(sender_psid);
            break;
        case 'VIEW_SEAFOOD':
            await chatbotService.handleDetailViewSeaFood(sender_psid);
            break;
        case 'BACK_TO_MAIN_MENU':
            await chatbotService.handleBackToMainMenu(sender_psid);
            break;
        case 'SHOW_ROOMS':
            await chatbotService.handleShowDetailRooms(sender_psid);
            break;


        default:
            response = { "text": `oop! I don't know response with postback ${payload}` }
    }

    // Send the message to acknowledge the postback
    //callSendAPI(sender_psid, response);
}

// Handles response messages via the Send API
function callSendAPI(sender_psid, response) {
    // Construct the message body
    let request_body = {
        "recipient": {
            "id": sender_psid
        },
        "message": response
    }

    // Send the HTTP request to the Messenger Platform
    request({
        "uri": "https://graph.facebook.com/v20.0/me/messages",
        "qs": { "access_token": process.env.PAGE_ACCESS_TOKEN },
        "method": "POST",
        "json": request_body
    }, (err, res, body) => {
        if (!err) {
            console.log('message sent!')
        } else {
            console.error("Unable to send message:" + err);
        }
    });
};

module.exports = {
    getHomePage: getHomePage,
    postWebhook: postWebhook,
    getWebhook: getWebhook,

}