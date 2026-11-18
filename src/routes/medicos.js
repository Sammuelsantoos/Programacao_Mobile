import { Router } from "express";
import { requireRoles, requireOwnAccount } from '../middlewares/auth.js';

export default function medicosRouter(controller, auth) {
  const router = Router();
  router.post("/", controller.cadastrar);
  router.post("/login", controller.login);
  router.use(auth, requireRoles('medico'));
  router.get("/", controller.listar);
  router.get("/:id", requireOwnAccount, controller.buscarPorId);
  router.put("/:id", requireOwnAccount, controller.atualizar);
  router.delete("/:id", requireOwnAccount, controller.remover);
  return router;
}
