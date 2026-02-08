import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');

  console.log('👮 GUARDIA ACTIVADO verificando ruta:', state.url);
  console.log('🔑 ¿Existe token?:', token ? 'SÍ' : 'NO', token);

  if (token) {
    console.log('✅ Pasa. El usuario tiene llave.');
    return true;
  } else {
    console.log('⛔ ALTO. No hay token. Redirigiendo al Login.');
    router.navigate(['/login']);
    return false;
  }
};