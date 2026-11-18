import ProfissionalService from './ProfissionalService.js';
import Medico from '../models/Medico.js';

export default class MedicoService extends ProfissionalService {
  constructor(repository) { super(repository, Medico, 'crm'); }
}
