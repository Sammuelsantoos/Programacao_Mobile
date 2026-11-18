export const profiles = {
  medico: {
    label: 'Médico(a)', shortLabel: 'Médico', registration: 'CRM', registrationField: 'crm',
    routes: ['inicio', 'receita', 'pacientes', 'historico'],
    resources: ['receitas', 'pacientes', 'medicamentos', 'retiradas'],
    primaryRoute: 'receita', primaryLabel: 'Nova receita', primaryIcon: 'prescription',
  },
  farmaceutico: {
    label: 'Farmacêutico(a)', shortLabel: 'Farmacêutico', registration: 'CRF', registrationField: 'crf',
    routes: ['inicio', 'dispensar', 'estoque', 'historico'],
    resources: ['receitas', 'medicamentos', 'retiradas'],
    primaryRoute: 'dispensar', primaryLabel: 'Dispensar receita', primaryIcon: 'pill',
  },
};

export function canAccess(perfil, route) { return profiles[perfil]?.routes.includes(route) || false; }
