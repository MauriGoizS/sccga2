import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const platformId = inject(PLATFORM_ID);

  // Verificamos si estamos en el navegador para poder usar localStorage
    if (isPlatformBrowser(platformId)) {
    const token = localStorage.getItem('token');

    if (token) {
        // Clonamos la petición y le pegamos el encabezado Authorization
        const cloned = req.clone({
        setHeaders: {
            Authorization: `Bearer ${token}`
        }
    });
        return next(cloned);
    }
}

    return next(req);
};