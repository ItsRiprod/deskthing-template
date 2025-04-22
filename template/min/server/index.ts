import { DeskThing } from '@deskthing/server'

const startup = async () => {
    DeskThing.sendLog('Started Up')
}

DeskThing.on('start', startup)