import { fetchParticipantWithLiveInteraction, fetchRoomAndParticipant } from './app/api';
import LiveStream from './app/live-stream';
import ParticipantVideo from './app/participant-video';
import { RoomControls } from './app/room-controls';
import { RoomTopBar } from './app/room-top-bar';
import Socket from './app/socket';
import { Participant, RoomControlHandlers } from './app/types';
import { getRoomId, getUrlQueryParameter } from './app/utils';

const storeAccessToken = (): void => {
	const accessToken = getUrlQueryParameter( 'access-token' );
	if( !accessToken ) {
		throw new Error( 'Missing required URL query parameter: access-token' );
	}
	sessionStorage.setItem( 'access-token', accessToken );
};

const storeRoomId = (): void => {
	const roomId = getUrlQueryParameter( 'room-id' );
	if( !roomId ) {
		throw new Error( 'Missing required URL query parameter: room-id' );
	}
	sessionStorage.setItem( 'room-id', roomId );
};

document.addEventListener( 'DOMContentLoaded', async () => {
	storeAccessToken();
	storeRoomId();

	const { room, participant } = await fetchRoomAndParticipant();

	if( !participant.isRoomCreator && !room.isLive ) {
		return;
	}

	const participantWithLiveInteraction = await fetchParticipantWithLiveInteraction( room.id );

	const liveStream = LiveStream.build( { room, participant, interactionParticipant: participantWithLiveInteraction } );

	const roomControlHandlers: RoomControlHandlers = {
		onCameraOn        : () => liveStream.turnOnCamera(),
		onCameraOff       : () => liveStream.turnOffCamera(),
		onCameraFlip      : () => liveStream.flipCamera(),
		onMicOn           : () => liveStream.turnOnMic(),
		onMicOff          : () => liveStream.turnOffMic(),
		onStartLiveStream : () => liveStream.startBroadcast(),
		onStopLiveStream  : () => liveStream.stopBroadcast(),
		onStopInteraction : () => liveStream.stopInteraction(),
		onStartInteraction: () => liveStream.startInteraction()
	};

	document.querySelector( '#pre-live-button' )!.addEventListener( 'click', async () => {
		await liveStream.init();

		const roomControls = RoomControls.build( room, participant, roomControlHandlers );
		roomControls.load();

		const participantVideo = ParticipantVideo.build();
		if( participantWithLiveInteraction ) {
			participantVideo.show( participantWithLiveInteraction );
			roomControls.reload( { isLiveInteraction: participant.isRoomCreator || participantWithLiveInteraction.id === participant.id } );
		} else {
			participantVideo.clear();
			roomControls.reload( { isLiveInteraction: false } );
		}
	} );

	const roomTopBar = RoomTopBar.build( room );
	roomTopBar.load();

	const socket = new Socket( getRoomId(), {
		onInteractionStart: async (participant: Participant) => {
			await liveStream.handleInteractionStarted( participant );
		},
		onInteractionStop : (participantId: string) => {
			liveStream.handleInteractionStopped( participantId );
		}
	} );
	socket.connect();
} );
