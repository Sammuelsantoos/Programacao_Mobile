import ProfissionalController from './ProfissionalController.js';

export default class MedicoController extends ProfissionalController {
  constructor(medicoService, authService) { super(medicoService, authService, 'medico'); }
}
