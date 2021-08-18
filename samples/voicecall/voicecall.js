import JWT from '../jwt.js';

const APPLICATION_KEY = 'APPLICATION_KEY'; // Replace with your own application key
const APPLICATION_SECRET = 'APPLICATION_SECRET'; // Replace with your own application secret
const API_URL = 'https://ocra.api.sinch.com'; // Replace with the correct url depending on what environement you are targeting

class SinchPhone {
  	constructor(sinchClientBuilder, applicationKey, applicationSecret, apiUrl) {
		this.sinchClientBuilder = sinchClientBuilder;
		this.sinchApplicationKey = applicationKey;
		this.sinchApplicationSecret = applicationSecret;
		this.apiUrl = apiUrl;
		this.callClient = null;
        this.call = null;
	}

	start = () => {
		this.handleStartClientClick(this.sinchApplicationKey, this.apiUrl);
		this.handleMakeCallClick();
        this.handleHangupCLick();
	}

	startSinchClient = (applicationKey, apiUrl) => {
		console.log('Sinch - Starting client');

		const userId = this.getUserId();
		const sinch = this.sinchClientBuilder.
			applicationKey(applicationKey).
			userId(userId).
			environmentHost(apiUrl).build();

		sinch.addListener(this);
		sinch.setSupportManagedPush();
		sinch.start();
	}

	onClientStarted = async (sinch) => {
		console.log(`Sinch - Client started for ${sinch.userId}`);

		const callClient = sinch.callClient;
		callClient.addListener(this);
		this.callClient = callClient;
        this.enableCall();
	}

	onClientFailed = (error) => {
		console.log('Sinch - Start client failed');
		console.log(error);
	}

	onCredentialsRequired = (sinch, clientRegistration) => {
		console.log('Sinch - Credentials required');
		this.createJWT(this.sinchApplicationKey, this.sinchApplicationSecret, sinch.userId).then((jwt) => {
			clientRegistration.register(jwt);
		});
	}

	makeCall = async () => {
		const callee = this.getCallee();
		console.log(`Sinch - Make call to ${callee}`);

		try {
			this.call = await this.callClient.callUser(callee);
			this.onOutboundCall(this.call);
            this.enableHangup();
            this.disableCall();
		} catch (error) {
			console.log(error);
		}
	}

	onOutboundCall = (call) => {
		this.playStream(call.incomingStream);
		this.setupCallListeners(call);
	}

	onIncomingCall = (callClient, call) => {
        this.call = call;

		setTimeout(() => {
			console.log(`Sinch - Incoming call from ${call.origin}`);

			try {
				call.answer();
				this.playStream(call.incomingStream);
				this.setupCallListeners(call);
			} catch (error) {
				console.log(error);
			}
		}, 1000);
	}

	setupCallListeners = (call) => {
		call.addListener({
			onCallProgressing: (call) => {
				console.log(`Sinch - Call progressing ${call.remoteUserId}`);
			}, onCallEstablished: (call) => {
				console.log(`Sinch - Call established with ${call.remoteUserId}`);
			}, onCallEnded: (call) => {
                this.disableHangup();
                this.enableCall();
				console.log(`Sinch - Call ended ${call.remoteUserId}`);
			}
		});
	}

	playStream(stream) {
		console.log('Sinch - Play audio stream');

		const audioElement = document.createElement('audio');
		audioElement.srcObject = stream;
		audioElement.autoplay = true;
		audioElement.playsinline = true;

		document.body.appendChild(audioElement);
	}

	createJWT = (key, secret, userId) => {
		const token = new JWT(key, secret, userId);
		return token.toJwt();
	}

	handleStartClientClick = (sinchApplicationKey, apiUrl) => {
		document.getElementById('startClient').addEventListener('click', () => this.startSinchClient(sinchApplicationKey, apiUrl));
	}

	handleMakeCallClick = () => {
		document.getElementById('call').addEventListener('click', () => this.makeCall());
	}

    handleHangupCLick = () => {
        document.getElementById('hangup').addEventListener('click', () => this.call.hangup());
    }

    disableHangup = () => {
        document.getElementById('hangup').setAttribute('disabled', true);
    }

    enableHangup = () => {
        document.getElementById('hangup').removeAttribute('disabled');
    }

    disableCall = () => {
        document.getElementById('call').setAttribute('disabled', true);
    }

    enableCall = () => {
        document.getElementById('call').removeAttribute('disabled', true);
    }

	getUserId = () => {
		return document.getElementById('userId').value;
	}

	getCallee = () => {
		return document.getElementById('callee').value;
	}
}

const sinchPhone = new SinchPhone(Sinch.getSinchClientBuilder(), APPLICATION_KEY, APPLICATION_SECRET, API_URL);
sinchPhone.start();
