import { UnauthorizedError, ForbiddenError } from "../utils/errors.js";

export function makeAuthMiddleware(authService) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) return next(new UnauthorizedError("Token não informado"));

    const match = /^Bearer (\S+)$/i.exec(header);
    if (!match) return next(new UnauthorizedError('Token inválido ou expirado'));
    try {
      req.usuario = authService.verificarToken(match[1]);
      if (req.usuario.perfil === 'medico') req.medico = req.usuario;
      next();
    } catch {
      next(new UnauthorizedError("Token inválido ou expirado"));
    }
  };
}

export function requireRoles(...perfis) {
  return (req, _res, next) => perfis.includes(req.usuario?.perfil) ? next() : next(new ForbiddenError());
}

export function requireOwnAccount(req, _res, next) {
  if (Number(req.params.id) !== req.usuario.id) return next(new ForbiddenError('Você só pode acessar sua própria conta'));
  next();
}
