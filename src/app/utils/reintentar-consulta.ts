import { MonoTypeOperatorFunction, retry, throwError, timer } from 'rxjs';

function estadoHttp(error: any): number | null {
  const valor = error?.status ?? error?.Status ?? error?.error?.Status ?? error?.error?.status;
  if (valor === undefined || valor === null || valor === '') return null;
  const estado = Number(valor);
  return Number.isFinite(estado) ? estado : null;
}

export function reintentarConsulta<T>(): MonoTypeOperatorFunction<T> {
  return retry<T>({
    count: Infinity,
    delay: (error, intento) => {
      const estado = estadoHttp(error);
      if (estado !== 0 && (estado === null || estado < 500)) return throwError(() => error);
      return timer(Math.min(750 * 2 ** Math.min(intento - 1, 5), 15000));
    }
  });
}
