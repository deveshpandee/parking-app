document.addEventListener("DOMContentLoaded", () => {
  const parkingListDiv = document.getElementById("parking-list");
  const mapDiv = document.getElementById("map");
  let map, directionsService, directionsRenderer, hoverMarker;
  let lastHoveredLat = null;
  let lastHoveredLng = null;

  const popupDiv = document.createElement("div"); // Create popup div

  // Styling for the popup div
  popupDiv.style.position = "absolute";
  popupDiv.style.backgroundColor = "#ffffff";
  popupDiv.style.width = "50%";
  popupDiv.style.height = "50%";
  popupDiv.style.top = "25%";
  popupDiv.style.left = "25%";
  popupDiv.style.zIndex = "1000";
  popupDiv.style.padding = "20px";
  popupDiv.style.borderRadius = "5px";
  popupDiv.style.boxShadow = "0px 0px 10px 0px rgba(0,0,0,0.5)";
  popupDiv.style.display = "none"; // Initially hide the popup div

  // Content for the popup div
  popupDiv.innerHTML = "<p>Hello World</p>";

  // Append the popup div to the map div
  mapDiv.appendChild(popupDiv);

  function initMap() {
    map = new google.maps.Map(mapDiv, {
      center: { lat: 0, lng: 0 }, // Default center, will be updated by geolocation
      zoom: 14,
    });
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
      suppressMarkers: true, // Suppress default A and B markers
    });
    directionsRenderer.setMap(map);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = new google.maps.LatLng(
            position.coords.latitude,
            position.coords.longitude
          );
          map.setCenter(userLocation);

          // Create blue marker for user's live location
          const userMarker = new google.maps.Marker({
            position: userLocation,
            map: map,
            title: "Your Location",
            icon: {
              url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png", // URL of the blue marker icon
              scaledSize: new google.maps.Size(40, 40), // Size of the marker icon
            },
          });
        },
        (error) => {
          console.error("Error getting user location:", error);
        }
      );
    } else {
      console.error("Geolocation not supported by this browser.");
    }
  }

  function fetchParkingLocations() {
    fetch("http://localhost:3000/parking-locations")
      .then((response) => response.json())
      .then((data) => {
        console.log("Parking locations:", data); // Debug: Log fetched data
        data.forEach((location) => {
          if (location.lat && location.lng) {
            // Ensure lat and lng exist
            const marker = new google.maps.Marker({
              position: {
                lat: parseFloat(location.lat),
                lng: parseFloat(location.lng),
              },
              map: map,
              title: location.name,
              icon: {
                url: "https://maps.google.com/mapfiles/kml/shapes/parking_lot_maps.png", // Custom parking icon URL
                scaledSize: new google.maps.Size(30, 30), // Size of the marker icon
              },
            });

            const div = document.createElement("div");
            div.classList.add("parking-item");
            div.innerHTML = `
                            <strong>${location.name}</strong>
                            <p>${location.unique_name}</p>
                            <p>${location.zone_name}</p>
                            <p>Address: ${location.address}</p>
                            <p>Slots: ${location.slots}</p>
                            <svg class="directions-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#007bff" data-lat="${location.lat}" data-lng="${location.lng}">
                                <path d="M320-360h80v-120h140v100l140-140-140-140v100H360q-17 0-28.5 11.5T320-520v160ZM480-80q-15 0-29.5-6T424-104L104-424q-12-12-18-26.5T80-480q0-15 6-29.5t18-26.5l320-320q12-12 26.5-18t29.5-6q15 0 29.5 6t26.5 18l320 320q12 12 18 26.5t6 29.5q0 15-6 29.5T856-424L536-104q-12 12-26.5 18T480-80ZM320-320l160 160 320-320-320-320-320 320 160 160Zm160-160Z"/>
                            </svg>
                            <svg class="parking-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#007bff" data-lat="${location.lat}" data-lng="${location.lng}">
                                <path d="M240-120v-720h280q100 0 170 70t70 170q0 100-70 170t-170 70H400v240H240Zm160-400h128q33 0 56.5-23.5T608-600q0-33-23.5-56.5T528-680H400v160Z"/>
                            </svg>
                        `;

            div.dataset.lat = location.lat;
            div.dataset.lng = location.lng;
            parkingListDiv.appendChild(div);
          } else {
            console.error("Invalid data:", location); // Log invalid data
          }
        });

        parkingListDiv.addEventListener("click", (e) => {
          console.log("Clicked on:", e.target);
          if (e.target.classList.contains("parking-icon")) {
            console.log("Parking icon clicked");
            const parkingIcon = e.target;
            const lat = parseFloat(parkingIcon.dataset.lat);
            const lng = parseFloat(parkingIcon.dataset.lng);
            console.log("Coordinates:", lat, lng);

            // Open popup window on the map
            if (!isNaN(lat) && !isNaN(lng)) {
              popupDiv.style.display = "block"; // Show the popup div
              popupDiv.style.top = `${
                mapDiv.clientHeight / 2 - popupDiv.clientHeight / 2
              }px`; // Center vertically
              popupDiv.style.left = `${
                mapDiv.clientWidth / 2 - popupDiv.clientWidth / 2
              }px`; // Center horizontally
            }
          }
        });

        parkingListDiv.addEventListener("mouseover", (e) => {
          const parkingItem = e.target.closest(".parking-item");
          if (parkingItem) {
            const lat = parseFloat(parkingItem.dataset.lat);
            const lng = parseFloat(parkingItem.dataset.lng);

            if (!isNaN(lat) && !isNaN(lng)) {
              if (lat !== lastHoveredLat || lng !== lastHoveredLng) {
                lastHoveredLat = lat;
                lastHoveredLng = lng;
                const position = { lat: lat, lng: lng };

                if (!hoverMarker) {
                  hoverMarker = new google.maps.Marker({
                    position: position,
                    map: map,
                  });
                } else {
                  hoverMarker.setPosition(position);
                  hoverMarker.setMap(map);
                }
              }
            }
          }
        });

        parkingListDiv.addEventListener("mouseout", (e) => {
          if (!e.relatedTarget || !parkingListDiv.contains(e.relatedTarget)) {
            if (hoverMarker) {
              hoverMarker.setMap(null);
            }
          }
        });
      })
      .catch((error) => {
        console.error("Error fetching parking locations:", error);
      });
  }

  initMap();
  fetchParkingLocations();

  parkingListDiv.addEventListener("click", (e) => {
    if (e.target.classList.contains("directions-icon")) {
      const div = e.target.closest(".parking-item");
      const lat = parseFloat(div.dataset.lat);
      const lng = parseFloat(div.dataset.lng);

      // Check for invalid latitude and longitude values
      if (isNaN(lat) || isNaN(lng)) {
        console.error(
          "Invalid latitude or longitude:",
          lat,
          lng,
          "Data:",
          div.dataset
        );
        return;
      }

      const destination = new google.maps.LatLng(lat, lng);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const origin = new google.maps.LatLng(
              position.coords.latitude,
              position.coords.longitude
            );

            directionsService.route(
              {
                origin: origin,
                destination: destination,
                travelMode: google.maps.TravelMode.DRIVING,
              },
              (response, status) => {
                if (status === google.maps.DirectionsStatus.OK) {
                  directionsRenderer.setDirections(response);
                  const routeInfo = document.getElementById("route-info");
                  if (routeInfo) {
                    routeInfo.remove();
                  }
                  const infoDiv = document.createElement("div");
                  infoDiv.id = "route-info";
                  infoDiv.textContent = `Distance: ${response.routes[0].legs[0].distance.text}, Duration: ${response.routes[0].legs[0].duration.text}`;
                  mapDiv.appendChild(infoDiv);
                } else {
                  console.error("Directions request failed due to", status);
                }
              }
            );
          },
          (error) => {
            console.error("Error getting user location:", error);
          }
        );
      }
    }
  });
});
