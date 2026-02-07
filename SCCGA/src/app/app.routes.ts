import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login';
import { DashboardComponent } from './features/dashboard/dashboard';
import { CrearMaquileroComponent } from './features/maquileros/crear-maquilero/crear-maquilero';
import { RegistrosMaquilerosComponent } from './features/maquileros/registros-maquileros/registros-maquileros';
import { CrearEmpresaComponent } from './features/empresas/crear-empresa/crear-empresa';
import { RegistrosEmpresaComponent } from './features/empresas/registros-empresa/registros-empresa';
import { EditarEmpresaComponent } from './features/empresas/editar-empresa/editar-empresa';
import { EditarMaquileroComponent } from './features/maquileros/editar-maquilero/editar-maquilero';

// --- CORRECCIÓN 1: Importar el nombre correcto (Singular) ---
import { CrearDisenoComponent } from './features/disenos/crear-disenos/crear-disenos'; 

import { CatalogoComponent } from './features/disenos/catalogo/catalogo';
import { CrearFormatoComponent } from './features/formatos/crear-formato/crear-formato';
import { ControlgeneralComponent } from './features/controlgeneral/controlgeneral/controlgeneral';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { 
      path: 'dashboard',
      component: DashboardComponent,
      children: [
        // RUTA DE CONTROL GENERAL
          { path: 'controlgeneral', component: ControlgeneralComponent },
          
        // RUTA DE MAQUILEROS
          { path: 'crear-maquilero', component: CrearMaquileroComponent },
          { path: 'registros-maquileros', component: RegistrosMaquilerosComponent },
          { path: 'editar-maquilero/:id', component: EditarMaquileroComponent },
          
        // RUTA DE EMPRESAS
          { path: 'crear-empresa', component: CrearEmpresaComponent },
          { path: 'registros-empresa', component: RegistrosEmpresaComponent },
          { path: 'editar-empresa/:id', component: EditarEmpresaComponent },
          
        // RUTA DE DISEÑOS
          // 1. Crear Nuevo (Usamos la clase singular)
          { path: 'crear-disenos', component: CrearDisenoComponent },
          
          // 2. Ver Catálogo
          { path: 'catalogo', component: CatalogoComponent },
          
          // 3. Editar (CORRECCIÓN 2: Quitamos 'dashboard/' porque ya estamos dentro de hijos)
          { path: 'catalogo/:id', component: CrearDisenoComponent }, 
          
        // RUTA DE FORMATOS
          { path: 'crear-formato', component: CrearFormatoComponent }
      ]
    },

    // Redirección inicial
    { path: '', redirectTo: 'login', pathMatch: 'full' }
];