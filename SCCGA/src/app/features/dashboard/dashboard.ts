import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent {

  private authService = inject(AuthService);
  public router = inject(Router);

  // Variables de control visual
  activeMenu: string | null = null;
  isSidebarOpen: boolean = false;

  logout() {
    console.log('🔘 Botón Logout presionado');

    // Verificamos antes de borrar
    const antes = localStorage.getItem('token');
    console.log('Estado antes de borrar:', antes);

    // Borramos a la fuerza
    localStorage.removeItem('token');
    // localStorage.clear(); // Descomenta esta línea si quieres borrar ABSOLUTAMENTE TODO

    // Verificamos después de borrar
    const despues = localStorage.getItem('token');
    console.log('Estado después de borrar:', despues);

    if (!despues) {
      console.log('👋 Token eliminado correctamente. Redirigiendo...');
      this.router.navigate(['/login']);
    } else {
      console.error('⚠️ ALERTA: El token sigue ahí. Algo impide borrarlo.');
    }
  }

  // Abre o cierra los submenús (ej: Maquileros -> Ver Lista)
  toggleMenu(menuName: string) {
    this.activeMenu = this.activeMenu === menuName ? null : menuName;
  }

  // Abre o cierra el sidebar completo (botón hamburguesa)
  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  // NUEVA FUNCIÓN: Cierra el menú automáticamente al navegar en celular
  closeSidebarIfMobile() {
    // Verificamos si existe 'window' (por si usas SSR) y el ancho de pantalla
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      this.isSidebarOpen = false;
    }
  }
}