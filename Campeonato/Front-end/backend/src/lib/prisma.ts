// Mock Prisma client to allow the legacy backend routes to compile without @prisma/client.
// This is essential for deploying successfully to serverless platforms like Vercel.

const mockHandler: ProxyHandler<any> = {
  get(target, prop) {
    if (prop === '$connect' || prop === '$disconnect') {
      return () => Promise.resolve();
    }
    if (prop === '$transaction') {
      return (cb: any) => cb(new Proxy({}, mockHandler));
    }
    return new Proxy({}, mockHandler);
  },
  apply(target, thisArg, argumentsList) {
    return Promise.resolve(null);
  }
};

const prisma = new Proxy({}, mockHandler) as any;

export default prisma;

