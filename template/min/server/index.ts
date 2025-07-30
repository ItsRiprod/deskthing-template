import { DeskThing } from '@deskthing/server'
import { DESKTHING_EVENTS } from '@deskthing/types'

const startup = async () => {
    console.log('Starting Up App')
}

DeskThing.on(DESKTHING_EVENTS.START, startup)