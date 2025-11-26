import { ModelsAuth } from "./auth.models";

export namespace Models{
    export import Auth = ModelsAuth;
}

export namespace Models {
  export namespace Mascotas {
    export const PathMascotas = 'mascotas';

    export interface Mascota {
      id: string;
      uidUsuario: string;
      nombre: string;
      edad: number;
      sexo: string;
      fechaNacimiento: string;
      especie: string;
      color: string;
      raza: string;
      castrado: string;
      fechaRegistro: string;
    }
  }
}