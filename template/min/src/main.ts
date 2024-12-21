import { DeskThing } from 'deskthing-client'

const startup = async () => {
    const manifest = await DeskThing.getManifest()
    console.log('Got the manifest ', manifest)
    console.log(`Connected to ${manifest?.ip || ''}:${manifest?.port || ''}`)
}

startup()