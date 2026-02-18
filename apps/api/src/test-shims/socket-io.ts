export class Server {
  to() {
    return this;
  }

  emit() {
    return true;
  }
}

export class Socket {
  handshake: {
    auth?: Record<string, unknown>;
    query?: Record<string, unknown>;
  } = {};
  data: Record<string, unknown> = {};

  join() {
    return true;
  }

  disconnect() {
    return true;
  }
}
