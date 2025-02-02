import { MediaInputStatus, Participant, Room, RoomControlElements, RoomControlHandlers, RoomControlName } from './types';

export class RoomControls {
	private static instance: RoomControls;
	room: Room;
	participant: Participant;
	controlsContainerEl: HTMLElement;
	handlers: RoomControlHandlers;
	controlElements!: RoomControlElements;
	cameraStatus: MediaInputStatus;
	micStatus: MediaInputStatus;
	isExpanded: boolean;
	isLiveInteraction: boolean;

	private constructor(room: Room, participant: Participant, handlers: RoomControlHandlers) {
		this.room = room;
		this.participant = participant;
		this.handlers = handlers;
		this.controlsContainerEl = document.querySelector( '#controls' )!;
		this.cameraStatus = 'on';
		this.micStatus = 'on';
		this.isExpanded = true;
		this.isLiveInteraction = false;
		this.setControls();
	}

	static build(room: Room, participant: Participant, handlers: RoomControlHandlers): RoomControls {
		if( !RoomControls.instance ) {
			RoomControls.instance = new RoomControls( room, participant, handlers );
		}
		return RoomControls.instance;
	}

	static getInstance(): RoomControls {
		if( !RoomControls.instance ) {
			throw new Error( 'RoomControls instance has not been created yet.' );
		}
		return RoomControls.instance;
	}

	load(): void {
		const createDivider = (): HTMLElement => {
			const divider = document.createElement( 'div' );
			divider.classList.add( 'divider' );
			return divider;
		};
		this.controlsContainerEl.innerHTML = '';
		const isLive = this.room.isLive;
		const isRoomCreator = this.participant.isRoomCreator;
		const hasMediaInputControls = isRoomCreator || this.isLiveInteraction;
		const availableControlElements: HTMLElement[] = [
			this.controlElements[this.isExpanded
			                     ? RoomControlName.CollapseControls
			                     : RoomControlName.ExpandControls],
			createDivider()
		];
		if( hasMediaInputControls ) {
			if( this.isExpanded ) {
				availableControlElements.push(
					this.controlElements[this.cameraStatus === 'on'
					                     ? RoomControlName.CameraOn
					                     : RoomControlName.CameraOff],
					this.controlElements[RoomControlName.CameraFlip],
					this.controlElements[this.micStatus === 'on'
					                     ? RoomControlName.MicOn
					                     : RoomControlName.MicOff],
					createDivider()
				);
			}
		}
		if( isRoomCreator && isLive ) {
			if( this.isExpanded ) {
				availableControlElements.push( this.controlElements[RoomControlName.StopLiveStream] );
			}
			availableControlElements.push(
				this.controlElements[this.isLiveInteraction
				                     ? RoomControlName.StopInteraction
				                     : RoomControlName.StartInteraction]
			);
		}
		if( isRoomCreator && !isLive ) {
			availableControlElements.push( this.controlElements[RoomControlName.StartLiveStream] );
		}
		availableControlElements.forEach( el => this.controlsContainerEl.appendChild( el ) );
		this.controlsContainerEl.style.opacity = '1';
	}

	reload(data: { room?: Room, participant?: Participant, cameraStatus?: MediaInputStatus, micStatus?: MediaInputStatus, isLiveInteraction?: boolean }): void {
		this.room = data.room || this.room;
		this.participant = data.participant || this.participant;
		this.cameraStatus = data.cameraStatus || this.cameraStatus;
		this.micStatus = data.micStatus || this.micStatus;
		this.isLiveInteraction = data.isLiveInteraction !== undefined
		                         ? data.isLiveInteraction
		                         : this.isLiveInteraction;
		this.load();
	}

	private setControls(): void {
		const create = (name: RoomControlName, imgName: string, clickHandler: () => void, highlight: boolean = false): HTMLElement => {
			const itemEl = document.createElement( 'div' );
			itemEl.id = `${ name }-control`;
			itemEl.classList.add( 'control-item' );
			highlight && itemEl.classList.add( 'highlight' );
			const imgEl = document.createElement( 'img' );
			imgEl.src = `../assets/${ imgName }.svg`;
			itemEl.appendChild( imgEl );
			imgEl.addEventListener( 'click', clickHandler );
			return itemEl;
		};
		this.controlElements = {
			[RoomControlName.CameraOn]        : create( RoomControlName.CameraOn, 'camera-on', this.handlers.onCameraOn.bind( this ) ),
			[RoomControlName.CameraOff]       : create( RoomControlName.CameraOff, 'camera-off', this.handlers.onCameraOff.bind( this ) ),
			[RoomControlName.CameraFlip]      : create( RoomControlName.CameraFlip, 'camera-flip', this.handlers.onCameraFlip.bind( this ) ),
			[RoomControlName.MicOn]           : create( RoomControlName.MicOn, 'microphone-on', this.handlers.onMicOn.bind( this ) ),
			[RoomControlName.MicOff]          : create( RoomControlName.MicOff, 'microphone-off', this.handlers.onMicOff.bind( this ) ),
			[RoomControlName.StartLiveStream] : create( RoomControlName.StartLiveStream, 'play', this.handlers.onStartLiveStream.bind( this ), true ),
			[RoomControlName.StopLiveStream]  : create( RoomControlName.StopLiveStream, 'stop', this.handlers.onStopLiveStream.bind( this ) ),
			[RoomControlName.StopInteraction] : create( RoomControlName.StopInteraction, 'stop-user-interaction', this.handlers.onStopInteraction.bind( this ) ),
			[RoomControlName.StartInteraction]: create( RoomControlName.StartInteraction, 'start-user-interaction', this.handlers.onStartInteraction.bind( this ), true ),
			[RoomControlName.ExpandControls]  : create( RoomControlName.ExpandControls, 'chevron-up', this.expandControls.bind( this ) ),
			[RoomControlName.CollapseControls]: create( RoomControlName.CollapseControls, 'chevron-down', this.collapseControls.bind( this ) )
		};
	}

	private expandControls(): void {
		this.isExpanded = true;
		this.load();
	}

	private collapseControls(): void {
		this.isExpanded = false;
		this.load();
	}
}
