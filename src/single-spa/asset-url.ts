// Construye la URL de assets sobre la ruta pública de webpack en single-spa.

export function assetUrl(url: string): string {
  // @ts-ignore: webpack inyecta la ruta pública en tiempo de ejecución.
  const publicPath = __webpack_public_path__;
  const publicPathSuffix = publicPath.endsWith('/') ? '' : '/';
  const urlPrefix = url.startsWith('/') ? '' : '/';

  return `${publicPath}${publicPathSuffix}assets${urlPrefix}${url}`;
}
