# DetectionLineBrowser

An Angular application for browser compatibility detection and error handling, with Docker support for easy deployment.

## Features

- Detects browser type and version, including LINE browser on iOS/Android.
- Redirects unsupported browsers to a custom error page.
- Handles LINE browser's external browser logic to avoid infinite refresh.
- Responsive layout and Angular Material integration.
- Dockerfile for building and serving the app with http-server.

## Getting Started

### Prerequisites

- Node.js (v18+)
- Docker (optional, for container deployment)

### Local Development

```bash
npm install
npm run start
```

App will be available at `http://localhost:4200`.

### Production Build

```bash
npm run build -- --configuration production
```

### Docker Deployment

Build and run the Docker container:

```bash
docker build -t detection-app .
docker run -p 8080:8080 detection-app
```

App will be available at `http://localhost:8080`.

## Browser Compatibility

- Chrome
- Firefox
- Safari
- Edge
- Samsung Internet
- LINE (special handling for mobile)

Unsupported browsers or outdated versions will be redirected to `/browser-error`.

## Project Structure

- `src/app/service/browser-compatibility.module.ts`: Main compatibility logic.
- `src/app/browser-error.component.ts`: Error page for unsupported browsers.
- `Dockerfile`: Multi-stage build and runtime for deployment.

## License

MIT
