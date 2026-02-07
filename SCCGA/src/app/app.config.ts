import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http'; // Importar withInterceptors
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor'; // Importar tu interceptor

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // Aquí es donde sucede la magia:
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor]) 
    )
  ]
};