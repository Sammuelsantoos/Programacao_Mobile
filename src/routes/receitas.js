import { Router } from 'express';
import { requireRoles } from '../middlewares/auth.js';

export default function receitasRouter(controller, auth) {
  const router = Router();
  // Pública: consulta da farmácia
  router.get('/codigo/:codigo', controller.buscarPorCodigo);

  router.use(auth);
  router.post('/', requireRoles('medico'), controller.emitir);
  router.get('/', controller.listar);
  router.get('/:id', controller.buscarPorId);
  router.put('/:id', requireRoles('medico'), controller.atualizar);
  router.delete('/:id', requireRoles('medico'), controller.cancelar);
  return router;
}
