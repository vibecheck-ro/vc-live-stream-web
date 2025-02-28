import { io } from 'socket.io-client';
import { API_URL } from './constants';
import { Participant, RoomSocketHandlers } from './types';

export default class Socket {
	roomId: string;
	handlers: RoomSocketHandlers;

	constructor(roomId: string, handlers: RoomSocketHandlers) {
		this.roomId = roomId;
		this.handlers = handlers;
	}

	connect(): void {
		const socket = io( `${ API_URL }:9092` );
		socket.on( 'interaction:start', (data: Participant) => {
			this.handlers.onInteractionStart( data );
			console.log( `Participant ${ data.id } extracted for live interaction.` );
		} );
		socket.on( 'interaction:stop', (data: { participantId: string }) => {
			this.handlers.onInteractionStop( data.participantId );
			console.log( `Participant ${ data.participantId } stopped.` );
		} );

	}
}
