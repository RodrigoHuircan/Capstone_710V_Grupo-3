import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import {
  IonContent, IonInput, IonLabel, IonItem, IonSelect, IonSelectOption,
  IonNote, IonButton, IonModal, IonGrid, IonRow, IonCol, IonImg, IonList,
  IonDatetime, IonDatetimeButton, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonIcon
} from '@ionic/angular/standalone';
import { FirestoreService } from 'src/app/firebase/firestore';
import { AuthenticationService } from 'src/app/firebase/authentication';
import { Router } from '@angular/router';
import { Models } from 'src/app/models/models';
import { getStorage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';

@Component({
  selector: 'app-crear-mascota',
  standalone: true,
  templateUrl: './crear-mascotas.component.html',
  styleUrls: ['./crear-mascotas.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
    IonContent, IonGrid, IonRow, IonCol,
    IonList, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
    IonNote, IonButton, IonImg, IonModal, IonDatetimeButton, IonDatetime, IonIcon
  ]
})
export class CrearMascotasComponent implements OnInit {
  private fb = inject(FormBuilder);
  private firestoreService = inject(FirestoreService);
  private authService = inject(AuthenticationService);
  private router = inject(Router);

  @ViewChild('inputFecha',{ static: false}) inputFecha!: ElementRef<HTMLInputElement>;

  mascotaForm!: FormGroup;
  cargando = false;

  // Principal
  imagenPreview: string | ArrayBuffer | null = null;
  imagenFile: File | null = null;

  // Galería
  galeriaFiles: File[] = [];
  galeriaPreviews: string[] = [];

  // Fecha
  fechaFormateada: string = '';
  fechaActual: string = new Date().toISOString();

  ngOnInit() {
    this.mascotaForm = this.fb.group({
      nombre: ['', Validators.required],
      numeroChip: ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
      edad: ['', [Validators.required, Validators.min(0)]],
      sexo: ['', Validators.required],
      fechaNacimiento: ['', Validators.required],
      especie: ['', Validators.required],
      color: ['', Validators.required],
      raza: ['', Validators.required],
      castrado: ['', Validators.required],
      fotoUrl: [''] // principal (opcional)
      // galeria se maneja fuera del FormGroup como string[]
    });
  }

  // Helpers validación visual
  isInvalid(ctrl: string): boolean {
    const c = this.mascotaForm.get(ctrl);
    return !!(c && c.touched && c.invalid);
  }

  // Imagen principal
  onImageSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;
    this.imagenFile = file;

    const reader = new FileReader();
    reader.onload = () => (this.imagenPreview = reader.result);
    reader.readAsDataURL(file);

    // limpiar el input para permitir volver a seleccionar la misma imagen
    event.target.value = '';
  }

  // Galería múltiple
  onImagesSelected(event: any) {
    const files: FileList = event.target.files;
    if (!files || !files.length) return;

    Array.from(files).forEach((f) => {
      this.galeriaFiles.push(f);
      const reader = new FileReader();
      reader.onload = () => this.galeriaPreviews.push(reader.result as string);
      reader.readAsDataURL(f);
    });

    event.target.value = '';
  }

  removeFromGaleria(i: number) {
    this.galeriaFiles.splice(i, 1);
    this.galeriaPreviews.splice(i, 1);
  }

  onIonDateChange(ev: CustomEvent) {
    const valor = (ev as any).detail?.value as string | null;
    if (!valor) return;
    this.mascotaForm.patchValue({ fechaNacimiento: valor });
    const fecha = new Date(valor);
    const opciones: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
    this.fechaFormateada = fecha.toLocaleDateString('es-CL', opciones);
  }

  async guardarMascota() {
    this.mascotaForm.markAllAsTouched();
    if (this.mascotaForm.invalid) return;

    this.cargando = true;
    const data = this.mascotaForm.value;

    let fotoUrl = '';
    let galeriaUrls: string[] = [];

    try {
      const user = await this.authService.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const id = this.firestoreService.createId();
      const storage = getStorage();

      // 1) Subir foto principal (si existe)
      if (this.imagenFile) {
        const refPrincipal = ref(storage, `mascotas/${user.uid}/${id}/principal-${Date.now()}-${this.imagenFile.name}`);
        await uploadBytes(refPrincipal, this.imagenFile);
        fotoUrl = await getDownloadURL(refPrincipal);
      }

      // 2) Subir galería (0..n)
      if (this.galeriaFiles.length) {
        const uploads = this.galeriaFiles.map(async (file, idx) => {
          const refGaleria = ref(storage, `mascotas/${user.uid}/${id}/galeria/${Date.now()}-${idx}-${file.name}`);
          await uploadBytes(refGaleria, file);
          return getDownloadURL(refGaleria);
        });
        galeriaUrls = await Promise.all(uploads);
      }

      // 3) Documento a Firestore
      const mascota = {
        id,
        uidUsuario: user.uid,
        nombre: data.nombre,
        numeroChip: data.numeroChip,
        edad: data.edad,
        sexo: data.sexo,
        especie: data.especie,
        color: data.color,
        raza: data.raza,
        castrado: data.castrado,
        fotoUrl: fotoUrl || '',
        galeria: galeriaUrls, // << NUEVO campo
        fechaNacimiento: data.fechaNacimiento,
        fechaRegistro: new Date().toISOString()
      };

      await this.firestoreService.createDocument(Models.Mascotas.PathMascotas, mascota, id);

      // 4) Reset y navegar
      this.mascotaForm.reset();
      this.imagenFile = null;
      this.imagenPreview = null;
      this.galeriaFiles = [];
      this.galeriaPreviews = [];
      this.router.navigate(['/tabs/home']);
    } catch (err) {
      console.error('Error al guardar mascota: ', err);
    } finally {
      this.cargando = false;
    }
  }
}
