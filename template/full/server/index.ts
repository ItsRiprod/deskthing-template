/**
 * Welcome to the template app!
 *
 * This app is meant for developers to be able to reference while making their own apps. Nearly ever DeskThing feature is outlined here in some capacity to demonstrate the practical application of building an app for DeskThing!
 * Any questions, please join the discord server channel and ask there.
 *
 */

/**
 * There are two connectors. @deskthing/server and DeskThing-client
 * To optimize your app, only use @deskthing/server inside the server and DeskThing-client inside the client
 *
 * Every app must both import @deskthing/server and export @deskthing/server to allow the DeskThing Server to link with your app
 */
import { DeskThing } from "@deskthing/server";
import { DESKTHING_EVENTS, SocketData } from "@deskthing/types";

// The following imports are from other files that setup their own functions
import { sendImage } from "./sendingData.ts";
import { setupSettings } from "./settings.ts";
import { userInput } from "./userInput.ts";
import { setupWorkers } from "./workerExample.ts";
import { setupActions } from "./actions.ts";
import { setupTasks } from "./tasks/tasks.ts";

/**
 * 
 *  ----------- Setup ------------------
 * 
 *  Every app needs the following two:
 * DeskThing.on('start', start)
 *
 * DeskThing.on('stop', stop)
 *
 * Both of these should be at the end of your index.ts page. 'start' is triggered when the server is started and 'stop' is triggered when the server is stopped.
 *
 *
 * The following start() function is triggered once the server starts. This is where all initialization should be done.
 */
const start = async () => {
  setupSettings();
  userInput();
  setupWorkers()
  setupActions()
  setupTasks()
  DeskThing.sendLog('Server Started again')

  DeskThing.send({ type: 'sampleData', payload: 'Live Reloading!' })
};

const stop = async () => {
  // Function called when the server is stopped
  DeskThing.sendLog('Server Stopped');
};

// Main Entrypoint of the server
DeskThing.on(DESKTHING_EVENTS.START, start);

// Main exit point of the server
DeskThing.on(DESKTHING_EVENTS.STOP, stop);

const handleRequest = async (socketData: SocketData) => {
  DeskThing.sendLog('Got the request')
  console.log(socketData)
  switch (socketData.request) {
    case 'sampleData':
      DeskThing.send({ type: 'sampleData', payload: 'Example Data' })
      break
    case 'image':
      sendImage()
      break
    default:
      DeskThing.sendError('Invalid Request')
      break
  }
}

DeskThing.on("get", handleRequest)
