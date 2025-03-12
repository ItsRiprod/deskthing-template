import React, { useEffect, useState } from 'react'
import { DeskThing } from '@deskthing/client'
import { AppSettings, SocketData } from '@deskthing/types'

const App: React.FC = () => {
    const [settings, setSettings] = useState<AppSettings>()
    useEffect(() => {        
        
        const initializeSettings = async () => {
            const settings = await DeskThing.getSettings()
            if (settings) {
                setSettings(settings)
            }
            DeskThing.send({ type: 'get', request: 'sampleData' })
        }
        const onAppSettings = async (data: SocketData) => {
            if (data.payload) {
                setSettings(data.payload)
            }
        }

        initializeSettings()
        
        const removeSettingsListener = DeskThing.on('settings', onAppSettings)

        return () => {
            removeSettingsListener()
        }
    }, [])

    return (
        <div className="bg-black gap-2 flex-col w-screen h-screen flex justify-center items-center">
            <p className="font-bold text-5xl text-white">DeskThing App</p>
            <div className="text-2xl font-semibold">
                {settings ? (
                    <div style={{color: settings?.color?.value as string|| 'white'}}>Current Selected Color: {settings?.color?.value|| 'unknown'}</div>
                ) : (
                    <p>Loading Settings</p>
                )}
            </div>
        </div>

    )
}

export default App