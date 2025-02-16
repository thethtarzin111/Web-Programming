//Please see the documentation for the references used.

let userSamples = [];
let audioContext;
let tracks = [];
let isPlaying = false; //The original state when the web page is started: no sound is playing.
let mediaRecorder;
let recordedChunks = [];


//This is to made sure that event listeners as well as audio context are set up only afte the page has been loaded successfully.
//Reference from lecture source code: week 1
if(document.readyState !== "loading") {
    console.log("Ready!");
    
    setupEventListeners();
}else {
    document.addEventListener("DOMContentLoaded", () => {
        //audioContext = new (window.AudioContext || window.webkitAudioContext)();
        setupEventListeners();
})
}

// Initially I've added these event listeners in each designated function separately like in weekly assignments
// However, chatGPT suggested that it's neater and more efficient to make it into a function.
function setupEventListeners() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const instruments = document.querySelectorAll('.instruments');
    
    instruments.forEach(newInst => {
        newInst.addEventListener('dragstart', dragStart);
    });

    document.getElementById('track-list').addEventListener('dragover', dragOver);
    document.getElementById('track-list').addEventListener('drop', dropTrack);
    document.getElementById('add-track-button').addEventListener('click', addNewTrack);
    document.getElementById('upload').addEventListener('click', addUserSample);

    document.getElementById('play-button').addEventListener('click', playAllTracks);
    document.getElementById('stop-button').addEventListener('click', stopAllTracks);
    document.getElementById('download-button').addEventListener('click', downloadSong);
    document.getElementById('start-recording-button').addEventListener('click', startVoiceRecording);
    document.getElementById('stop-recording-button').addEventListener('click', stopVoiceRecording);
    document.getElementById('play-recording-button').addEventListener('click', playVoiceRecording);
    
}

//This is the function to allow user to add audio of their choice. Reference from lecture source code: music maker
function addUserSample() {
    const file = document.getElementById("input-sample").files[0];
    if (!file) return;

    const audioSrc = URL.createObjectURL(file);
    const sampleName = file.name;

    userSamples.push({ src: audioSrc, name: sampleName });

    let newButton = document.createElement("div");
    newButton.classList.add('instruments');
    newButton.setAttribute("data-instrument", sampleName);
    newButton.draggable = true;
    newButton.innerText = sampleName;

    //Here, after the user added their own audio, we want to store it as a button in the instrument category just like other instruments.
    newButton.addEventListener('dragstart', dragStart);
    document.getElementById('categories-samples').appendChild(newButton); // We add it to our predefined samples category.
}


// These functions are for dragging an instrument and dropping it into the track. Reference: [6]
function dragStart(e) {
    e.dataTransfer.setData('instrument', e.target.dataset.instrument);
}

function dragOver(e) {
    e.preventDefault();
}

function dropTrack(e) {
    const instrument = e.dataTransfer.getData('instrument');
    const targetTrack = e.target.closest('.track');

    if (targetTrack) {
        addNewInstrumentToTrack(targetTrack, instrument);
    }
}

// This is a function for when a user wants to add a new track.
function addNewTrack() {
    const trackId = `track-${tracks.length}`; 
    const trackList = document.getElementById('track-list');
    const trackElement = document.createElement('div');
    trackElement.classList.add('track');
    trackElement.id = trackId;
    
    //Reference for volume slider: [1]
    //We use innerHTML when we want to create HTML elements after executing a function.
    //In this case, we want it to appear after we click on "Add Track" button.
    trackElement.innerHTML = `
    <span>Track ${tracks.length + 1}</span>
    <div class="track-instruments"></div>
    <input type="range" min="0" max="5" step="0.1" value="1" class="volume-slider">
    <label>
            <input type="checkbox" class="looping"> Loop
    </label>
    <button class="styled-button">Delete</button>
`;

    trackList.appendChild(trackElement);
    tracks.push({ id: trackId, instruments: [], volume: 1, loop: false });

    trackElement.querySelector('.styled-button').addEventListener('click', () => deleteTrack(trackElement));
    trackElement.querySelector('.volume-slider').addEventListener('input', (e) => adjustTrackVolume(trackId, e.target.value));
    trackElement.querySelector('.looping').addEventListener('change', (e) => {
        const track = tracks.find(t => t.id === trackId);
        if (track) {
            track.loop = e.target.checked;
        }
    });
}

async function addNewInstrumentToTrack(trackElement, instrument) {
    const instrumentElement = document.createElement('div'); //We will only have a new div when a new track is added. Initially,there'll be none.
    instrumentElement.classList.add('instrument');
    
    //Here, again we want a volume slider to appear after we add an instrument.
    instrumentElement.innerHTML = `
        <span>${instrument}</span>
        <input type="range" min="0" max="5" step="0.01" value="1" class="instrument-volume-slider">
        <button class="styled-button">X</button>
    `;

    const trackId = trackElement.id;
    const track = tracks.find(t => t.id === trackId);
    const instrumentObj = { name: instrument, volume: 1 };

    //If a track exists, we add an instrument to the track.
    if (track) {
         track.instruments.push(instrumentObj);
    }

    const volumeSlider = instrumentElement.querySelector('.instrument-volume-slider');
    volumeSlider.addEventListener('input', (e) => {
        const volume = e.target.value;
        instrumentObj.volume = volume;
    });

    trackElement.querySelector('.track-instruments').appendChild(instrumentElement);
    
    //This is for deleting an instrument in the track.
    const deleteButton = instrumentElement.querySelector('.styled-button');
    deleteButton.addEventListener('click', () => deleteInstrument(trackId, instrumentObj, instrumentElement));

    const userSample = userSamples.find(sample => sample.name === instrument);
    if (userSample) {
        instrumentElement.style.width = '100px';
    } else {
        try {
            const { duration } = await loadSound(instrument);
            instrumentElement.style.width = `${duration * 10}px`; //The same as any other instrument duration width.
        } catch (error) {
            console.error(`Error playing sound of ${instrument}:`, error);
            instrumentElement.textContent += " (Error! Cannot play the sound X_x)";
        }
    }

   
}

//This part of the code is heavily referenced from chatGPT.
//There was an error when trying to play tracks sequentially AND at the same time
//So, I asked chatGPT to troubleshoot it.

let currentAudio = []; // Suggestion from chatGPT that in order to play sequentially and continuously, we need to keep track of current audio.
function playAllTracks() {
    if (isPlaying || tracks.length === 0) {
        return; // This function is to prevent a new track to be played when the current one is still ongoing or if there's no instruments in the track.
    }

    isPlaying = true; // Else, the sounds will start playing.
    console.log('The following track(s) are playing:', tracks); //This is to troubleshoot if the tracks are playing or not.
    
    // We need this reset function so that we can play the track again once it's been played once.
    currentAudio = [];

    startRecording(); //The recording function will start as soon as we play the track(s).

    tracks.forEach(track => {
        let sequentialStartTime = 0; 

        // This part of the code is to play all instruments simultaneously in different tracks
        track.instruments.forEach(newInst => {
            const gainNode = audioContext.createGain(); //Reference: [2]
            
            const instrumentVolume = newInst.volume; // For each instrument volume
            const trackVolume = track.volume; // For an entire track volume
            gainNode.gain.value = instrumentVolume * trackVolume; //We want the final volume to be multiplied by both instrument volume and track volume.


            loadSound(newInst.name).then(({ buffer, duration }) => {
                const bufferSource = audioContext.createBufferSource(); // We need a buffer source to play audio that has been loaded into the memory.
                bufferSource.buffer = buffer;
                
                // According to reference: [2] we connect the buffer source to the gain node and to the destination.
                bufferSource.connect(gainNode); //Reference [2]
                gainNode.connect(audioContext.destination); //Reference: [2]
                
                //Reference: chatGPT
                bufferSource.start(audioContext.currentTime + sequentialStartTime);

                // This is to loop the track when the checkbox is ticked.
                if (track.loop) {
                    bufferSource.loop = true;
                }

                // we need this onended event to ensure that playback is done properly.
                bufferSource.onended = () => {
                    currentAudio = currentAudio.filter(currentsrc => currentsrc !== bufferSource);
                    // If there's no active audio, reset the playing.
                    if (currentAudio.length === 0) {
                        isPlaying = false;
                        stopRecording();
                    }
                };

                // Here, we track the current buffer source.
                currentAudio.push(bufferSource);
                sequentialStartTime += duration; // We need to increment for the next instrument to be played sequentially.
            }).catch(err => console.error(`Error playing sound ${inst.name}:`, err)); //We put catch here so as to not crash.
        });
    });
}

function stopAllTracks() {
    if (!isPlaying) {
        return; //If the track is not isPlaying, there's nothing to be done.
    }

    // Stop all currently playing buffer sources
    currentAudio.forEach(currentsrc => {
        currentsrc.stop();
    });

    currentAudio = []; // If there's any active audio, we'll stop them.
    isPlaying = false; // Then, playing state is reset to original.

    // Then, the audio context is resumed.
    audioContext.resume();
    stopRecording();
}

//This is the function for user to adjust the volume of each track.
function adjustTrackVolume(track_id, volume) {
    const eachTrack = tracks.find(t => t.id === track_id);
    if (eachTrack) {
        eachTrack.volume = volume;
    }
}

//This is for removing individual track.
function deleteTrack(trackElement) {
    const track_id = trackElement.id;
    trackElement.remove();
    
    tracks = tracks.filter(t => t.id !== track_id); //Reference: [3]
}

//This is for removing an individual instrument in a track.
function deleteInstrument(trackId, instrumentObj, instrumentElement) {
    const track = tracks.find(t => t.id === trackId);

    if (track) {
        // We find the index of the instrument element in the track's instruments array. Reference: ChatGPT
        const instrumentIndex = track.instruments.indexOf(instrumentObj);
        // If the track is not empty or at least there's an instrument
        if (instrumentIndex !== -1) {
            track.instruments.splice(instrumentIndex, 1); // We remove instrument from array
        }
    }
    if (instrumentElement && instrumentElement.parentNode) {
        instrumentElement.remove();
    } else {
        console.error("Instrument is not found!");
    }
}


function startRecording() {
    recordedChunks = []; // Reset the recorded chunks at the start of recording
    const destination = audioContext.createMediaStreamDestination(); //Reference: [7]
    
    tracks.forEach(track => {
        track.instruments.forEach(newInst => {
            loadSound(newInst.name).then(({ buffer }) => {
                const bufferSource = audioContext.createBufferSource();
                bufferSource.buffer = buffer;
                bufferSource.connect(destination);
                bufferSource.start();
            });
        });
    });

    mediaRecorder = new MediaRecorder(destination.stream); //Reference: [8]

    mediaRecorder.ondataavailable = function (e) {
        if (e.data.size > 0) {
            recordedChunks.push(e.data);
        }
    };
    mediaRecorder.start();
}


function stopRecording() {
    mediaRecorder.stop();
}

function downloadSong() {
    if (recordedChunks.length === 0) {
        console.error("Please play and record the track(s) before downloading.");
        return; // Shows error message and does not download if there's nothing to download
    }

    //Reference: chatGPT
    const blob = new Blob(recordedChunks, { type: 'audio/wav' }); //I've used .wav files for the audios so I have this file type here.
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'recorded_song.wav';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
}



async function loadSound(instrumentName) {
    try {
        //Initially, I followed the source code from lecture: music maker 
        //However, it takes up a lot of space in the code and so asked chatgpt for better, efficient way.
        
        const userSample = userSamples.find(sample => sample.name === instrumentName);
    if (userSample) {
        const response = await fetch(userSample.src);
        const dataArrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(dataArrayBuffer);
        return {
            buffer: audioBuffer,
            duration: audioBuffer.duration
        };
    } else {

        const response = await fetch(`audio/${instrumentName}.wav`); //So, this part of the code is reference from chatGPT.
        if (!response.ok) {
            throw new Error(`There's an error responding for ${instrumentName}`);
        }
        const dataArrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(dataArrayBuffer); 
        return {
            buffer: audioBuffer,
            duration: audioBuffer.duration 
        };
    } }catch (error) {
        console.error(`There was an error loading sound ${instrumentName}:`, error);
        throw error; // This is for debugging if there's any error.
    }
}

//This is the recording part.


async function startVoiceRecording() {

    const startRecordingButton = document.getElementById('start-recording-button');
    const stopRecordingButton = document.getElementById('stop-recording-button');
    const playRecordingButton = document.getElementById('play-recording-button');
    // We request microphone access from user.
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); //Reference: [9]
    
    // We first need to initialize MediaRecorder
    mediaRecorder = new MediaRecorder(stream);

    // Here, the recording will start.
    mediaRecorder.start();

    // To clear any previous audio chunk
    audioChunks = [];


    mediaRecorder.addEventListener("dataavailable", (event) => {
        audioChunks.push(event.data);
    });

    // When the recording stops
    mediaRecorder.addEventListener("stop", () => {
        audioBlob = new Blob(audioChunks, { type: "audio/wav" });
        audioUrl = URL.createObjectURL(audioBlob);
        audioElement = new Audio(audioUrl);
        
        // The state of play recording button is still set to false.
        playRecordingButton.disabled = false;
    });

    // Button states are then updated.
    startRecordingButton.disabled = true;
    stopRecordingButton.disabled = false;
};

function stopVoiceRecording() {

    const startRecordingButton = document.getElementById('start-recording-button');
    const stopRecordingButton = document.getElementById('stop-recording-button');
    
    mediaRecorder.stop();
    //Here, we switch the states of two recording buttons.
    startRecordingButton.disabled = false;
    stopRecordingButton.disabled = true;
}

//Here, we play back the recorded voice audio.
function playVoiceRecording() {
    audioElement.play(); //Reference: [10]
}
