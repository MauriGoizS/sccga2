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
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
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