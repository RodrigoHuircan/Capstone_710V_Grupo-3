import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { AuthenticationService } from 'src/app/firebase/authentication';
import { RouterLink, Router } from '@angular/router';
import {
  IonContent, IonInput, IonNote, IonButton, IonSpinner, IonGrid, IonRow, IonCol,
  IonCard, IonCardHeader, IonImg, IonCardTitle, IonCardContent, IonList, IonItem,
  IonLabel, IonIcon, IonText, IonThumbnail
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  standalone: true,
  styleUrls: ['./login.component.scss'],
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    IonContent, IonInput, IonNote, IonButton, IonSpinner, IonGrid, IonRow, IonCol,
    IonCard, IonCardHeader, IonImg, IonCardTitle, IonCardContent, IonList, IonItem,
    IonLabel, IonIcon, IonText, RouterLink, IonThumbnail
  ],
})
export class LoginComponent implements OnInit {

  private fb = inject(FormBuilder);
  private authenticationService = inject(AuthenticationService);
  private router = inject(Router);

  datosForm!: FormGroup;
  cargando = false;
  showPass = false;

  // 🔴 mensaje para mostrar en el html
  loginError: string | null = null;

  ngOnInit() {

    this.datosForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });

    this.authenticationService.authState.subscribe(user => {
      if (user) {
        this.router.navigate(['tabs/home'], { replaceUrl: true });
      }
    });
  }

  get email() {
    return this.datosForm.get('email');
  }

  get password() {
    return this.datosForm.get('password');
  }

  async login() {

    this.datosForm.markAllAsTouched();
    this.loginError = null; // limpiar mensaje antes de intentar

    if (this.datosForm.invalid) return;

    const { email, password } = this.datosForm.value;
    this.cargando = true;

    try {
      await this.authenticationService.login(email, password);
      this.router.navigate(['tabs/home'], { replaceUrl: true });

    } catch (err: any) {

      if (err?.code === 'auth/invalid-email') {
        this.loginError = 'El email ingresado no es válido.';
      } else if (err?.code === 'auth/user-not-found') {
        this.loginError = 'El usuario no existe.';
      } else if (err?.code === 'auth/wrong-password') {
        this.loginError = 'La contraseña es incorrecta.';
      } else {
        this.loginError = 'Credenciales incorrectas.';
      }

    } finally {
      this.cargando = false;
    }
  }

  irARegistro() {
    this.router.navigate(['/registro'], { replaceUrl: true });
  }
}
