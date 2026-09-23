import { criarApp } from './app.js';

const PORT = process.env.PORT || 3000;
criarApp().listen(PORT, () => {
  console.log(`🚀 Servidor em http://localhost:${PORT}`);
});