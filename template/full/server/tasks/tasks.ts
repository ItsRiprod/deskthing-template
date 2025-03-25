import { DeskThing } from "@deskthing/server";
import { DESKTHING_EVENTS } from "@deskthing/types";
import { taskList } from "./taskList";

export const setupTasks = () => {
  // Initialize the tasks
  DeskThing.sendDebug('Setting up tasks')
  DeskThing.tasks.initTasks(taskList);

};

DeskThing.on(DESKTHING_EVENTS.TASKS, (data) => {
  switch (data.request) {
    case "task":
      // A single task's update
      DeskThing.sendLog("Task Updated" + data.payload.id);
      break;
    case "update":
      // All of the registered tasks
      DeskThing.sendLog("Tasks Updated");
      break;
    case "step":
      // A single step updated
      DeskThing.sendLog("Step Updated" + data.payload.id);
      break;
  }
});
