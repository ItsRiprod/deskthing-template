export const templates = {
    'react-vite-tailwindcss': {
      name: 'React + Vite',
      description: 'Full-featured template with React, Vite, and TailwindCSS',
      dependencies: ['react', 'vite', 'tailwindcss', 'deskthing-server', 'deskthing-client']
    },
    'barebones': {
      name: 'Barebones',
      description: 'Minimal setup for core DeskThing functionality',
      dependencies: ['deskthing-server', 'deskthing-client']
    }
  }
export interface TemplateInterface {
    name: string
    description: string
    dependencies: string[]
  }