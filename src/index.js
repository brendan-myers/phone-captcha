const express = require('express');
const bodyParser = require('body-parser');
const VoiceResponse = require('twilio').twiml.VoiceResponse;

const SAY_OPTIONS  = { voice: 'alice' };
const SAY_GREETING = 'To connect your call, please enter the following numbers.';
const SAY_SUCCESS  = 'Thank you. Connecting your call.';
const SAY_FAILURE  = 'Sorry, that is incorrect. Goodbye.';

const DATASTORE_KEY = 'WhitelistedCaller';

const CODE_LENGTH  = 4;

const PORT = 8080;


/**
 * Generate a random integer.
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
 */
const getRandomInt = (min, max) => {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min)) + min;
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


/**
 * Returns true if the msisdn is in the whitelist
 */
let isWhitelisted = async msisdn => false;


/**
 * Add an msisdn to the whitelist
 */
let addToWhitelist = () => false;


switch (process.env.WHITELIST_LOCATION) {
	case 'GOOGLE_CLOUD':
		if (!process.env.GOOGLE_CLOUD_PROJECT || !process.env.GOOGLE_CLOUD_KEY) {
			throw new Error('Missing Google Cloud credentials.');
		}

		const datastore = require('@google-cloud/datastore')({
			projectId: process.env.GOOGLE_CLOUD_PROJECT,
			keyFilename: process.env.GOOGLE_CLOUD_KEY
		});

		isWhitelisted = async msisdn => {
			const query = datastore.createQuery(DATASTORE_KEY)
				.filter('msisdn', msisdn)
				.limit(1);

			const whitelisted = await datastore.runQuery(query);

			return whitelisted[0].length > 0;
		};

		addToWhitelist = msisdn => {
			datastore.save({
				key: datastore.key(DATASTORE_KEY),
				data: [
					{
						name: 'msisdn',
						value: msisdn
					},
					{
						name: 'created',
						value: new Date().toJSON()
					}
				]
			}).then(() => {
				console.log(`${msisdn} added to whitelist`);
			}).catch(err => {
				console.log(`Failed to whitelist ${msisdn}: ${err}`);
			});
		};

		break;

	case 'LOCAL': // TODO
	case 'MEMORY':
	default:
		const whitelist = {};

		isWhitelisted = async msisdn => {
			return !!whitelist[msisdn];
		}

		addToWhitelist = msisdn => {
			whitelist[msisdn] = true;
			console.log(`${msisdn} added to whitelist`);
		}

		break;
}


const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

/**
 * Handler for incoming calls
 */
app.post('/voice', async (req, res) => {
	const twiml = new VoiceResponse();
	const whitelisted = await isWhitelisted(req.body.Caller);
	
	if (whitelisted) {
		twiml.dial({ callerId: req.body.Caller })
			.number(process.env.OUTBOUND_NUMBER);
	} else {
		const code = generateCode();

		twiml.say(SAY_OPTIONS, `${SAY_GREETING} ${code.text}`);

		twiml.gather({
			timeout: 5,
			numDigits: CODE_LENGTH,
			action: `/validate/${code.url}`,
			method: 'POST'
		});
	}

	res.send(twiml.toString());
});


app.post('/validate/:code', (req, res) => {
	const twiml = new VoiceResponse();

	if (req.params.code === req.body.Digits) {
		addToWhitelist(req.body.Caller);

		twiml.say(SAY_OPTIONS, SAY_SUCCESS);

		twiml.dial({ callerId: req.body.Caller })
			.number(process.env.OUTBOUND_NUMBER);
	} else {
		twiml.say(SAY_OPTIONS, SAY_FAILURE);
	}
	
    res.send(twiml.toString());
});


app.listen(PORT, () => console.log(`phone-captcha running on port ${PORT}.`));