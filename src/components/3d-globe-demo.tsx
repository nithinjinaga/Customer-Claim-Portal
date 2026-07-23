"use client";
import { Globe3D, GlobeMarker } from "@/components/ui/3d-globe";

// Premier Energies mark shown on every pin. Add the file at public/favicon.png
// (square PNG, ~64px+). Until it exists the pins render as broken images.
const LOGO = "/favicon.png";

const cities: Omit<GlobeMarker, "src">[] = [
  { lat: 40.7128, lng: -74.006, label: "New York" },
  { lat: 51.5074, lng: -0.1278, label: "London" },
  { lat: 35.6762, lng: 139.6503, label: "Tokyo" },
  { lat: -33.8688, lng: 151.2093, label: "Sydney" },
  { lat: 48.8566, lng: 2.3522, label: "Paris" },
  { lat: 17.385, lng: 78.4867, label: "Hyderabad" },
  { lat: 16.5062, lng: 80.648, label: "Vijayawada" },
  { lat: 17.6868, lng: 83.2185, label: "Visakhapatnam" },
  { lat: 55.7558, lng: 37.6173, label: "Moscow" },
  { lat: -22.9068, lng: -43.1729, label: "Rio de Janeiro" },
  { lat: 31.2304, lng: 121.4737, label: "Shanghai" },
  { lat: 25.2048, lng: 55.2708, label: "Dubai" },
  { lat: -34.6037, lng: -58.3816, label: "Buenos Aires" },
  { lat: 1.3521, lng: 103.8198, label: "Singapore" },
  { lat: 37.5665, lng: 126.978, label: "Seoul" },
];

const markers: GlobeMarker[] = cities.map((c) => ({ ...c, src: LOGO }));

export default function Globe3DDemo() {
  return (
    <Globe3D
      markers={markers}
      config={{
        // Daytime earth, sunlit but with a slightly deeper blue.
        textureUrl:
          "https://unpkg.com/three-globe@2.31.0/example/img/earth-day.jpg",
        ambientIntensity: 0.75,
        pointLightIntensity: 2.3,
        bumpScale: 5,
        autoRotateSpeed: 0.3,
        // Start with India (Hyderabad, ~78.5°E) facing the camera on load.
        initialRotation: { x: 0, y: -((78.5 + 90) * Math.PI) / 180 },
      }}
      onMarkerClick={() => {}}
      onMarkerHover={() => {}}
    />
  );
}
