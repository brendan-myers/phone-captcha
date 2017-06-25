const express = require('express');
const bodyParser = require('body-parser');
const VoiceResponse = require('twilio').twiml.VoiceResponse;

const SAY_OPTIONS  = { voice: 'alice' };
const SAY_GREETING = 'To connect your call, please enter the following numbers.';
const SAY_SUCCESS  = 'Thank you. Connecting your call.';
const SAY_FAILURE  = 'Sorry, that is incorrect. Goodbye.';

const CODE_LENGTH  = 4;

const PORT = 8080;


/**
 * Generate a random integer.
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
 */
const getRandomInt = (min, max) => {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}


/**
 * Generate a random 4 digit challenge
 */
const generateCode = () => {
	const code = [...Array(CODE_LENGTH)].map(() => getRandomInt(0, 10)).toString();

	return {
		text: code.toString(),
		url: code.replace(/,/g, '')
	}
};


const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/voice', (req, res) => {
	const twiml = new VoiceResponse();
	const code = generateCode();

	twiml.say(SAY_OPTIONS, `${SAY_GREETING} ${code.text}`);

	twiml.gather({
		timeout: 5,
		numDigits: CODE_LENGTH,
		action: `/validate/${code.url}`,
		method: 'POST'
	});

    res.send(twiml.toString());
});


app.post('/validate/:code', (req, res) => {
	const twiml = new VoiceResponse();

	if (req.params.code === req.body.Digits) {
		twiml.say(SAY_OPTIONS, SAY_SUCCESS);

		twiml.dial({ callerId: req.body.Caller })
			.number(process.env.OUTBOUND_NUMBER);
	} else {
		twiml.say(SAY_OPTIONS, SAY_FAILURE);
	}
	
    res.send(twiml.toString());
});

app.listen(PORT, () => console.log(`phone-captcha running on port ${PORT}.`));