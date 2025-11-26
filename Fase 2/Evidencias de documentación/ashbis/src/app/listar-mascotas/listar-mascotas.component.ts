import { Component, inject, signal } from '@angular/core';
import { NgIf, NgFor, DatePipe } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonRefresher, IonRefresherContent,
  IonList, IonItem, IonAvatar, IonSkeletonText,
  IonButton, IonLabel
} from '@ionic/angular/standalone';
import { RefresherCustomEvent } from '@ionic/angular';
import { Auth, authState } from '@angular/fire/auth';
import { of, take } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { FirestoreService, Mascota } from '../firebase/firestore';
import { Router } from '@angular/router';

@Component({
  selector: 'app-mis-mascotas',
  standalone: true,
  imports: [
    NgIf, NgFor,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonRefresher, IonRefresherContent,
    IonList, IonItem, IonAvatar, IonSkeletonText,
    IonButton, IonLabel
  ],
  templateUrl: './listar-mascotas.component.html',
  providers: [DatePipe],
})
export class ListarMascotasComponent {
  private auth = inject(Auth);
  private fs = inject(FirestoreService);
  private router = inject(Router);

  loading = signal(true);
  mascotas = signal<Mascota[]>([]);
  usuarioUid = signal<string | null>(null);

  constructor() {
    authState(this.auth)
      .pipe(
        switchMap(user => {
          const uid = user?.uid ?? null;
          this.usuarioUid.set(uid);
          return uid ? this.fs.getUserPets(uid) : of<Mascota[]>([]);
        })
      )
      .subscribe(pets => {
        this.mascotas.set(pets ?? []);
        this.loading.set(false);
      });
  }

  trackById = (_: number, m: Mascota) => m.id;

  doRefresh(ev: Event): void {
    const refresher = ev as RefresherCustomEvent;
    const uid = this.usuarioUid();

    if (!uid) {
      refresher.target.complete();
      return;
    }

    this.loading.set(true);
    this.fs.getUserPets(uid).pipe(take(1)).subscribe({
      next: pets => {
        this.mascotas.set(pets ?? []);
        this.loading.set(false);
        refresher.target.complete();
      },
      error: () => {
        this.loading.set(false);
        refresher.target.complete();
      }
    });
  }

  // Navega al perfil (pasamos el objeto por router state para cargar rápido)
  goPerfil(m: Mascota) {
    this.router.navigate(['/tabs/perfil-mascota', m.id], { state: { mascota: m } });
  }


}
