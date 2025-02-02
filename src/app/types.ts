export type Devices = {
	videoDevices: MediaDeviceInfo[],
	audioDevices: MediaDeviceInfo[]
};

export type RoomWithParticipant = {
	room: Room;
	participant: Participant;
}

export type Room = {
	id: string;
	topic: string;
	shareableId: string;
	ivsRtmpsEndpoint: string;
	ivsStreamKey: string;
	creator: User;
	isLive: boolean;
	isPaused: boolean;
	isPending: boolean;
	isPrivate: boolean;
}

export type Participant = {
	id: string;
	ivsId: string;
	ivsToken: string;
	user: User;
	isRoomCreator: boolean;
	hasLiveInteraction: boolean;
	interactions: Interaction[];
	considerForInteraction: boolean;
}

export type Interaction = {
	id: string;
	startedAt: Date | null;
}

export type User = {
	id: string;
	username: string;
	type: UserType;
	fullName: string;
	avatar: string | null;
}

export enum UserType {
	Creator = 'CREATOR',
	Member  = 'MEMBER'
}

export type RoomControlHandlers = {
	onCameraOn: () => void | Promise<void>;
	onCameraOff: () => void | Promise<void>;
	onCameraFlip: () => void | Promise<void>;
	onMicOn: () => void | Promise<void>;
	onMicOff: () => void | Promise<void>;
	onStartLiveStream: () => void | Promise<void>;
	onStopLiveStream: () => void | Promise<void>;
	onStopInteraction: () => void | Promise<void>;
	onStartInteraction: () => void | Promise<void>;
}

export enum RoomControlName {
	CameraOn         = 'cameraOn',
	CameraOff        = 'cameraOff',
	CameraFlip       = 'cameraFlip',
	MicOn            = 'micOn',
	MicOff           = 'micOff',
	StartLiveStream  = 'startLiveStream',
	StopLiveStream   = 'stopLiveStream',
	StopInteraction  = 'stopInteraction',
	StartInteraction = 'startInteraction',
	ExpandControls   = 'expandControls',
	CollapseControls = 'collapseControls'
}

export type RoomControlElements = { [key in RoomControlName]: HTMLElement }

export type MediaInputStatus = 'on' | 'off';

export interface ILiveStream {
	turnOnCamera: () => Promise<void>;
	turnOffCamera: () => Promise<void>;
	flipCamera: () => Promise<void>;
	turnOnMic: () => Promise<void>;
	turnOffMic: () => Promise<void>;
}

export type RoomSocketHandlers = {
	onInteractionStart: (participant: Participant) => void;
	onInteractionStop: (participantId: string) => void;
}
