import { DeskThing } from "@deskthing/server";
import { DESKTHING_EVENTS } from "@deskthing/types";
// Doing this is required in order for the server to link with DeskThing
export { DeskThing };


const start = async () => {
  DeskThing.sendLog('Server Started!')

  const settings: any = {
    color: {
      label: 'App Color',
      type: 'color',
      value: '#000000'
    }
  }

  DeskThing.initSettings(settings)
};

const stop = async () => {
  // Function called when the server is stopped
  DeskThing.sendLog('Server Stopped');
};

// Main Entrypoint of the server
DeskThing.on(DESKTHING_EVENTS.START, start);

// Main exit point of the server
DeskThing.on(DESKTHING_EVENTS.STOP, stop);