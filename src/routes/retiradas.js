import { Router } from 'express';
import { requireRoles } from '../middlewares/auth.js';

export default function retiradasRouter(controller, auth) {
  const router = Router();
  router.use(auth);
  router.post('/', requireRoles('farmaceutico'), controller.registrar);
  router.get('/', controller.listar);
  router.get('/:id', controller.buscarPorId);
  return router;
}
