import * as http from 'http';

interface HTTPHandler {
  (request: http.IncomingMessage, response: http.ServerResponse): void;
}

export class AsyncServer {
  private server: http.Server;

  constructor(handler: HTTPHandler) {
    this.server = http.createServer((req, res) => handler(req, res));

    this.server.on('clientError', (err, socket) => {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    });
  }

  listen(): Promise<http.Server> {
    return new Promise((resolve) => { 
      this.server.listen(8000, () => {
        resolve(this.server);
      });
    });
  }

  close() {
    return new Promise((resolve) => {
      this.server.close(resolve);
    });
  }
}
