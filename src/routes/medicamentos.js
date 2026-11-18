import { Router } from 'express'
import { requireRoles } from '../middlewares/auth.js';

export default function medicamentosRouter(controller, auth) {
    const router = Router()
    router.use(auth)
    router.post('/', requireRoles('farmaceutico'), controller.cadastrar)
    router.get('/', controller.listar)
    router.get('/:id', controller.buscarPorId)
    router.put('/:id', requireRoles('farmaceutico'), controller.atualizar)
    router.delete('/:id', requireRoles('farmaceutico'), controller.remover)
    return router
}
