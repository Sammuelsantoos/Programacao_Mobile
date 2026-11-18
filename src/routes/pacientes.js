import { Router } from 'express';
import { requireRoles } from '../middlewares/auth.js';

export default function pacientesRouter(controller, auth) {
  const router = Router();
  router.use(auth, requireRoles('medico'));
  router.post('/', controller.cadastrar);
  router.get('/', controller.listar);
  router.get('/:id', controller.buscarPorId);
  router.put('/:id', controller.atualizar);
  router.delete('/:id', controller.remover);
  return router;
}
