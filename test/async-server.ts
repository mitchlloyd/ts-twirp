import * as http from 'http';

interface HTTPHandler {
  (request: http.IncomingMessage, response: http.ServerResponse): void;
}

export class AsyncServer {
  public handler: HTTPHandler = () => {};
  private server: http.Server;

  constructor(handler?: HTTPHandler) {
    if (handler) {
      this.handler = handler;
    }

    this.server = http.createServer((req, res) => {
      this.handler(req, res);
    });

    this.server.on('clientError', (err, socket) => {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    });
  }

  listen(): Promise<AsyncServer> {
    return new Promise((resolve) => {
      this.server.listen(8000, () => {
        resolve(this);
      });
    });
  }

  close() {
    return new Promise((resolve) => {
      this.server.close(resolve);
    });
  }
}
