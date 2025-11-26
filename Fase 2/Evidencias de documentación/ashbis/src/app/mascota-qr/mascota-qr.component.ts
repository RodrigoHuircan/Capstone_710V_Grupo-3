import { Component, inject, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router'; // Importar RouterLink
import { Subject, takeUntil } from 'rxjs';

// 1. Importar jspdf y html2canvas
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// 2. Importar el componente de QR
import { QRCodeComponent } from 'angularx-qrcode';

// 3. Importar componentes de Ionic
import {
  IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonSpinner,
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonButton, IonIcon
} from '@ionic/angular/standalone';

// 4. Importar servicios de Firebase
import { AuthenticationService } from '../firebase/authentication';
import { FirestoreService } from '../firebase/firestore';
import { Models } from '../models/models';
import { addIcons } from 'ionicons';
// 5. Añadir los iconos
import { personOutline, documentTextOutline, shareOutline } from 'ionicons/icons';

@Component({
  selector: 'app-mascota-qr',
  templateUrl: './mascota-qr.component.html',
  styleUrls: ['./mascota-qr.component.scss'],
  standalone: true,
  imports: [
    CommonModule, NgIf, RouterLink, // <-- RouterLink añadido
    QRCodeComponent, // <-- Componente de QR
    IonContent, IonSpinner,
    IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
    IonButton, IonIcon
  ]
})
export class MascotaQrComponent implements OnInit, OnDestroy {
  // Ya no usamos @ViewChild para el PDF, pero lo dejamos por si se usa en otro lado
  @ViewChild('qrContainer') qrContainer!: ElementRef;

  private destroy$ = new Subject<void>();

  // Inyección de servicios
  authenticationService: AuthenticationService = inject(AuthenticationService);
  firestoreService: FirestoreService = inject(FirestoreService);

  // Estado
  cargando = true;
  qrData = ''; // El string de la vCard

  // Variables de estado para los botones
  descargandoPDF = false;
  compartiendo = false;
  canShare = false; // Para mostrar/ocultar el botón de compartir

  constructor() {
    // Añadir iconos
    addIcons({ personOutline, documentTextOutline, shareOutline });

    // Comprobar si la API de Share está disponible
    if (navigator.share) {
      this.canShare = true;
    }
  }

  ngOnInit() {
    this.cargarDatosPerfil();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarDatosPerfil() {
    this.cargando = true;
    this.authenticationService.authState
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          this.firestoreService
            .getDocumentChanges<Models.Auth.UserProfile>(`${Models.Auth.PathUsers}/${user.uid}`)
            .pipe(takeUntil(this.destroy$))
            .subscribe(profile => {
              if (profile) {
                if (profile.nombre && profile.telefono) {
                  this.qrData = this.generarVCard(profile);
                } else {
                  this.qrData = '';
                }
              }
              this.cargando = false;
            });
        } else {
          this.cargando = false;
        }
      });
  }

  generarVCard(profile: Models.Auth.UserProfile): string {
    const vCard = `BEGIN:VCARD
VERSION:3.0
N:${profile.apellido || ''};${profile.nombre || ''}
FN:${profile.nombre || ''} ${profile.apellido || ''}
TEL;TYPE=CELL:${profile.telefono || ''}
EMAIL:${profile.email || ''}
ADR;TYPE=HOME:;;${profile.direccion || ''};${profile.region || ''}
NOTE:Contacto del dueño de la mascota.
END:VCARD`;
    return vCard;
  }

  /**
   * Captura el 'ion-card' usando su ID y lo convierte en un PDF
   */
  async descargarPDF() {
    this.descargandoPDF = true;
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      // 👇 CORRECCIÓN: Usamos getElementById
      const element = document.getElementById('qrCardElement');

      if (!element) {
        throw new Error('No se pudo encontrar el elemento #qrCardElement');
      }

      const canvas = await html2canvas(element, {
        scale: 3, // Mejor resolución
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 30;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save('qr-contacto-mascota.pdf');

    } catch (error) {
      console.error('Error al generar el PDF:', error);
    } finally {
      this.descargandoPDF = false;
    }
  }

  /**
   * Genera una imagen del QR y la comparte usando la API nativa
   */
  async compartirQR() {
    if (!this.canShare) {
      console.error('La API de Share no está soportada en este navegador.');
      return;
    }

    this.compartiendo = true;

    try {
      // 1. Encontrar el <canvas> que genera el componente <qrcode>
      const canvas = document.querySelector('.qr-code-wrapper canvas') as HTMLCanvasElement;

      if (!canvas) {
        throw new Error('No se pudo encontrar el canvas del QR');
      }

      // 2. Convertir el canvas a un Blob (archivo binario)
      const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

      if (!blob) {
        throw new Error('No se pudo convertir el canvas a Blob');
      }

      // 3. Crear un objeto File a partir del Blob
      const file = new File([blob], 'qr-contacto.png', { type: 'image/png' });
      const filesArray = [file];

      // 4. Preparar los datos para compartir
      const shareData = {
        title: 'QR Contacto de Mascota',
        text: '¡Encontré a esta mascota! Aquí está el contacto del dueño.',
        files: filesArray,
      };

      // 5. Verificar si el navegador PUEDE compartir estos archivos
      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback si no puede compartir archivos (ej. solo texto)
        await navigator.share({
          title: 'QR Contacto de Mascota',
          text: '¡Encontré a esta mascota! Aquí está el contacto del dueño.'
        });
      }

    } catch (error) {
      console.error('Error al compartir:', error);
      if ((error as Error).name !== 'AbortError') {
        // (Opcional) Mostrar Toast de error
      }
    } finally {
      this.compartiendo = false;
    }
  }
}
