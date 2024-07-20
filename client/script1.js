document.addEventListener("DOMContentLoaded", () => {
  const parkingListDiv = document.getElementById("parking-list");
  const mapDiv = document.getElementById("map");
  const searchBar = document.getElementById("search-bar");
  let map, directionsService, hoverMarker;
  let lastHoveredLat = null;
  let lastHoveredLng = null;
  const bhubaneswarCoordinates = { lat: 20.2961, lng: 85.8245 };
  const isAdmin = sessionStorage.getItem("isAdmin");
  console.log("isAdmin on index page:", isAdmin);
  const user = document.getElementById("username");
  const username = localStorage.getItem("username");
  user.innerHTML = `${username}`
  const balance = localStorage.getItem('wallet');
  const wallet_balance = document.getElementById("wallet-balance");
  wallet_balance.innerHTML = `Balance: ${balance}`;

  function initMap() {
    map = new google.maps.Map(mapDiv, {
      center: bhubaneswarCoordinates,
      zoom: 14,
    });

    new google.maps.Marker({
      position: bhubaneswarCoordinates,
      map: map,
      title: "Bhubaneswar",
      icon: {
        url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
        scaledSize: new google.maps.Size(30, 30),
      },
    });

    directionsService = new google.maps.DirectionsService();
  }

  function fetchParkingLocations() {
    fetch("http://localhost:3000/parking-locations")
      .then((response) => response.json())
      .then((data) => {
        populateParkingList(data);

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

  function populateParkingList(data) {
    parkingListDiv.innerHTML = ""; // Clear existing list
    data.forEach((location) => {
      if (location.lat && location.lng) {
        const marker = new google.maps.Marker({
          position: {
            lat: parseFloat(location.lat),
            lng: parseFloat(location.lng),
          },
          map: map,
          title: location.name,
          icon: {
            url: "https://maps.google.com/mapfiles/kml/shapes/parking_lot_maps.png",
            scaledSize: new google.maps.Size(20, 20),
          },
        });

        const div = document.createElement("div");
        div.classList.add("parking-item");
        div.innerHTML = `
          <strong>${location.unique_name}</strong>
          <p>${location.zone_name}</p>
          <p>Address: ${location.address}</p>
          <p>Total Slots: ${location.slots}</p>
          <svg class="directions-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#007bff" data-lat="${location.lat}" data-lng="${location.lng}">
          <path d="M320-360h80v-120h140v100l140-140-140-140v100H360q-17 0-28.5 11.5T320-520v160ZM480-80q-15 0-29.5-6T424-104L104-424q-12-12-18-26.5T80-480q0-15 6-29.5t18-26.5l320-320q12-12 26.5-18t29.5-6q15 0 29.5 6t26.5 18l320 320q12 12 18 26.5t6 29.5q0 15-6 29.5T856-424L536-104q-12 12-26.5 18T480-80ZM320-320l160 160 320-320-320-320-320 320 160 160Zm160-160Z"/>
          </svg>
          <svg class="parking-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#007bff" data-lat="${location.lat}" data-lng="${location.lng}" data-parking-id="${location.parking_id}">
          <path d="M240-120v-720h280q100 0 170 70t70 170q0 100-70 170t-170 70H400v240H240Zm160-400h128q33 0 56.5-23.5T608-600q0-33-23.5-56.5T528-680H400v160Z"/>
          </svg>
        `;

        div.dataset.lat = location.lat;
        div.dataset.lng = location.lng;
        div.dataset.parkingId = location.parking_id;
        div.dataset.slot = location.slots;

        parkingListDiv.appendChild(div);
      } else {
        console.error("Invalid data:", location);
      }
    });
  }

  initMap();
  fetchParkingLocations();

  let directionsRenderers = [];
  let labels = [];

  parkingListDiv.addEventListener("click", (e) => {
    if (e.target.classList.contains("directions-icon")) {
      const div = e.target.closest(".parking-item");
      const lat = parseFloat(div.dataset.lat);
      const lng = parseFloat(div.dataset.lng);

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
      const origin = new google.maps.LatLng(20.2961, 85.8245);

      directionsRenderers.forEach((renderer) => renderer.setMap(null));
      directionsRenderers = [];

      labels.forEach((label) => label.setMap(null));
      labels = [];

      directionsService.route(
        {
          origin: origin,
          destination: destination,
          travelMode: google.maps.TravelMode.DRIVING,
          provideRouteAlternatives: true,
        },
        (response, status) => {
          if (status === "OK") {
            response.routes.forEach((route, index) => {
              const colors = ["#FF0000", "#0000FF", "#008000"];

              const routeRenderer = new google.maps.DirectionsRenderer({
                map: map,
                directions: response,
                routeIndex: index,
                suppressMarkers: true,
                polylineOptions: {
                  strokeColor: colors[index % colors.length],
                },
              });

              const label = new google.maps.InfoWindow({
                content: `Route ${index + 1}: ${route.legs[0].distance.text}, ${
                  route.legs[0].duration.text
                }`,
                position:
                  route.legs[0].steps[
                    Math.floor(route.legs[0].steps.length / 2)
                  ].end_location,
              });
              label.open(map);
              labels.push(label);

              directionsRenderers.push(routeRenderer);
            });
          } else {
            console.error("Directions request failed due to", status);
          }
        }
      );
    }
  });

  parkingListDiv.addEventListener("click", (e) => {
    if (e.target.classList.contains("parking-icon")) {
      const div = e.target.closest(".parking-item");
      const lat = parseFloat(div.dataset.lat);
      const lng = parseFloat(div.dataset.lng);
      const parkingId = div.dataset.parkingId;
      const slot = div.dataset.slot;

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

      // Store parkingId and slots in session storage
      sessionStorage.setItem("parkingId", parkingId);
      sessionStorage.setItem("slots", slot);

      const url = "parking-details.html";
      window.open(url, "_blank");
    }
  });

  function filterParkingLocations(query, data) {
    return data.filter((location) => {
      return (
        location.unique_name.toLowerCase().includes(query) ||
        location.address.toLowerCase().includes(query) ||
        location.zone_name.toLowerCase().includes(query) ||
        (location.ward_name && location.ward_name.toLowerCase().includes(query))
      );
    });
  }

  searchBar.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    fetch("http://localhost:3000/parking-locations")
      .then((response) => response.json())
      .then((data) => {
        const filteredData = filterParkingLocations(query, data);
        populateParkingList(filteredData);
      })
      .catch((error) => {
        console.error("Error fetching parking locations:", error);
      });
  });

  searchBar.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const query = e.target.value.toLowerCase();
      fetch("http://localhost:3000/parking-locations")
        .then((response) => response.json())
        .then((data) => {
          const filteredData = filterParkingLocations(query, data);
          if (filteredData.length > 0) {
            const location = filteredData[0];
            const lat = parseFloat(location.lat);
            const lng = parseFloat(location.lng);
            const destination = new google.maps.LatLng(lat, lng);
            const origin = new google.maps.LatLng(20.2961, 85.8245);

            directionsRenderers.forEach((renderer) => renderer.setMap(null));
            directionsRenderers = [];

            labels.forEach((label) => label.setMap(null));
            labels = [];

            directionsService.route(
              {
                origin: origin,
                destination: destination,
                travelMode: google.maps.TravelMode.DRIVING,
                provideRouteAlternatives: true,
              },
              (response, status) => {
                if (status === "OK") {
                  response.routes.forEach((route, index) => {
                    const colors = ["#FF0000", "#0000FF", "#008000"];

                    const routeRenderer = new google.maps.DirectionsRenderer({
                      map: map,
                      directions: response,
                      routeIndex: index,
                      suppressMarkers: true,
                      polylineOptions: {
                        strokeColor: colors[index % colors.length],
                      },
                    });

                    const label = new google.maps.InfoWindow({
                      content: `Route ${index + 1}: ${
                        route.legs[0].distance.text
                      }, ${route.legs[0].duration.text}`,
                      position:
                        route.legs[0].steps[
                          Math.floor(route.legs[0].steps.length / 2)
                        ].end_location,
                    });
                    label.open(map);
                    labels.push(label);

                    directionsRenderers.push(routeRenderer);
                  });
                } else {
                  console.error("Directions request failed due to", status);
                }
              }
            );
          } else {
            console.error("Parking location not found");
          }
        })
        .catch((error) => {
          console.error("Error fetching parking locations:", error);
        });
    }
  });
});
