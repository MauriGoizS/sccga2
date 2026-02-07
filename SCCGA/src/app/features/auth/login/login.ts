import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LoginRequest } from '../../../core/models/auth.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  public imagePath: string = '/assets/images/logo1.png';

  credentials: LoginRequest = { username: '', password: '' };
  errorMessage = '';

  onLogin() {
    this.authService.login(this.credentials).subscribe({
      next: () => {
        this.router.navigate(['/dashboard/controlgeneral']);
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Usuario o contraseña incorrectos';
      }
    });
  }
}
