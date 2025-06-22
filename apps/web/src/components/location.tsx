// import React, { useEffect, useState } from "react";
// import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

// const containerStyle = {
//   width: "100%",
//   height: "300px",
// };

// export const LocationMap = ({ address }: { address: string }) => {
//   const [position, setPosition] = useState<google.maps.LatLngLiteral | null>(
//     null
//   );

//   const { isLoaded } = useJsApiLoader({
//     googleMapsApiKey: "YOUR_API_KEY", // <-- thay bằng API key thật
//     libraries: ["places"],
//   });

//   useEffect(() => {
//     if (!isLoaded || !address) return;

//     const geocoder = new google.maps.Geocoder();
//     geocoder.geocode({ address }, (results, status) => {
//       if (status === "OK" && results?.[0]?.geometry?.location) {
//         const loc = results[0].geometry.location;
//         setPosition({ lat: loc.lat(), lng: loc.lng() });
//       } else {
//         setPosition(null); // không tìm được
//       }
//     });
//   }, [isLoaded, address]);

//   if (!isLoaded || !position) return null;

//   return (
//     <div className="mt-4">
//       <GoogleMap mapContainerStyle={containerStyle} center={position} zoom={15}>
//         <Marker position={position} />
//       </GoogleMap>
//     </div>
//   );
// };
