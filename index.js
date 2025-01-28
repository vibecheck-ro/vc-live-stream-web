const API_URL = 'http://localhost:8080/v1'

function getParamFromUrl(param) {
    const queryParams = new URL(document.location.toString()).searchParams;
    return queryParams.get(param);
}

async function getRoomAndParticipant(roomId) {
    const url = `${API_URL}/rooms/list/shareable/${roomId}`;
    const headers = {
        'Authorization': `Bearer ${getParamFromUrl('access-token')}`,
        'X-CORRELATION-ID': 'af7c1fe6-d669-414e-b066-e9733f0de7a8'
    }
    const response = await fetch(url, {headers});
    const payload = await response.json();

    return payload.data;
}

function loadUI(room, participant) {
    const title = document.querySelector('#title');
    title.textContent = room['topic'];
}

async function startVideoPreview() {
    const mediaDevices = navigator.mediaDevices;
    const video = document.querySelector('#video');
    mediaDevices
        .getUserMedia({
            video: true,
            audio: true,
        })
        .then((stream) => {
            video.srcObject = stream;
            video.addEventListener("loadedmetadata", () => {
                video.play();

                const startButton = document.querySelector('#start-button');
                startButton.addEventListener('click', () => {
                    video.play();
                });

                const stopButton = document.querySelector('#stop-button');
                stopButton.addEventListener('click', () => {
                    stream.getTracks().forEach(track => track.stop());
                    video.pause();
                });
            });
        })
        .catch(alert);
}

document.addEventListener('DOMContentLoaded', async () => {
    const roomId = getParamFromUrl('room-id');
    const {room, participant} = await getRoomAndParticipant(roomId);
    console.log(room)
    console.log(participant)
    loadUI(room, participant);
    await startVideoPreview();
})
