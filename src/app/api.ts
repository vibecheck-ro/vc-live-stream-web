import { API_URL } from './constants';
import { Participant, Room, RoomWithParticipant } from './types';
import { getAccessToken, getRoomId } from './utils';

const apiUrl = API_URL.includes( 'localhost' )
               ? `${ API_URL }:8080/v1`
               : `${ API_URL }/v1`;

export const fetchRoomAndParticipant = async (): Promise<RoomWithParticipant> => {
	const url = `${ apiUrl }/rooms/list/shareable/${ getRoomId() }`;
	const response = await fetch( url, { headers: getHeaders() } );
	const payload = await response.json();
	return payload.data;
};

export const fetchParticipantWithLiveInteraction = async (roomId: string): Promise<Participant | null> => {
	const url = `${ apiUrl }/rooms/${ roomId }/participants/interactions/ongoing`;
	const response = await fetch( url, { headers: getHeaders() } );
	const payload = await response.json();
	return payload.data;
};

export const startLiveStream = async (roomId: string): Promise<RoomWithParticipant> => {
	const url = `${ apiUrl }/rooms/live-stream/start`;
	const body = JSON.stringify( { roomId } );
	const response = await fetch( url, { method: 'POST', body, headers: getHeaders() } );
	const payload = await response.json();
	return payload.data;
};

export const stopLiveStream = async (roomId: string): Promise<Room> => {
	const url = `${ apiUrl }/rooms/live-stream/stop`;
	const body = JSON.stringify( { roomId } );
	const response = await fetch( url, { method: 'POST', body, headers: getHeaders() } );
	const payload = await response.json();
	return payload.data;
};

export const extractParticipantForLiveInteraction = async (roomId: string): Promise<Participant> => {
	const url = `${ apiUrl }/rooms/participants/extract-for-interaction`;
	const body = JSON.stringify( { roomId } );
	const response = await fetch( url, { method: 'POST', body, headers: getHeaders() } );
	const payload = await response.json();
	return payload.data;
};

export const stopLiveInteraction = async (interactionId: string, stopReason: string): Promise<void> => {
	const url = `${ apiUrl }/rooms/interactions/stop`;
	const body = JSON.stringify( { interactionId, stopReason } );
	const response = await fetch( url, { method: 'POST', body, headers: getHeaders() } );
	const payload = await response.json();
	return payload.data;
};

const getHeaders = () => {
	const headers = new Headers();
	headers.append( 'Authorization', `Bearer ${ getAccessToken() }` );
	headers.append( 'Content-Type', 'application/json' );
	headers.append( 'X-CORRELATION-ID', 'f35aa4d8-a665-4ec8-8518-0b4d46f7e99d' );
	return headers;
};
