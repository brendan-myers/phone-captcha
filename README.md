# Phone Call Captcha
Super simple application for filtering robocalls with an audio based captcha.

[![Build][travis-image]][travis-url]


## Setup

```
git clone git://github.com/brendan-myers/phone-captcha.git
cd phone-captcha
npm install
```

### Twilio

From the Twilio console, configure the hook for incoming calls to point to the /voice endpoint of this application.

![Twilio setup](images/twilio-setup.jpg)


### Environment variables

The application expects an environment variable containing the number to forward successful calls to.

```
OUTBOUND_NUMBER=xxxxxxxxxxxx
```


## Run

```
node .
```
or
```
OUTBOUND_NUMBER=xxxxxxxxxxxx node .
```


## TODO
- Tests

[travis-image]: https://travis-ci.org/brendan-myers/twilio-phone-captcha.svg?branch=master
[travis-url]: https://travis-ci.org/brendan-myers/twilio-phone-captcha