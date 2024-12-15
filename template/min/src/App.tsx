import React, { useEffect, useState } from 'react'
import { DeskThing, ClientManifest } from 'deskthing-client'

const App: React.FC = () => {
    const [manifest, setManifest] = useState<ClientManifest>({})

    useEffect(() => {
        const fetchManifest = async () => {
            const manifest = await DeskThing.getManifest()
            setManifest(manifest)
        }

        fetchManifest()

    }, [])

    return (
        <div className="bg-slate-800 w-screen h-screen flex justify-center items-center">
            <p className="font-bold text-5xl text-white">DeskThing Template App</p>
            <p>{manifest.ip}</p>
        </div>

    )
}

export default App
