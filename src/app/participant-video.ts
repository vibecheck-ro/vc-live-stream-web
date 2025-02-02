import { Interaction, Participant } from './types';

export default class ParticipantVideo {
	private static instance: ParticipantVideo;
	participant: Participant | null;
	interaction: Interaction | null;
	videoEl: HTMLVideoElement;
	containerEl: HTMLElement;
	title: HTMLElement;
	time: HTMLElement;

	private constructor(participant?: Participant | null) {
		this.participant = participant ?? null;
		this.interaction = participant?.interactions[0] ?? null;
		this.videoEl = document.querySelector( '#participant-video' )! as HTMLVideoElement;
		this.containerEl = document.querySelector( '#participant-video-container' )!;
		this.title = document.querySelector( '#participant-video-title' )! as HTMLElement;
		this.time = document.querySelector( '#participant-video-time' )! as HTMLElement;
	}

	static build(participant?: Participant | null): ParticipantVideo {
		if( !ParticipantVideo.instance ) {
			ParticipantVideo.instance = new ParticipantVideo( participant );
		}
		return ParticipantVideo.instance;
	}

	static getInstance(): ParticipantVideo {
		if( !ParticipantVideo.instance ) {
			throw new Error( 'ParticipantVideo instance has not been created yet.' );
		}
		return ParticipantVideo.instance;
	}

	show(participant: Participant): void {
		this.participant = participant;
		this.interaction = participant.interactions[0] ?? null;
		this.title.textContent = participant.user.fullName;
		this.time.textContent = 'calculate time and set timeout';
		this.containerEl.style.opacity = '1';
	}

	clear(): void {
		this.participant = null;
		this.interaction = null;
		this.containerEl.style.opacity = '0';
		this.title.textContent = '';
		this.time.textContent = '';
	}
}
