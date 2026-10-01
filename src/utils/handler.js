/** Envolve o handler de um controller capturando exceções síncronas. */
export const handler = (fn) => (req, res, next) => {
  try { fn(req, res, next); }
  catch (err) { next(err); }
};