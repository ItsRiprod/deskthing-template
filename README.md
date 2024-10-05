# Deskthing-Template

## Overview

This template provides a starting point for creating an app for the DeskThingServer application. It includes a basic project structure and configuration to help you get started quickly.

## Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)

## Getting Started

1. Initialize this repository:
   
   ```sh
   npm create deskthing@latest
   ```
   

2. Follow the setup and step into your app:
   

3. Start the development server:
   
   npm run dev
   

## Project Structure

- `src/`: Contains the React application source code. This is the webpage
- `public/`: Static assets and HTML template. This includes your manifest.json
- `server/`: Your backend code that runs the core of your app

## Available Scripts

- `npm run dev`: Starts the development server
- `npm run build`: Builds the app into /dist where you can zip the files and load them into the DeskThingServer

## Customizing the Template

1. Update the `package.json` or `/public/manifest.json` files with your project details if they change
2. Modify the `index.html` file to change the app title and meta information
3. Start building your React components in the `src/components/` directory
4. Customize your server in `server/index.ts`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

# How to use

For instructions on setting up and running the client (webpage), refer to the deskthing-client tool
https://github.com/ItsRiprod/deskthing-app-client

For instructions on setting up and running the server, refer to the deskthing-server tool
https://github.com/ItsRiprod/deskthing-app-server
