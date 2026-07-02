import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'futgestao-secret';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.warn(`[Auth] No token provided for ${req.method} ${req.path}`);
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  
  if (!token || token.startsWith('local-token-') || token.split('.').length !== 3) {
    if (token?.startsWith('local-token-')) {
      console.log(`[Auth] Client in local mode (${token.substring(0, 20)}...) on ${req.method} ${req.path}`);
    }
    return res.status(401).json({ message: 'Token de servidor inválido ou ausente. Por favor, faça login novamente.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    console.log(`[Auth] Valid token for user ${decoded.id} on ${req.method} ${req.path}`);
    (req as any).user = decoded;
    next();
  } catch (error) {
    console.error(`[Auth] Invalid token for ${req.method} ${req.path}:`, error);
    return res.status(401).json({ message: 'Invalid token' });
  }
};
