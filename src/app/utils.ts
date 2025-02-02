import { Devices } from './types';

export const handlePermissions = async () => {
	let permissions = { video: false, audio: false };
	try {
		const stream = await navigator.mediaDevices.getUserMedia( { video: true, audio: true } );
		stream.getTracks()
		      .forEach( track => track.stop() );
		permissions = { video: true, audio: true };
	} catch( err ) {
		console.error( 'Failed to get video and audio permissions', err );
	}

	return permissions.video && permissions.audio;
};

export const getDevices = async (): Promise<Devices> => {
	const devices = await navigator.mediaDevices.enumerateDevices();
	return {
		videoDevices: devices.filter( device => device.kind === 'videoinput' ),
		audioDevices: devices.filter( device => device.kind === 'audioinput' )
	};
};

export const getUrlQueryParameter = (name: string): string | null => {
	const searchParams = new URLSearchParams( window.location.search );
	return searchParams.get( name );
};

export const getAccessToken = (): string => {
	const accessToken = sessionStorage.getItem( 'access-token' );
	if( accessToken ) {
		return accessToken;
	}
	throw new Error( 'Missing access token' );
};

export const getRoomId = (): string => {
	const roomId = sessionStorage.getItem( 'room-id' );
	if( roomId ) {
		return roomId;
	}
	throw new Error( 'Missing room id' );
};
