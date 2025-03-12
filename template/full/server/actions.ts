import { DeskThing } from "@deskthing/server"
import { Action } from "@deskthing/types"

export const setupActions = () => {
    const Action: Action = {
        id: "testAction",
        name: "Example Action",
        icon: "WandIcon",
        enabled: true,
        version: "1.0.0",
        description: "This is an example action",
        version_code: 1,
        value: "Option1",
        value_options: ['Option1', 'Option2', 'Option3', 'Option4'],
        value_instructions: 'Set the preset to one of the options'
    }

    DeskThing.registerAction(Action)
}