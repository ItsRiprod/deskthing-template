import { DeskThing } from '@deskthing/server'
export { DeskThing }

const startup = async () => {
    DeskThing.sendLog('Started Up')
}

DeskThing.on('start', startup)