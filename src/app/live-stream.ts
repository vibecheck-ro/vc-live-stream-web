import IVSBroadcastClient, { AmazonIVSBroadcastClient, LocalStageStream, Stage, StageEvents, StageParticipantInfo, StageStrategy, StageStream, StreamConfig, StreamType, SubscribeType } from 'amazon-ivs-web-broadcast';
import { VideoComposition } from 'amazon-ivs-web-broadcast/dist/src/broadcast/broadcast-canvas-manager';
import { extractParticipantForLiveInteraction, startLiveStream, stopLiveInteraction, stopLiveStream } from './api';
import ParticipantVideo from './participant-video';
import { RoomControls } from './room-controls';
import { Participant, Room } from './types';
import { getDevices, handlePermissions } from './utils';

type LiveStreamData = {
	room: Room;
	participant: Participant;
	interactionParticipant: Participant | null;
}

const creatorVideoWidth = IVSBroadcastClient.STANDARD_PORTRAIT.maxResolution.width;
const creatorVideoHeight = IVSBroadcastClient.STANDARD_PORTRAIT.maxResolution.height;
const participantVideoWidth = Math.floor( creatorVideoWidth * 0.3 );
const participantVideoHeight = participantVideoWidth + Math.floor( participantVideoWidth * 0.6 );

const CREATOR_VIDEO_TRACK_ID = 'creator-video-track';
const CREATOR_AUDIO_TRACK_ID = 'creator-audio-track';
const PARTICIPANT_VIDEO_TRACK_ID = 'participant-video-track';
const PARTICIPANT_AUDIO_TRACK_ID = 'participant-audio-track';

export default class LiveStream {
	private static instance: LiveStream;
	room: Room;
	participant: Participant;
	interactionParticipant: Participant | null;
	broadcastClient!: AmazonIVSBroadcastClient;
	streamConfig: StreamConfig;
	videoStream: MediaStream | null;
	audioStream: MediaStream | null;
	stage!: Stage;
	stageStrategy!: StageStrategy;
	stageParticipants: StageParticipantInfo[];
	layout: { creator: VideoComposition, participant: VideoComposition };
	canvasEL: HTMLCanvasElement;
	creatorVideoEl: HTMLVideoElement;
	participantVideoEl: HTMLVideoElement;
	preLiveOverlayEl: HTMLDivElement;

	private constructor(data: LiveStreamData) {
		const { room, participant, interactionParticipant } = data;
		this.room = room;
		this.participant = participant;
		this.interactionParticipant = interactionParticipant;
		this.streamConfig = IVSBroadcastClient.STANDARD_PORTRAIT;
		this.videoStream = null;
		this.audioStream = null;
		this.stageParticipants = [];
		this.layout = {
			creator    : { index: 0, width: creatorVideoWidth, height: creatorVideoHeight },
			participant: { index: 1, width: participantVideoWidth, height: participantVideoHeight, x: 100, y: 400 }
		};
		this.canvasEL = document.querySelector( '#live-stream-canvas' ) as HTMLCanvasElement;
		this.creatorVideoEl = document.querySelector( '#creator-video' ) as HTMLVideoElement;
		this.participantVideoEl = document.querySelector( '#participant-video' ) as HTMLVideoElement;
		this.preLiveOverlayEl = document.querySelector( '#pre-live-overlay' ) as HTMLDivElement;
	}

	static build(data: LiveStreamData): LiveStream {
		if( !LiveStream.instance ) {
			LiveStream.instance = new LiveStream( data );
		}
		return LiveStream.instance;
	}

	static getInstance(): LiveStream {
		if( !LiveStream.instance ) {
			throw new Error( 'LiveStream instance not found' );
		}
		return LiveStream.instance;
	}

	async init(): Promise<void> {
		this.preLiveOverlayEl.style.display = 'none';

		if( this.participant.isRoomCreator || this.participant.considerForInteraction ) {
			const permissionsGranted = await handlePermissions();
			if( !permissionsGranted ) {
				alert( 'Permissions not granted' );
				return;
			}
		}

		this.broadcastClient = IVSBroadcastClient.create( { streamConfig: this.streamConfig } );
		this.broadcastClient.attachPreview( this.canvasEL );

		if( this.participant.isRoomCreator || this.participant.hasLiveInteraction ) {
			await this.setVideoAndAudioStreams();
			this.hideCanvasEl();
		} else {
			this.showCanvasEl();
		}

		await this.initStage();
	}

	async startBroadcast(): Promise<void> {
		const { room, participant } = await startLiveStream( this.room.id );
		this.room = room;
		this.participant = participant;
		RoomControls.getInstance()
		            .reload( { room, participant } );
	}

	async stopBroadcast(): Promise<void> {
		const confirmed = confirm( 'End live stream?' );
		if( confirmed ) {
			await stopLiveStream( this.room.id );
			this.room = { ...this.room, isLive: false };
			// TODO send event to react native
		}
	}

	async startInteraction(): Promise<void> {
		this.interactionParticipant = await extractParticipantForLiveInteraction( this.room.id );
	}

	async stopInteraction(): Promise<void> {
		await stopLiveInteraction( this.interactionParticipant!.interactions[0]?.id, 'STOPPED_BY_HOST' );
		this.interactionParticipant = null;
	}

	async turnOnCamera(): Promise<void> {
	}

	async turnOffCamera(): Promise<void> {
	}

	async flipCamera(): Promise<void> {
	}

	async turnOnMic(): Promise<void> {
	}

	async turnOffMic(): Promise<void> {
	}

	async handleInteractionStarted(participant: Participant): Promise<void> {
		this.interactionParticipant = participant;

		if( participant.id === this.participant.id ) {
			this.participant = participant;
			await this.setVideoAndAudioStreams();
			this.hideCanvasEl();
		}

		const stageStrategy = this.createStageStrategy();
		this.stage.replaceStrategy( stageStrategy );

		RoomControls.getInstance()
		            .reload( { isLiveInteraction: true } );
		ParticipantVideo.getInstance()
		                .show( this.interactionParticipant );
	}

	handleInteractionStopped(participantId: string): void {
		this.interactionParticipant = null;

		if( participantId === this.participant.id ) {
			this.participant = { ...this.participant, hasLiveInteraction: false };
			this.videoStream = null;
			this.audioStream = null;
			this.showCanvasEl();
		}

		const stageStrategy = this.createStageStrategy();
		this.stage.replaceStrategy( stageStrategy );

		RoomControls.getInstance()
		            .reload( { isLiveInteraction: false } );
		ParticipantVideo.getInstance()
		                .clear();
	}

	private async initStage(): Promise<void> {
		const strategy = this.createStageStrategy();
		this.stage = new Stage( this.participant.ivsToken, strategy );

		this.stage.on( StageEvents.STAGE_PARTICIPANT_STREAMS_ADDED, async (participant: StageParticipantInfo, streams: StageStream[]) => {
			if( !this.stageParticipants.some( p => p.id === participant.id ) ) {
				this.stageParticipants.push( participant );
				this.renderParticipant( participant, streams );
				await this.renderAudioToBroadcastClient( participant, streams.find( s => s.streamType === StreamType.AUDIO ) );
				await this.renderVideoToBroadcastClient( participant, streams.find( s => s.streamType === StreamType.VIDEO ) );
				await this.updateVideoCompositionsOnBroadcastClient();
			}
		} );

		this.stage.on( StageEvents.STAGE_PARTICIPANT_STREAMS_REMOVED, async (participant: StageParticipantInfo, streams: StageStream[]) => {
			if( this.stageParticipants.some( p => p.id === participant.id ) ) {
				const isRoomCreator = participant.userId === this.room.creator.id;
				const videoEl = isRoomCreator
				                ? this.creatorVideoEl
				                : this.participantVideoEl;
				const mediaStream = videoEl?.srcObject as MediaStream;
				const videoTrackId = isRoomCreator
				                     ? CREATOR_VIDEO_TRACK_ID
				                     : PARTICIPANT_VIDEO_TRACK_ID;
				const audioTrackId = isRoomCreator
				                     ? CREATOR_AUDIO_TRACK_ID
				                     : PARTICIPANT_AUDIO_TRACK_ID;

				streams.forEach( stream => {
					if( this.broadcastClient.getVideoInputDevice( videoTrackId ) && stream.streamType === StreamType.VIDEO ) {
						this.broadcastClient.removeVideoInputDevice( videoTrackId );
					}
					if( this.broadcastClient.getAudioInputDevice( audioTrackId ) && stream.streamType === StreamType.AUDIO ) {
						this.broadcastClient.removeAudioInputDevice( audioTrackId );
					}
					mediaStream?.removeTrack( stream.mediaStreamTrack );
				} );

				if( videoEl && mediaStream ) {
					videoEl.srcObject = mediaStream;
				}

				const participantIndex = this.stageParticipants.findIndex( p => p.id === participant.id );
				this.stageParticipants.splice( participantIndex, 1 );
				await this.updateVideoCompositionsOnBroadcastClient();
			}
		} );

		await this.stage.join();
	}

	private createStageStrategy(): StageStrategy {
		const roomCreatorUserId = this.room.creator.id;
		const interactionParticipantUserId = this.interactionParticipant?.user.id;
		const shouldPublish = this.participant.isRoomCreator || this.participant.hasLiveInteraction;
		console.log( `Should publish: ${ shouldPublish }` );
		const videoTrack = this.videoStream?.getVideoTracks()[0];
		const audioTrack = this.audioStream?.getAudioTracks()[0];
		console.log( videoTrack, audioTrack );

		return {
			shouldSubscribeToParticipant(participant: StageParticipantInfo): SubscribeType {
				if( participant.userId === roomCreatorUserId || participant.userId === interactionParticipantUserId ) {
					console.log( `Subscribing to room creator or interaction participant: ${ participant.userId }` );
					return SubscribeType.AUDIO_VIDEO;
				} else {
					return SubscribeType.NONE;
				}
			},
			shouldPublishParticipant(_: StageParticipantInfo): boolean {
				if( shouldPublish ) {
					console.log( 'Publishing' );
				}
				return shouldPublish;
			},
			stageStreamsToPublish(): LocalStageStream[] {
				if( shouldPublish && videoTrack && audioTrack ) {
					return [
						new LocalStageStream( audioTrack ),
						new LocalStageStream( videoTrack )
					];
				} else {
					return [];
				}
			}
		};
	}

	private async createVideoStream(videoDeviceId: string): Promise<MediaStream> {
		return navigator.mediaDevices.getUserMedia(
			{
				video: {
					deviceId: {
						exact: videoDeviceId
					},
					width   : {
						ideal: this.streamConfig.maxResolution.width,
						max  : this.streamConfig.maxResolution.width
					},
					height  : {
						ideal: this.streamConfig.maxResolution.height,
						max  : this.streamConfig.maxResolution.height
					}
				}
			} );
	}

	private async createAudioStream(audioDeviceId: string): Promise<MediaStream> {
		return await navigator.mediaDevices.getUserMedia(
			{
				audio: {
					deviceId: audioDeviceId
				}
			} );
	}

	private renderParticipant(participant: StageParticipantInfo, streams: StageStream[]): void {
		// let streamsToLoad = streams;
		// if( participant.isLocal ) {
		// 	streamsToLoad = streams.filter( s => s.streamType === StreamType.VIDEO );
		// }
		// if( streamsToLoad.length === 0 ) {
		// 	return;
		// }
		//
		// const videoEl = participant.userId === this.room.creator.id
		//                 ? this.creatorVideoEl
		//                 : this.participantVideoEl;
		// const mediaStream = videoEl.srcObject as MediaStream | undefined || new MediaStream();
		// streamsToLoad.forEach( stream => mediaStream.addTrack( stream.mediaStreamTrack ) );
		// videoEl.srcObject = mediaStream;
		// console.log( `Participant ${ participant.userId } rendered on screen` );
	}

	private async renderAudioToBroadcastClient(participant: StageParticipantInfo, stream?: StageStream): Promise<void> {
		if( !stream?.mediaStreamTrack ) {
			return;
		}

		const mediaStream = new MediaStream( [ stream.mediaStreamTrack ] );
		const audioTrackId = participant.userId === this.room.creator.id
		                     ? CREATOR_AUDIO_TRACK_ID
		                     : PARTICIPANT_AUDIO_TRACK_ID;
		if( this.broadcastClient.getAudioInputDevice( audioTrackId ) && stream.streamType === StreamType.AUDIO ) {
			this.broadcastClient.removeAudioInputDevice( audioTrackId );
		}
		await this.broadcastClient.addAudioInputDevice( mediaStream, audioTrackId );
		console.log( `Participant ${ participant.userId } audio added to broadcast client` );
	}

	private async renderVideoToBroadcastClient(participant: StageParticipantInfo, stream?: StageStream): Promise<void> {
		if( !stream?.mediaStreamTrack ) {
			return;
		}

		const mediaStream = new MediaStream( [ stream.mediaStreamTrack ] );
		const isRoomCreator = participant.userId === this.room.creator.id;
		const layout = isRoomCreator
		               ? this.layout.creator
		               : this.layout.participant;
		const videoTrackId = isRoomCreator
		                     ? CREATOR_VIDEO_TRACK_ID
		                     : PARTICIPANT_VIDEO_TRACK_ID;
		if( this.broadcastClient.getVideoInputDevice( videoTrackId ) && stream.streamType === StreamType.VIDEO ) {
			this.broadcastClient.removeVideoInputDevice( videoTrackId );
		}
		await this.broadcastClient.addVideoInputDevice( mediaStream, videoTrackId, layout );
		console.log( `Participant ${ participant.userId } video added to broadcast client` );
	}

	private async updateVideoCompositionsOnBroadcastClient(): Promise<void> {
		const creator = this.stageParticipants.find( (participant) => participant.isLocal )!;
		const participant = this.stageParticipants.find( (participant) => !participant.isLocal );
		this.broadcastClient.updateVideoDeviceComposition( CREATOR_VIDEO_TRACK_ID, this.layout.creator );
		if( participant ) {
			this.broadcastClient.updateVideoDeviceComposition( PARTICIPANT_VIDEO_TRACK_ID, this.layout.participant );
		}
	}

	private async setVideoAndAudioStreams(): Promise<void> {
		const { videoDevices, audioDevices } = await getDevices();
		if( videoDevices.length === 0 ) {
			alert( 'No video devices found' );
		}
		if( audioDevices.length === 0 ) {
			alert( 'No audio devices found' );
		}
		this.videoStream = await this.createVideoStream( videoDevices[0].deviceId );
		this.audioStream = await this.createAudioStream( audioDevices[0].deviceId );
	}

	private showCanvasEl(): void {
		// this.canvasEL.style.display = 'block';
		// this.creatorVideoEl.style.opacity = '0';
		// this.participantVideoEl.style.display = 'none';
	}

	private hideCanvasEl(): void {
		// this.canvasEL.style.display = 'none';
		// this.creatorVideoEl.style.opacity = '1';
		// this.participantVideoEl.style.display = 'block';
	}

	private removeInteractionParticipantFromStage(participantId: string): void {
	}
}
