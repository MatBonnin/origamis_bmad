type DecoratorFactory = (
  ...args: unknown[]
) => ClassDecorator & MethodDecorator & PropertyDecorator & ParameterDecorator;

const noopDecorator: DecoratorFactory = () => {
  return () => {
    return undefined;
  };
};

export const WebSocketGateway = noopDecorator;
export const WebSocketServer = noopDecorator;
export const SubscribeMessage = noopDecorator;
export const ConnectedSocket = noopDecorator;
export const MessageBody = noopDecorator;

export interface OnGatewayInit {
  afterInit(server?: unknown): void;
}

export interface OnGatewayConnection {
  handleConnection(client: unknown, ...args: unknown[]): void;
}
