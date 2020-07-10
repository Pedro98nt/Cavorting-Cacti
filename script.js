jQuery(document).ready(function($) {
	
	function jumpCactus(isLeft, volume) {
		var cactus = isLeft ? '.left' : '.right';
		
		var yPer = gsap.getProperty(cactus, 'yPercent');
		var vol = -volume * 1.5;
		console.log(yPer, vol);
		
		if (cactus == '.left' && vol < -30) {
			vol = -30;
		}
		
		if (cactus == '.right' && vol < -60) {
			vol = -60;
		}
		
		gsap.killTweensOf(cactus);
		gsap.set(cactus, { yPercent: vol, duration: 0.1, ease: 'circ.in' });
		gsap.to(cactus, { yPercent: 0, duration: 3, ease: 'circ.out' });
	}
	
	//	Now let's set up the audio listener
	
	var audioContext = null;
	var meter = null;
	var prevVolume = 0;
	var isLeft = true;

	window.onload = function() {
		
		//	Web Audio
		
		window.AudioContext = window.AudioContext || window.webkitAudioContext;
		
		//	Grab an audio context
		
		audioContext = new AudioContext();
		
		try {
			navigator.getUserMedia = 
				navigator.getUserMedia || 
				navigator.webkitGetUserMedia || 
				//navigator.mediaDevices.getUserMedia || 
				navigator.mozGetUserMedia;
				
			//	Ask for an audio input
			navigator.getUserMedia(
			{
				"audio": {
					"mandatory": {
						"googEchoCancellation": "false",
						"googAutoGainControl": "false",
						"googNoiseSuppression": "false",
						"googHighpassFilter": "false"
					},
					"optional": []
				},
			}, gotStream, didntGetStream);
		} catch (e) {
			alert('getUserMedia threw exception :' + e);
		}
	}


	function didntGetStream() {
		alert('Stream generation failed.');
	}

	var mediaStreamSource = null;

	function gotStream(stream) {
		//	Create an AudioNode from the stream
		
		mediaStreamSource = audioContext.createMediaStreamSource(stream);
		
		//	Create a new volume meter and connect it
		
		meter = createAudioProcessor(audioContext);
		mediaStreamSource.connect(meter);
	}
	
	///
	//	Return the audio processor
	///
	
	function createAudioProcessor() {
		var processor = audioContext.createScriptProcessor(512);
		processor.onaudioprocess = volumeAudioProcess;
		processor.clipping = false;
		processor.lastClip = 0;
		processor.volume = 0;
		processor.clipLevel = 0.98;
		processor.averaging = 0.95;
		processor.clipLag = 750;
		
		processor.connect(audioContext.destination);
		
		processor.shutdown = function() {
			this.disconnect();
			this.onaudioprocess = null;
		};
		
		return processor;
	}

	function volumeAudioProcess( event ) {
		var buf = event.inputBuffer.getChannelData(0);
		var bufLength = buf.length;
		var sum = 0;
		var x;
		
		// Do a root-mean-square on the samples: sum up the squares...
		
		for (var i = 0; i < bufLength; i++) {
			x = buf[i];
			if (Math.abs(x) >= this.clipLevel) {
				this.clipping = true;
				this.lastClip = window.performance.now();
			}
			
			sum += x * x;
		}
		
		// ... then take the square root of the sum.
		
		var rms =  Math.sqrt(sum / bufLength);
		
		// Now smooth this out with the averaging factor applied to the previous sample - take the max here because we want "fast attack, slow release."
		
		this.volume = Math.max(rms, this.volume * this.averaging);
		
		//	Give it as a 1-100 volume scale
		
		var percentVolume = parseInt(this.volume * 100);
		
		//	If it looks like the colume is going up from zero, let's switch sides
		
		if (prevVolume < 2 && percentVolume > prevVolume) {
			isLeft = !isLeft;
			
			jumpCactus(isLeft, percentVolume);
		}
		
		prevVolume = percentVolume;
	}
});