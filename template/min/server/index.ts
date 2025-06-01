import { DeskThing } from '@deskthing/server'

const startup = async () => {
    console.log('Starting Up App')
}

DeskThing.on('start', startup)