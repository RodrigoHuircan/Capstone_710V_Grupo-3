import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { registerLocaleData } from '@angular/common';
import localeEsCl from '@angular/common/locales/es-CL';
registerLocaleData(localeEsCl, 'es-CL');
//  Firebase
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getMessaging, provideMessaging } from '@angular/fire/messaging';
import { getStorage, provideStorage } from '@angular/fire/storage';
import { LOCALE_ID } from '@angular/core';

//  Íconos de Ionicons
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  homeOutline,
  personCircleOutline,
  addCircleOutline,
  pawOutline,
  imagesOutline,
  createOutline,
  trashOutline,
  addOutline,
  imageOutline,
  qrCodeOutline, 
  cloudUploadOutline,
  closeCircleOutline,
  checkboxOutline,
  checkmarkDoneOutline,
  eyeOutline,
  heartOutline,
  eyedropOutline,
  medicalOutline,
  clipboardOutline,
  mapOutline
} from 'ionicons/icons';

//  Registrar íconos globales
addIcons({
  alertCircleOutline,
  homeOutline,
  personCircleOutline,
  addCircleOutline,
  pawOutline,
  imagesOutline,
  createOutline,
  trashOutline,
  addOutline,
  imageOutline,
  qrCodeOutline,
  cloudUploadOutline,
  closeCircleOutline,
  checkboxOutline,
  checkmarkDoneOutline,
  eyeOutline,
  heartOutline,
  eyedropOutline, medicalOutline,
  clipboardOutline,
  mapOutline
});

//  Configuración de Firebase (tu proyecto Ashbis)
const firebaseConfig = {
  projectId: 'ashbis-5c7d9',
  appId: '1:586939747639:web:5d8dcf672717cf1052deb2',
  storageBucket: 'ashbis-5c7d9.firebasestorage.app',
  apiKey: 'AIzaSyBo5QFVaHTLOCB-FrVCznHr0HTbWDqz4iY',
  authDomain: 'ashbis-5c7d9.firebaseapp.com',
  messagingSenderId: '586939747639',
  measurementId: 'G-JPXH6ZVCGZ'
};

//  Inicialización principal de la app
bootstrapApplication(AppComponent, {
  providers: [
    // Ionic & rutas
    { provide: LOCALE_ID, useValue: 'es-CL' },
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),

    // Firebase Services
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideMessaging(() => getMessaging()),
    provideStorage(() => getStorage()) //  Añadido correctamente
  ],
});
