import { Room } from './types';

export class RoomTopBar {
	private static instance: RoomTopBar;
	room: Room;
	titleEl: HTMLElement;

	private constructor(room: Room) {
		this.room = room;
		this.titleEl = document.querySelector( '#title' )!;
	}

	static build(room: Room): RoomTopBar {
		if( !RoomTopBar.instance ) {
			RoomTopBar.instance = new RoomTopBar( room );
		}
		return RoomTopBar.instance;
	}

	static getInstance(): RoomTopBar {
		if( !RoomTopBar.instance ) {
			throw new Error( 'RoomTopBar instance has not been created yet.' );
		}
		return RoomTopBar.instance;
	}

	load(): void {
		this.titleEl.textContent = this.room.topic;
		document.querySelector( '#reload-page-btn' )!.addEventListener( 'click', () => {
			console.log( 'Reloading page...' );
			window.location.reload();
		} );
	}
}
