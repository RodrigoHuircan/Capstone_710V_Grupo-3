import { Component, inject, OnInit, ViewChild, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonCard, IonCardHeader, IonCardTitle, IonButton, IonIcon, IonCardContent, IonContent
} from '@ionic/angular/standalone';
// 👇 1. IMPORTADO de '@ionic/angular' (no standalone)
import { ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthenticationService } from 'src/app/firebase/authentication';
import { GoogleMapsModule, MapInfoWindow, MapMarker } from '@angular/google-maps';
import { addIcons } from 'ionicons';
import { hourglassOutline, locateOutline, star, bagOutline, pawOutline, chatbubblesOutline } from 'ionicons/icons';
import { register } from 'swiper/element/bundle';
import { FirestoreService } from '../firebase/firestore';
import { firstValueFrom } from 'rxjs';
register();

// Definición de la interfaz (ahora genérica para Marcador)
interface Marcador {
  position: google.maps.LatLngLiteral;
  title: string;
  options: google.maps.MarkerOptions;
  address: string;
  rating?: number;
  placeId?: string;
}

type VeterinariaFavoritaInput = {
  placeId: string;
  nombre: string;
  direccion: string;
  lat: number;
  lng: number;
  rating?: number;
  tipos?: string[];
};

// Se agregan todos los iconos necesarios
addIcons({ hourglassOutline, locateOutline, bagOutline, pawOutline, star });

@Component({
  selector: 'app-home',
  templateUrl: 'home.component.html',
  styleUrls: ['home.component.scss'],
  standalone: true,
  imports: [CommonModule, IonCard, IonButton, IonIcon, IonCardContent, GoogleMapsModule, IonContent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class HomePage implements OnInit {
  private auth = inject(AuthenticationService);
  private router = inject(Router);
  // 👇 2. INYECTADO aquí con inject()
  private toastController = inject(ToastController);
  private firestoreService = inject(FirestoreService);

  @ViewChild(MapInfoWindow, { static: false }) infoWindow!: MapInfoWindow;

  userEmail$ = this.auth.authState.pipe(map(u => u?.email ?? ''));

  // --- Variables Renombradas ---
  estaCargando: boolean = false;
  marcadoresEnMapa: Marcador[] = [];
  marcadorSeleccionado: Marcador | undefined;
  // --- Fin de Variables Renombradas ---

  currentSearchType: 'veterinary_care' | 'pet_store' | null = null;

  center: google.maps.LatLngLiteral = { lat: -33.4378, lng: -70.6504 };
  userPositionMarker: google.maps.LatLngLiteral | undefined;
  userMarkerOptions: google.maps.MarkerOptions = {
    draggable: false,
    icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
    title: 'Mi Ubicación Actual'
  };

  mapOptions: google.maps.MapOptions = {
    zoomControl: true,
    scrollwheel: true,
    disableDoubleClickZoom: false,
    maxZoom: 18,
    minZoom: 10,
    zoom: 15,
  };

  imagenesCarrusel = [
    {
      src: 'assets/img/carrusel1.jpg',
      titulo: 'Cuidado y amor para tus mascotas',
      descripcion: 'Encuentra veterinarias cercanas y servicios confiables 🏥🐶',
    },
    {
      src: 'assets/img/carrusel2.jpg',
      titulo: 'Productos y accesorios',
      descripcion: 'Descubre tiendas con lo mejor para tus compañeros peludos 🛍️',
    },
    {
      src: 'assets/img/carrusel3.jpg',
      titulo: 'Adopta y cambia una vida',
      descripcion: 'Conecta con refugios y dale un hogar a quien más lo necesita 🐕❤️',
    }
  ];

  // 👇 3. CONSTRUCTOR limpio (ya no inyecta ToastController aquí)
  constructor() {
    // No es necesario llamar a addIcons aquí si ya se hizo arriba
      addIcons({star,chatbubblesOutline});
  }

  ngOnInit() {
    // Ya no buscamos al iniciar, esperamos al usuario
  }

  async presentToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: color,
    });
    await toast.present();
  }

  /**
   * Muestra la ventana de información al hacer clic en un marcador.
   */
  openInfoWindow(marker: MapMarker, marcador: Marcador) {
    this.marcadorSeleccionado = marcador;
    this.infoWindow.open(marker);
  }

  /**
   * Obtiene la ubicación actual y, si tiene éxito, llama a la búsqueda.
   */
  getCurrentLocation(manualAction: boolean = false) {
    if (navigator.geolocation) {
      this.estaCargando = true;
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userCoords: google.maps.LatLngLiteral = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          this.center = userCoords;
          this.userPositionMarker = userCoords;
          console.log("Ubicación actual detectada:", userCoords);

          // Llama a la búsqueda DESPUÉS de obtener la ubicación
          if (this.currentSearchType) {
            this.searchNearbyPlaces(userCoords);
          } else {
            this.estaCargando = false; // Si no hay tipo de búsqueda, parar carga
          }
        },
        (error) => {
          this.estaCargando = false;
          console.error('Error al obtener la ubicación:', error.message);
          if (manualAction) {
            console.warn('Permiso de ubicación denegado o no disponible.');
          }
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      console.error('La geolocalización no está disponible en este navegador.');
    }
  }

  /**
   * Acción del botón: establece el tipo y busca la ubicación (o los lugares).
   */
  findPlacesAction(tipo: 'veterinary_care' | 'pet_store') {
    this.currentSearchType = tipo; // Establece el tipo de búsqueda
    this.marcadoresEnMapa = []; // Limpia marcadores anteriores
    this.marcadorSeleccionado = undefined; // Limpia info window

    if (this.userPositionMarker) {
      // Si ya tenemos la ubicación, buscar lugares
      this.searchNearbyPlaces(this.userPositionMarker);
    } else {
      // Si no, obtener ubicación primero (que luego llamará a searchNearbyPlaces)
      this.getCurrentLocation(true);
    }
  }

  /**
   * Busca lugares cercanos (tiendas o vets) usando Google Places API.
   * @param location Coordenadas del usuario.
   */
  searchNearbyPlaces(location: google.maps.LatLngLiteral) {
    if (typeof google === 'undefined' || !google.maps.places) {
      console.error("Google Maps Places API no está cargada.");
      this.estaCargando = false;
      return;
    }

    // Asegurarse de que el tipo de búsqueda no sea nulo
    if (!this.currentSearchType) {
      console.warn("Tipo de búsqueda no definido.");
      this.estaCargando = false;
      return;
    }

    this.estaCargando = true;
    this.marcadoresEnMapa = [];

    const service = new google.maps.places.PlacesService(document.createElement('div'));

    const request: google.maps.places.PlaceSearchRequest = {
      location: location,
      radius: 5000,
      type: this.currentSearchType // <-- Lógica de búsqueda dinámica ARREGLADA
    };

    service.nearbySearch(request, (results, status) => {
      this.estaCargando = false;

      if (status === google.maps.places.PlacesServiceStatus.OK && results) {

        // Asignar icono dinámicamente
        const iconUrl = this.currentSearchType === 'veterinary_care'
          ? 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' // Icono rojo para vets
          : 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'; // Icono verde para tiendas

        this.marcadoresEnMapa = results.map(place => ({
          position: place.geometry!.location!.toJSON(),
          title: place.name || 'Lugar Cercano',
          options: {
            animation: google.maps.Animation.DROP,
            icon: iconUrl // <-- Icono dinámico ARREGLADO
          },
          address: place.vicinity || place.formatted_address || 'Dirección no disponible',
          rating: place.rating,
          placeId: place.place_id ?? '' 
        }));
        console.log(`Se encontraron ${this.marcadoresEnMapa.length} lugares (${this.currentSearchType}).`);
      } else {
        console.error('Error al buscar lugares cercanos:', status);
      }
    });

  }
  irAlChatIA() {
  this.router.navigate(['/chat-ia']);
}

async guardarVeterinariaFavorita() {
  if (!this.marcadorSeleccionado) return;

  if (this.currentSearchType !== 'veterinary_care') {
    this.presentToast(
      'Solo puedes guardar veterinarias desde la búsqueda de veterinarias.',
      'warning'
    );
    return;
  }

  const user = await firstValueFrom(this.auth.authState);
  if (!user) {
    this.presentToast('Debes iniciar sesión para guardar favoritos.', 'warning');
    return;
  }

  const m = this.marcadorSeleccionado;

  const vet: VeterinariaFavoritaInput = {
    placeId: m.placeId || '',
    nombre: m.title,
    direccion: m.address,
    lat: m.position.lat,
    lng: m.position.lng,
    rating: m.rating,
    tipos: [] // si más adelante quieres guardar types de Places
  };

  await this.firestoreService.addVeterinariaFavorita(user.uid, vet);
  this.presentToast('Veterinaria añadida a favoritos 🐾', 'success');
}

}
