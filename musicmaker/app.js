let audioContext;
let tracks = [];
let isPlaying = false; //The original state when the web page is started: no sound is playing.
let mediaRecorder;

//This is to made sure that event listeners as well as audio context are set up only afte the page has been loaded successfully.
//Reference from lecture source code: week 1
if(document.readyState !== "loading") {
    console.log("Ready!");
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    setupEventListeners();
}else {
    document.addEventListener("DOMContentLoaded", () => {
    setupEventListeners();
})
}

// Initially I've added these event listeners in each designated function separately like in weekly assignments
// However, chatGPT suggested that it's neater and more efficient to make it into a function.
function setupEventListeners() {
    const instruments = document.querySelectorAll('.instruments');
    const trackList = document.getElementById('track-list');
    const addTrackButton = document.getElementById('add-track-button');

    instruments.forEach(newInst => {
        newInst.addEventListener('dragstart', dragStart);
    });

    trackList.addEventListener('dragover', dragOver);
    trackList.addEventListener('drop', dropTrack);
    addTrackButton.addEventListener('click', addNewTrack);

    document.getElementById('play-button').addEventListener('click', playAllTracks);
    document.getElementById('stop-button').addEventListener('click', stopAllTracks);
    //document.getElementById('download-button').addEventListener('click', stopAllTracks);
}

// These functions are for dragging an instrument and dropping it into the track.
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
    trackElement.innerHTML = `
    <span>Track ${tracks.length + 1}</span>
    <div class="track-instruments"></div>
    <input type="range" min="0" max="5" step="0.1" value="1" class="volume-slider">
    <label>
            <input type="checkbox" class="looping"> Loop
    </label>
    <button class="deleteTrack-button">Delete</button>
`;

    trackList.appendChild(trackElement);
    tracks.push({ id: trackId, instruments: [], volume: 1, loop: false });

    trackElement.querySelector('.deleteTrack-button').addEventListener('click', () => deleteTrack(trackElement));
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
    instrumentElement.textContent = instrument;

    trackElement.querySelector('.track-instruments').appendChild(instrumentElement);

    const trackId = trackElement.id;
    const track = tracks.find(t => t.id === trackId);
    if (track) {
        track.instruments.push({ name: instrument, volume: 1 });
    }

    try {
        const {duration } = await loadSound(instrument);
        
        instrumentElement.style.width = `${duration * 10}px`; //Here we set the width of the audio to 10px per second.
    } catch (error) {
        console.error(`There's an error loading sound of ${instrument}:`, error);
        instrumentElement.textContent += " (Error! Cannot load the sound)";
    }
}

//This part of the code is heavily referenced from chatGPT.
//There was an error when trying to play tracks sequentially AND at the same time
//So, asked chatGPT to troubleshoot it.

let currentAudio = []; // Suggestion from chatGPT that in order to play sequentially and continuously, we need to keep track of current audio.
function playAllTracks() {
    if (isPlaying || tracks.length === 0) {
        return; // This function is to prevent a new track to be played when the current one is still ongoing or if there's no instruments in the track.
    }

    isPlaying = true; // Else, the sounds will start playing.
    console.log('The following track(s) are playing:', tracks); //This is to troubleshoot if the tracks are playing or not.
    
    // We need this reset function so that we can play the track again once it's been played once.
    currentAudio = [];

    tracks.forEach(track => {
        let sequentialStartTime = 0; 

        // This part of the code is to play all instruments simultaneously in different tracks
        track.instruments.forEach(newInst => {
            const gainNode = audioContext.createGain(); //Reference: [2]
            
            loadSound(newInst.name).then(({ buffer, duration }) => {
                const bufferSource = audioContext.createBufferSource(); // We need a buffer source to play audio that has been loaded into the memory.
                bufferSource.buffer = buffer;
                gainNode.gain.value = track.volume; // Here, we set the gain value based on the track's volume
                
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
                    }
                };

                // Here, we track the current buffer source.
                currentAudio.push(bufferSource);
                sequentialStartTime += duration; // We need to increment for the next instrument to be played sequentially.
            }).catch(err => console.error(`Error loading sound ${inst.name}:`, err));
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
}

//This is the function for user to adjust the volume of each track.
function adjustTrackVolume(track_id, volume) {
    const eachTrack = tracks.find(t => t.id === track_id);
    if (eachTrack) {
        eachTrack.volume = volume;
    }
}

function deleteTrack(trackElement) {
    const track_id = trackElement.id;
    trackElement.remove();
    
    tracks = tracks.filter(t => t.id !== track_id); //Reference: [3]
}

async function loadSound(instrumentName) {
    try {
        //Initially, I followed the source code from lecture: music maker 
        //However, it takes up a lot of space in the code and so asked chatgpt for better, efficient way.
        
        const response = await fetch(`audio/${instrumentName}.wav`); //So, this part of the code is reference from chatGPT.
        if (!response.ok) {
            throw new Error(`There's an error responding for ${instrumentName}`);
        }
        const dataArrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(dataArrayBuffer); //Reference: 
        return {
            buffer: audioBuffer,
            duration: audioBuffer.duration 
        };
    } catch (error) {
        console.error(`There was an error loading sound ${instrumentName}:`, error);
        throw error; // This is for debugging if there's any error.
    }
}
